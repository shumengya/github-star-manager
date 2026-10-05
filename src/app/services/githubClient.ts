import axios, { isAxiosError } from "axios";

export type GitHubConfig = {
  token: string;
};

export type GitHubRequestOptions = {
  signal?: AbortSignal;
  retries?: number;
};

const client = axios.create({
  baseURL: "/api/github",
  headers: {
    Accept: "application/vnd.github+json",
  },
});

function authHeaders(token: string) {
  return { Authorization: `bearer ${token}` };
}

function toError(error: unknown): Error {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return new Error(data);
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: string }).message;
      if (message) return new Error(message);
    }
    return new Error(error.message || `Request failed: ${error.response?.status ?? ""}`);
  }
  if (error instanceof Error) return error;
  return new Error("Request failed");
}

async function withRetry<T>(run: () => Promise<T>, retries: number): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries) throw toError(error);
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
}

export async function ghGraphql<T>(
  config: GitHubConfig,
  query: string,
  variables: Record<string, unknown> = {},
  options: GitHubRequestOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  const payload = await withRetry(async () => {
    const response = await client.post<{ data?: T; errors?: { message: string }[] }>(
      "/graphql",
      { query, variables },
      {
        headers: {
          ...authHeaders(config.token),
          "Content-Type": "application/json",
        },
        signal: options.signal,
      }
    );
    return response.data;
  }, retries);

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message || "GitHub GraphQL error");
  }
  if (!payload.data) {
    throw new Error("GitHub GraphQL response missing data");
  }
  return payload.data;
}

export async function ghRest<T>(
  config: GitHubConfig,
  path: string,
  options: GitHubRequestOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2;
  return withRetry(async () => {
    const response = await client.get<T>(`/rest${path}`, {
      headers: authHeaders(config.token),
      signal: options.signal,
    });
    return response.data;
  }, retries);
}
