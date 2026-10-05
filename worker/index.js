// Cloudflare Workers 入口：
// 将 /api/github/* 代理到 api.github.com，其余请求交给静态资源（dist）。
// 逻辑与 functions/api/github/（Cloudflare Pages Functions 版本）保持等价，
// 供 "Deploy to Cloudflare" 一键部署按钮使用。

const GITHUB_API = "https://api.github.com";

function githubHeaders(request) {
  const headers = new Headers();
  const authorization = request.headers.get("Authorization");
  const accept = request.headers.get("Accept");
  const contentType = request.headers.get("Content-Type");
  if (authorization) headers.set("Authorization", authorization);
  headers.set("Accept", accept || "application/vnd.github+json");
  headers.set("User-Agent", "github-star-manager");
  if (contentType) headers.set("Content-Type", contentType);
  return headers;
}

function jsonResponse(upstream, body) {
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}

async function proxyGraphQL(request) {
  const upstream = await fetch(`${GITHUB_API}/graphql`, {
    method: "POST",
    headers: githubHeaders(request),
    body: await request.arrayBuffer(),
  });
  return jsonResponse(upstream, await upstream.arrayBuffer());
}

async function proxyRest(request) {
  const incoming = new URL(request.url);
  const suffix = incoming.pathname.replace(/^\/api\/github\/rest\/?/, "");
  const upstream = await fetch(`${GITHUB_API}/${suffix}${incoming.search}`, {
    method: request.method,
    headers: githubHeaders(request),
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
  });
  return jsonResponse(upstream, await upstream.arrayBuffer());
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/github/graphql") return proxyGraphQL(request);
    if (pathname.startsWith("/api/github/rest/")) return proxyRest(request);
    return env.ASSETS.fetch(request);
  },
};
