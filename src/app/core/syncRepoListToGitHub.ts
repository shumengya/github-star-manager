import { db } from "../data/db";
import type { GitHubConfig } from "../services/githubClient";
import { addStar, getRepositoryMeta, updateUserListsForItem } from "../services/githubStarLists";

function parseRepoFullName(fullName: string): { owner: string; name: string } | null {
  const parts = fullName.split("/");
  if (parts.length !== 2) return null;
  const owner = parts[0].trim();
  const name = parts[1].trim();
  if (!owner || !name) return null;
  return { owner, name };
}

/**
 * Pushes the selected Star List IDs for a repo to GitHub (replaces list membership for that starred item).
 * Stars the repo first if the viewer has not starred it yet.
 */
export async function syncRepoListAssignmentToGitHub(
  config: GitHubConfig,
  repoId: string,
  listIds: string[]
): Promise<void> {
  const repo = await db.repos.get(repoId);
  if (!repo) {
    throw new Error("Repository not found in local database.");
  }
  const parsed = parseRepoFullName(repo.fullName);
  if (!parsed) {
    throw new Error(`Invalid repository name: ${repo.fullName}`);
  }
  const meta = await getRepositoryMeta(config, parsed.owner, parsed.name);
  if (!meta) {
    throw new Error("Could not load repository from GitHub.");
  }
  const uniqueListIds = Array.from(new Set(listIds.map((id) => id.trim()).filter(Boolean)));
  if (!meta.viewerHasStarred) {
    await addStar(config, meta.id);
  }
  await updateUserListsForItem(config, meta.id, uniqueListIds);
}
