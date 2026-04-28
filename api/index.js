export const config = { runtime: "edge" };

const LANDING_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sample Vercel Gateway</title>
    <meta
      name="description"
      content="Minimal Vercel edge gateway landing page with feature highlights."
    />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100 antialiased">
    <main class="mx-auto max-w-4xl px-6 py-12">
      <header class="mb-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <p class="mb-3 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
          Running on Vercel Edge Runtime
        </p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sample Vercel Gateway
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
          This page is intentionally minimal. It is served only at the base URL
          for quick visual verification. Gateway and XHTTP proxy behavior
          remains active on your functional paths (for example, <code>/work</code>).
        </p>
      </header>

      <section class="grid gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 class="text-base font-semibold text-slate-100">Edge Runtime</h2>
          <p class="mt-2 text-sm text-slate-300">
            Request handling executes close to users for low-latency routing and
            predictable behavior.
          </p>
        </article>
        <article class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 class="text-base font-semibold text-slate-100">Global Network</h2>
          <p class="mt-2 text-sm text-slate-300">
            Vercel deploys across a global edge network, helping traffic reach
            your endpoint from multiple regions.
          </p>
        </article>
        <article class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 class="text-base font-semibold text-slate-100">Rewrite Support</h2>
          <p class="mt-2 text-sm text-slate-300">
            <code>vercel.json</code> rewrites can map user-facing paths to your runtime
            handlers without changing endpoint behavior.
          </p>
        </article>
        <article class="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 class="text-base font-semibold text-slate-100">TLS Ready</h2>
          <p class="mt-2 text-sm text-slate-300">
            Requests are served over HTTPS by default, compatible with secure
            transport setups and modern clients.
          </p>
        </article>
      </section>
    </main>
  </body>
</html>`;

function sanitizeEndpoint(rawEndpoint) {
  const candidate = (rawEndpoint || "").trim();
  if (!candidate) return "";

  // Accept "domain:port" style values and default to HTTPS.
  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const normalizedUrl = new URL(withProtocol);
    // Normalize trailing slashes to avoid accidental double slashes on join.
    normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+$/, "");
    normalizedUrl.search = "";
    normalizedUrl.hash = "";
    return normalizedUrl.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

const UPSTREAM_ROOT = sanitizeEndpoint(process.env.UPSTREAM_HOST);

const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function edgeRelay(req) {
  const sourceUrl = new URL(req.url);

  if (sourceUrl.pathname === "/" && req.method === "GET") {
    return new Response(LANDING_PAGE_HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }

  if (!UPSTREAM_ROOT) {
    return new Response(
      "Misconfigured: UPSTREAM_HOST is missing or invalid. Use e.g. https://xray.example.com:2096",
      { status: 500 }
    );
  }

  try {
    const relayUrl = `${UPSTREAM_ROOT}${sourceUrl.pathname}${sourceUrl.search}`;

    const forwardedHeaders = new Headers();
    let requesterIp = null;
    for (const [headerName, headerValue] of req.headers) {
      if (HOP_BY_HOP_HEADERS.has(headerName)) continue;
      if (headerName.startsWith("x-vercel-")) continue;
      if (headerName === "x-real-ip") {
        requesterIp = headerValue;
        continue;
      }
      if (headerName === "x-forwarded-for") {
        if (!requesterIp) requesterIp = headerValue;
        continue;
      }
      forwardedHeaders.set(headerName, headerValue);
    }
    if (requesterIp) forwardedHeaders.set("x-forwarded-for", requesterIp);

    const httpMethod = req.method;
    const shouldProxyBody = httpMethod !== "GET" && httpMethod !== "HEAD";

    return await fetch(relayUrl, {
      method: httpMethod,
      headers: forwardedHeaders,
      body: shouldProxyBody ? req.body : undefined,
      redirect: "manual",
    });
  } catch (cause) {
    const errorText = cause instanceof Error ? cause.message : String(cause);
    console.error("relay error:", errorText);
    return new Response(`Bad Gateway: Tunnel Failed (${errorText})`, {
      status: 502,
    });
  }
}