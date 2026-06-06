/**
 * Service to sync local files to GitHub using the GitHub API.
 * This client-side service is used when the server-side proxy is not available.
 */

export interface SyncResult {
  file: string;
  status: 'success' | 'error';
  message: string;
}

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const REPO_OWNER = "yimamem47-collab";
const REPO_NAME = "west-gojjame-police";

/**
 * Pushes a single file to GitHub via the GitHub REST API.
 */
export async function pushFileToGitHub(filePath: string, content: string): Promise<SyncResult> {
  if (!GITHUB_TOKEN) {
    return { 
      file: filePath, 
      status: 'error', 
      message: 'GitHub token (VITE_GITHUB_TOKEN) is not configured in environment.' 
    };
  }

  try {
    // 1. Get current file data to find SHA if it exists (required for updates)
    const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha: string | undefined = undefined;
    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    // 2. Prepare base64 content
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    // 3. Put the new content
    const putResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Sync ${filePath} from Digital Assistant Dashboard`,
        content: base64Content,
        sha: sha
      })
    });

    if (putResponse.ok) {
      return { 
        file: filePath, 
        status: 'success', 
        message: 'Successfully updated in repository.' 
      };
    } else {
      const err = await putResponse.json();
      return { 
        file: filePath, 
        status: 'error', 
        message: err.message || 'GitHub API rejected the push.' 
      };
    }
  } catch (error: any) {
    console.error(`Sync Error [${filePath}]:`, error);
    return { 
      file: filePath, 
      status: 'error', 
      message: error.message || 'CORS or Network error during GitHub sync.' 
    };
  }
}
