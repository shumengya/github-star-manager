import { db } from "../data/db";

/** Removes a list from `db.lists` and strips its id from every `repoLists` row. */
export async function purgeListFromLocalStores(listId: string): Promise<void> {
  await db.transaction("rw", db.lists, db.repoLists, async () => {
    await db.lists.delete(listId);
    const rows = await db.repoLists.toArray();
    for (const row of rows) {
      if (!row.listIds.includes(listId)) continue;
      const next = row.listIds.filter((id) => id !== listId);
      if (next.length === 0) {
        await db.repoLists.delete(row.repoId);
      } else {
        await db.repoLists.put({ repoId: row.repoId, listIds: next });
      }
    }
  });
}
