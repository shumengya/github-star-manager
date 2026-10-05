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

export async function onRequestPost({ request }) {
  const upstream = await fetch(`${GITHUB_API}/graphql`, {
    method: "POST",
    headers: githubHeaders(request),
    body: await request.arrayBuffer(),
  });
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}
