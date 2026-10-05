import { ghGraphql, ghRest, type GitHubConfig } from "./githubClient";

export type StarList = {
  id: string;
  name: string;
  description: string;
};

export type StarredRepo = {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  topics: string[];
  language: string | null;
  languageColor: string | null;
  updatedAt: string;
  pushedAt: string | null;
  createdAt: string | null;
  starredAt: string | null;
  stargazerCount: number;
  forkCount: number;
  openIssuesCount: number;
  watcherCount: number;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  isPrivate: boolean;
  license: string | null;
  homepageUrl: string | null;
  ownerLogin: string;
  ownerAvatarUrl: string;
  parentFullName: string | null;
  defaultBranch: string | null;
};

export type StarListMembership = {
  listId: string;
  repoIds: string[];
};

export type UserListRef = {
  id: string;
  name: string;
};

export type RepositoryMeta = {
  id: string;
  viewerHasStarred: boolean;
};

export type RepoMembershipIndexProgress = {
  current: number;
  total: number;
};

export type RepoMembershipIndexResult = {
  index: Map<string, Set<string>>;
  failedListIds: string[];
};

type ListApiField = "lists" | "userLists";

type GraphqlPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type StarListConnection = {
  nodes: StarList[];
  pageInfo: GraphqlPageInfo;
};

type FetchStarListsResponse = {
  viewer: Record<ListApiField, StarListConnection>;
};

type StarredRepoNode = {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  isPrivate: boolean;
  owner: { login: string; avatarUrl: string };
  primaryLanguage: { name: string; color: string | null } | null;
  licenseInfo: { spdxId: string | null; name: string } | null;
  parent: { nameWithOwner: string } | null;
  defaultBranchRef: { name: string } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  openIssues: { totalCount: number };
  watchers: { totalCount: number };
};

type FetchStarredReposResponse = {
  viewer: {
    starredRepositories: {
      edges: { starredAt: string; node: StarredRepoNode }[];
      pageInfo: GraphqlPageInfo;
    };
  };
};

type FetchListMembershipResponse = {
  node: {
    items: {
      nodes: { id: string }[];
      pageInfo: GraphqlPageInfo;
    };
  } | null;
};

type CreateUserListResponse = {
  createUserList: {
    list: UserListRef | null;
  } | null;
};

type UpdateUserListResponse = {
  updateUserList: {
    list: {
      id: string;
      name: string;
      description?: string | null;
    } | null;
  } | null;
};

type DeleteUserListResponse = {
  deleteUserList: { clientMutationId: string | null } | null;
};

type RepositoryMetaResponse = {
  repository: RepositoryMeta | null;
};

export async function detectStarListApi(config: GitHubConfig): Promise<ListApiField> {
  const candidates: ListApiField[] = ["lists", "userLists"];
  for (const field of candidates) {
    try {
      const query = `query { viewer { ${field}(first: 1) { totalCount } } }`;
      await ghGraphql(config, query);
      return field;
    } catch {
      continue;
    }
  }
  throw new Error("Star Lists API not available for this token/account");
}

export async function fetchStarLists(
  config: GitHubConfig,
  field: ListApiField
): Promise<StarList[]> {
  const lists: StarList[] = [];
  let after: string | null = null;

  while (true) {
    const query = `
      query ($first: Int!, $after: String) {
        viewer {
          ${field}(first: $first, after: $after) {
            nodes {
              id
              name
              description
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;

    const data: FetchStarListsResponse = await ghGraphql(
      config,
      query,
      { first: 100, after }
    );

    const connection: StarListConnection = data.viewer[field];
    lists.push(...(connection.nodes ?? []));
    if (!connection.pageInfo.hasNextPage) break;
    after = connection.pageInfo.endCursor;
  }

  return lists;
}

export async function fetchStarredRepos(config: GitHubConfig): Promise<StarredRepo[]> {
  const repos: StarredRepo[] = [];
  let after: string | null = null;

  while (true) {
    const query = `
      query ($first: Int!, $after: String) {
        viewer {
          starredRepositories(first: $first, after: $after, orderBy: { field: STARRED_AT, direction: DESC }) {
            edges {
              starredAt
              node {
                id
                name
                nameWithOwner
                description
                url
                homepageUrl
                createdAt
                updatedAt
                pushedAt
                stargazerCount
                forkCount
                isArchived
                isFork
                isTemplate
                isPrivate
                owner { login avatarUrl }
                primaryLanguage { name color }
                licenseInfo { spdxId name }
                parent { nameWithOwner }
                defaultBranchRef { name }
                repositoryTopics(first: 20) {
                  nodes { topic { name } }
                }
                openIssues: issues(states: OPEN) { totalCount }
                watchers { totalCount }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;

    const data: FetchStarredReposResponse = await ghGraphql(config, query, { first: 100, after });

    const connection: FetchStarredReposResponse["viewer"]["starredRepositories"] =
      data.viewer.starredRepositories;
    repos.push(
      ...connection.edges.map((edge) => {
        const node = edge.node;
        return {
          id: node.id,
          name: node.name,
          fullName: node.nameWithOwner,
          description: node.description,
          url: node.url,
          topics: (node.repositoryTopics.nodes ?? []).map(
            (topicNode: { topic: { name: string } }) => topicNode.topic.name
          ),
          language: node.primaryLanguage?.name ?? null,
          languageColor: node.primaryLanguage?.color ?? null,
          updatedAt: node.updatedAt,
          pushedAt: node.pushedAt,
          createdAt: node.createdAt,
          starredAt: edge.starredAt,
          stargazerCount: node.stargazerCount,
          forkCount: node.forkCount,
          openIssuesCount: node.openIssues?.totalCount ?? 0,
          watcherCount: node.watchers?.totalCount ?? 0,
          isArchived: node.isArchived,
          isFork: node.isFork,
          isTemplate: node.isTemplate,
          isPrivate: node.isPrivate,
          license: node.licenseInfo?.spdxId || node.licenseInfo?.name || null,
          homepageUrl: node.homepageUrl,
          ownerLogin: node.owner.login,
          ownerAvatarUrl: node.owner.avatarUrl,
          parentFullName: node.parent?.nameWithOwner ?? null,
          defaultBranch: node.defaultBranchRef?.name ?? null,
        };
      })
    );

    if (!connection.pageInfo.hasNextPage) break;
    after = connection.pageInfo.endCursor;
  }

  return repos;
}

export async function fetchReadmeExcerpt(
  config: GitHubConfig,
  owner: string,
  repo: string
): Promise<string> {
  const data = await ghRest<{ content?: string; encoding?: string }>(
    config,
    `/repos/${owner}/${repo}/readme`
  );
  const content = data.content ?? "";
  const encoding = data.encoding ?? "base64";
  if (encoding !== "base64") {
    return "";
  }
  const decoded = atob(content.replace(/\n/g, ""));
  return decoded.slice(0, 3000);
}

export async function fetchListMembership(
  config: GitHubConfig,
  listId: string
): Promise<StarListMembership> {
  const repoIds: string[] = [];
  let after: string | null = null;

  while (true) {
    const query = `
      query ($id: ID!, $first: Int!, $after: String) {
        node(id: $id) {
          ... on UserList {
            items(first: $first, after: $after) {
              nodes { ... on Repository { id } }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }
    `;
    const data: FetchListMembershipResponse = await ghGraphql(config, query, {
      id: listId,
      first: 100,
      after,
    });

    if (!data.node?.items) break;
    repoIds.push(...data.node.items.nodes.map((node: { id: string }) => node.id));
    if (!data.node.items.pageInfo.hasNextPage) break;
    after = data.node.items.pageInfo.endCursor;
  }

  return { listId, repoIds };
}

export async function createUserList(
  config: GitHubConfig,
  name: string,
  isPrivate: boolean,
  description = ""
): Promise<UserListRef> {
  const query = `
    mutation($input: CreateUserListInput!) {
      createUserList(input: $input) {
        list { id name }
      }
    }
  `;
  const input: { name: string; isPrivate: boolean; description?: string } = { name, isPrivate };
  if (description.trim()) {
    input.description = description.trim();
  }

  const data: CreateUserListResponse = await ghGraphql(config, query, { input });
  const created = data.createUserList?.list;
  if (!created) {
    throw new Error(`Failed to create list: ${name}`);
  }
  return created;
}

export async function getRepositoryMeta(
  config: GitHubConfig,
  owner: string,
  name: string
): Promise<RepositoryMeta | null> {
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        viewerHasStarred
      }
    }
  `;
  try {
    const data: RepositoryMetaResponse = await ghGraphql(config, query, { owner, name });
    return data.repository;
  } catch (error) {
    const message = (error as Error).message || "";
    if (message.includes("Could not resolve to a Repository")) {
      return null;
    }
    throw error;
  }
}

export async function addStar(config: GitHubConfig, starrableId: string): Promise<void> {
  const query = `
    mutation($input: AddStarInput!) {
      addStar(input: $input) {
        starrable { id }
      }
    }
  `;
  await ghGraphql(config, query, { input: { starrableId } });
}

export async function updateUserListsForItem(
  config: GitHubConfig,
  itemId: string,
  listIds: string[]
): Promise<void> {
  const query = `
    mutation($input: UpdateUserListsForItemInput!) {
      updateUserListsForItem(input: $input) { clientMutationId }
    }
  `;
  await ghGraphql(config, query, { input: { itemId, listIds } });
}

export async function updateUserListOnGitHub(
  config: GitHubConfig,
  listId: string,
  patch: { name?: string; description?: string; isPrivate?: boolean }
): Promise<{ id: string; name: string; description: string }> {
  const input: Record<string, unknown> = { listId };
  if (patch.name !== undefined) input.name = patch.name;
  if (patch.description !== undefined) input.description = patch.description;
  if (patch.isPrivate !== undefined) input.isPrivate = patch.isPrivate;

  const query = `
    mutation($input: UpdateUserListInput!) {
      updateUserList(input: $input) {
        list {
          id
          name
          description
        }
      }
    }
  `;
  const data = await ghGraphql<UpdateUserListResponse>(config, query, { input });
  const list = data.updateUserList?.list;
  if (!list) {
    throw new Error("Failed to update list");
  }
  return {
    id: list.id,
    name: list.name,
    description: list.description ?? "",
  };
}

export async function deleteUserListOnGitHub(config: GitHubConfig, listId: string): Promise<void> {
  const query = `
    mutation($input: DeleteUserListInput!) {
      deleteUserList(input: $input) {
        clientMutationId
      }
    }
  `;
  await ghGraphql<DeleteUserListResponse>(config, query, { input: { listId } });
}

export async function buildRepoMembershipIndex(
  config: GitHubConfig,
  listIds: string[],
  targetRepoIds: Set<string>,
  onProgress?: (progress: RepoMembershipIndexProgress) => void
): Promise<RepoMembershipIndexResult> {
  const index = new Map<string, Set<string>>();
  const failedListIds: string[] = [];
  const total = listIds.length;
  let current = 0;

  for (const listId of listIds) {
    try {
      let after: string | null = null;
      while (true) {
        const query = `
          query($id: ID!, $first: Int!, $after: String) {
            node(id: $id) {
              ... on UserList {
                items(first: $first, after: $after) {
                  nodes { ... on Repository { id } }
                  pageInfo { hasNextPage endCursor }
                }
              }
            }
          }
        `;
        const data: FetchListMembershipResponse = await ghGraphql(config, query, {
          id: listId,
          first: 100,
          after,
        });
        const items = data.node?.items;
        if (!items) break;

        for (const node of items.nodes) {
          if (!targetRepoIds.has(node.id)) continue;
          const existing = index.get(node.id) ?? new Set<string>();
          existing.add(listId);
          index.set(node.id, existing);
        }

        if (!items.pageInfo.hasNextPage) break;
        after = items.pageInfo.endCursor;
      }
    } catch {
      failedListIds.push(listId);
    }

    current += 1;
    onProgress?.({ current, total });
  }

  return { index, failedListIds };
}
