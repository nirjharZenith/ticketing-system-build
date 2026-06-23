const getGitHubConfig = () => {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_ISSUE_OWNER || process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_ISSUE_REPO || process.env.GITHUB_REPO;
  return { token, owner, repo };
};

export const isGitHubConfigured = (): boolean => {
  const { token, owner, repo } = getGitHubConfig();
  return Boolean(token && owner && repo);
};

const fetchWithResilience = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // Retry on 5xx server errors
      if (response.status >= 500 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
};

export interface GitHubIssueResult {
  number: number;
  url: string;
  owner: string;
  repo: string;
}

export const createGithubIssue = async (
  title: string,
  description: string,
  ticketId: string
): Promise<GitHubIssueResult | null> => {
  if (!isGitHubConfigured()) {
    console.warn('[github-issue] GitHub integration is not configured.');
    return null;
  }

  const { token, owner, repo } = getGitHubConfig();
  
  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
        body: JSON.stringify({
          title: title,
          body: `**Ticket ID:** ${ticketId}\n\n**Description:**\n${description || 'No description provided.'}\n\n*Created via Zenith Ticketing System*`,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[github-issue] Failed to create issue: ${response.status} ${errorBody}`);
      return null;
    }

    const data: any = await response.json();
    return {
      number: data.number,
      url: data.html_url,
      owner: owner!,
      repo: repo!,
    };
  } catch (error) {
    console.error('[github-issue] Error creating GitHub issue:', error);
    return null;
  }
};

export const fetchGithubIssueState = async (
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string | null> => {
  if (!isGitHubConfigured()) {
    return null;
  }

  const { token } = getGitHubConfig();

  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[github-issue] Failed to fetch issue: ${response.status} ${errorBody}`);
      return null;
    }

    const data: any = await response.json();
    return data.state; // 'open' or 'closed'
  } catch (error) {
    console.error('[github-issue] Error fetching GitHub issue state:', error);
    return null;
  }
};

export const closeGithubIssue = async (
  owner: string,
  repo: string,
  issueNumber: number
): Promise<boolean> => {
  if (!isGitHubConfigured()) {
    return false;
  }

  const { token } = getGitHubConfig();

  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
        body: JSON.stringify({
          state: 'closed',
          state_reason: 'completed',
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[github-issue] Failed to close issue: ${response.status} ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[github-issue] Error closing GitHub issue:', error);
    return false;
  }
};

export const createGithubIssueComment = async (
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<boolean> => {
  if (!isGitHubConfigured()) {
    return false;
  }

  const { token } = getGitHubConfig();

  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[github-issue] Failed to create comment: ${response.status} ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[github-issue] Error creating GitHub issue comment:', error);
    return false;
  }
};

export const updateGithubIssue = async (
  owner: string,
  repo: string,
  issueNumber: number,
  title?: string,
  description?: string,
  ticketId?: string
): Promise<boolean> => {
  if (!isGitHubConfigured()) {
    return false;
  }

  const { token } = getGitHubConfig();
  const updatePayload: any = {};
  if (title !== undefined) updatePayload.title = title;
  if (description !== undefined && ticketId !== undefined) {
    updatePayload.body = `**Ticket ID:** ${ticketId}\n\n**Description:**\n${description || 'No description provided.'}\n\n*Created via Zenith Ticketing System*`;
  }

  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[github-issue] Failed to update issue: ${response.status} ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[github-issue] Error updating GitHub issue:', error);
    return false;
  }
};

export const appendAttachmentToGithubIssue = async (
  owner: string,
  repo: string,
  issueNumber: number,
  filename: string,
  fileUrl: string
): Promise<boolean> => {
  if (!isGitHubConfigured()) {
    return false;
  }

  const { token } = getGitHubConfig();

  try {
    // 1. Get current issue body
    const getResponse = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
      }
    );

    if (!getResponse.ok) {
      console.error(`[github-issue] Failed to fetch issue for attachment: ${getResponse.status}`);
      return false;
    }

    const issueData: any = await getResponse.json();
    const currentBody = issueData.body || '';

    // 2. Append markdown image link directly
    const attachmentMarkdown = `\n\n### Attachment\n![${filename}](${fileUrl})`;
    const newBody = `${currentBody}${attachmentMarkdown}`;

    // 3. Patch the issue body
    const patchResponse = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
        body: JSON.stringify({ body: newBody }),
      }
    );

    if (!patchResponse.ok) {
      const errorBody = await patchResponse.text();
      console.error(`[github-issue] Failed to update issue body with attachment: ${patchResponse.status} ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[github-issue] Error appending attachment to GitHub issue:', error);
    return false;
  }
};

export const fetchGithubIssueComments = async (
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any[]> => {
  if (!isGitHubConfigured()) {
    return [];
  }

  const { token } = getGitHubConfig();

  try {
    const response = await fetchWithResilience(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
          'User-Agent': 'Zenith-Ticketing-Backend',
        },
      }
    );

    if (!response.ok) {
      console.error(`[github-issue] Failed to fetch comments: ${response.status}`);
      return [];
    }

    return (await response.json()) as any;
  } catch (error) {
    console.error('[github-issue] Error fetching GitHub issue comments:', error);
    return [];
  }
};
