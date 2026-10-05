import { db } from "../data/db";
import type { GitHubConfig } from "../services/githubClient";
import { removeStar } from "../services/githubStarLists";

export async function unstarRepoFromGitHub(config: GitHubConfig, repoId: string): Promise<void> {
  await removeStar(config, repoId);
  await db.transaction("rw", db.repos, db.repoLists, async () => {
    await db.repos.delete(repoId);
    await db.repoLists.delete(repoId);
  });
}
