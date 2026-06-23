export interface GitHubUploadResult {
  url: string;
  path: string;
}

const isGitHubConfigured = (): boolean =>
  Boolean(
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO
  );

export const githubStorageEnabled = (): boolean => isGitHubConfigured();

export const uploadToGitHub = async (
  buffer: Buffer,
  filename: string,
  orgId: string,
  ticketId: string
): Promise<GitHubUploadResult> => {
  if (!isGitHubConfigured()) {
    throw new Error('GitHub storage is not configured');
  }

  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const basePath = process.env.GITHUB_UPLOAD_PATH || 'tickets';
  const filePath = `${basePath}/${orgId}/${ticketId}/${filename}`;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'Zenith-Ticketing-Backend',
      },
      body: JSON.stringify({
        message: `Upload ticket attachment: ${filename}`,
        content: buffer.toString('base64'),
        branch,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub upload failed: ${response.status} ${errorBody}`);
  }

  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  return { url, path: filePath };
};
