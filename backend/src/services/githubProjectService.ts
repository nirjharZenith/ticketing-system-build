/**
 * GitHub Projects V2 GraphQL service
 *
 * Responsibilities:
 *  1. Fetch all project item statuses and sync them to the DB (polling)
 *  2. Add a newly-created GitHub issue to the project board automatically
 *
 * Requirements:
 *  - GITHUB_TOKEN must be a Classic PAT with `repo` + `project` scopes
 *  - GITHUB_PROJECT_NUMBER must be set (the number in the project URL)
 *  - GITHUB_PROJECT_OWNER_TYPE: 'org' (default) or 'user'
 */
import { query as dbQuery } from '../db';
import * as ticketService from './ticketService';
import { emitToOrg } from './socketService';

// ---- Config helpers ----
const getGitHubConfig = () => {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_ISSUE_OWNER || process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_ISSUE_REPO || process.env.GITHUB_REPO;
  const projectNumber = process.env.GITHUB_PROJECT_NUMBER
    ? parseInt(process.env.GITHUB_PROJECT_NUMBER, 10)
    : null;
  const ownerType = process.env.GITHUB_PROJECT_OWNER_TYPE || 'org';
  return { token, owner, repo, projectNumber, ownerType };
};

export const isProjectConfigured = (): boolean => {
  const { token, owner, projectNumber } = getGitHubConfig();
  return Boolean(token && owner && projectNumber);
};

/** Execute a GitHub GraphQL request */
const graphql = async (token: string, query: string, variables: Record<string, any> = {}): Promise<any> => {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Zenith-Ticketing-Backend',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GraphQL HTTP ${response.status}: ${text}`);
  }

  const data: any = await response.json();

  if (data.errors && data.errors.length > 0) {
    const firstError = data.errors[0];
    if (firstError.type === 'FORBIDDEN') {
      throw new Error(
        `GitHub Projects access FORBIDDEN. Your GITHUB_TOKEN must be a Classic PAT ` +
        `with "project" scope. Generate one at: https://github.com/settings/tokens\n` +
        `(Do NOT use fine-grained PATs for organization Projects V2)`
      );
    }
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data?.data;
};

// ---- Project node ID cache ----
let cachedProjectNodeId: string | null = null;
let cachedProjectStatusFieldId: string | null = null;

/**
 * Fetch the project's global node ID and Status field ID, cached in memory.
 */
export const getProjectIds = async (): Promise<{ projectId: string; statusFieldId: string } | null> => {
  if (cachedProjectNodeId && cachedProjectStatusFieldId) {
    return { projectId: cachedProjectNodeId, statusFieldId: cachedProjectStatusFieldId };
  }

  const { token, owner, projectNumber, ownerType } = getGitHubConfig();
  if (!token || !owner || !projectNumber) return null;

  const ownerField = ownerType === 'user' ? 'user' : 'organization';

  const query = `
    query GetProjectIds($owner: String!, $number: Int!) {
      ${ownerField}(login: $owner) {
        projectV2(number: $number) {
          id
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphql(token, query, { owner, number: projectNumber });
    const projectData = data?.[ownerField]?.projectV2;
    if (!projectData) return null;

    const statusField = projectData.fields?.nodes?.find((f: any) => f.name === 'Status');
    if (!statusField) {
      console.warn('[github-project] No Status field found in project fields');
      return null;
    }

    cachedProjectNodeId = projectData.id;
    cachedProjectStatusFieldId = statusField.id;

    return { projectId: cachedProjectNodeId!, statusFieldId: cachedProjectStatusFieldId! };
  } catch (err: any) {
    console.error('[github-project] Failed to fetch project IDs:', err.message);
    return null;
  }
};

/**
 * Add a GitHub issue to the project board.
 * Returns the project item ID (needed to set Status field value).
 */
export const addIssueToProject = async (issueNodeId: string): Promise<string | null> => {
  if (!isProjectConfigured()) return null;

  const ids = await getProjectIds();
  if (!ids) return null;

  const { token } = getGitHubConfig();

  const mutation = `
    mutation AddItemToProject($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }
  `;

  try {
    const data = await graphql(token!, mutation, {
      projectId: ids.projectId,
      contentId: issueNodeId,
    });
    const itemId = data?.addProjectV2ItemById?.item?.id;
    console.log(`[github-project] Added issue ${issueNodeId} to project → item ${itemId}`);
    return itemId || null;
  } catch (err: any) {
    console.error('[github-project] Failed to add issue to project:', err.message);
    return null;
  }
};

// ---- Status sync (polling) ----

/**
 * Fetches all project items with their Status field values via GraphQL (paginated).
 */
export const fetchProjectItemStatuses = async (): Promise<
  Array<{ contentNodeId: string; issueNumber: number | null; status: string | null }>
> => {
  const { token, owner, projectNumber, ownerType } = getGitHubConfig();
  if (!token || !owner || !projectNumber) return [];

  const ownerField = ownerType === 'user' ? 'user' : 'organization';

  const query = `
    query GetProjectItemStatuses($owner: String!, $projectNumber: Int!, $after: String) {
      ${ownerField}(login: $owner) {
        projectV2(number: $projectNumber) {
          items(first: 100, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              content {
                ... on Issue {
                  number
                  id
                }
              }
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const allItems: Array<{ contentNodeId: string; issueNumber: number | null; status: string | null }> = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const variables: any = { owner, projectNumber };
      if (after) variables.after = after;

      const data = await graphql(token, query, variables);
      const projectData = data?.[ownerField]?.projectV2;

      if (!projectData) {
        console.warn('[github-project] projectV2 not found — check PAT scope and project config');
        break;
      }

      const items = projectData.items?.nodes || [];
      for (const item of items) {
        if (!item) continue;
        const issueNumber = item.content?.number ?? null;
        const contentNodeId = item.content?.id ?? null;
        const status = (item.fieldValueByName as any)?.name ?? null;
        if (contentNodeId) {
          allItems.push({ contentNodeId, issueNumber, status });
        }
      }

      hasNextPage = projectData.items?.pageInfo?.hasNextPage ?? false;
      after = projectData.items?.pageInfo?.endCursor ?? null;
    } catch (err: any) {
      console.error('[github-project] Error fetching project items:', err.message);
      break;
    }
  }

  return allItems;
};

/**
 * Fetches project items and syncs statuses to the database.
 * Returns count of updated tickets.
 */
export const syncProjectStatusesToDB = async (): Promise<number> => {
  const items = await fetchProjectItemStatuses();
  if (!items.length) return 0;

  let updatedCount = 0;

  for (const item of items) {
    if (!item.status) continue;

    // Match ticket by github_issue_node_id (exact match)
    let result = await dbQuery(
      'UPDATE tickets SET status = $1, updated_at = NOW() WHERE github_issue_node_id = $2 AND status != $1 RETURNING id, organisation_id, status',
      [item.status, item.contentNodeId]
    );

    // Fallback: match by issue number if no node_id match
    if (result.rows.length === 0 && item.issueNumber) {
      result = await dbQuery(
        `UPDATE tickets SET status = $1, updated_at = NOW(), github_issue_node_id = $2
         WHERE github_issue_number = $3 AND status != $1 RETURNING id, organisation_id, status`,
        [item.status, item.contentNodeId, item.issueNumber]
      );
    }

    if (result.rows.length > 0) {
      updatedCount++;
      for (const row of result.rows) {
        console.log(`[github-project] Synced ticket ${row.id} → ${item.status}`);
        try {
          await ticketService.logTicketActivity(
            row.id,
            null,
            'status_changed',
            null,
            `GitHub Project synced status to "${item.status}"`
          );
          emitToOrg(row.organisation_id, 'ticket:updated', row);
        } catch (e) {
          console.error('[github-project] Error logging activity:', e);
        }
      }
    }
  }

  return updatedCount;
};

// ---- Auto-polling ----
let pollingTimer: ReturnType<typeof setInterval> | null = null;

export const startProjectPolling = (intervalMs = 30_000) => {
  if (pollingTimer) return; // already running
  if (!isProjectConfigured()) {
    console.log('[github-project] Polling skipped — GITHUB_PROJECT_NUMBER not set.');
    return;
  }

  console.log(`[github-project] Starting GitHub Project status polling every ${intervalMs / 1000}s`);

  // Immediate first sync
  syncProjectStatusesToDB()
    .then((n) => {
      if (n > 0) console.log(`[github-project] Initial sync: updated ${n} tickets`);
    })
    .catch((err) => console.error('[github-project] Initial sync error:', err.message));

  pollingTimer = setInterval(async () => {
    try {
      const n = await syncProjectStatusesToDB();
      if (n > 0) console.log(`[github-project] Poll sync: updated ${n} tickets`);
    } catch (err: any) {
      console.error('[github-project] Poll sync error:', err.message);
    }
  }, intervalMs);
};

export const stopProjectPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};
