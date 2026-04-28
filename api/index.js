export const config = { runtime: "edge" };

const LANDING_PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sample Vercel Gateway</title>
    <meta
      name="description"
      content="Modern Vercel edge gateway landing page with platform highlights."
    />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-400/30">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"></div>
      <div class="absolute right-0 top-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
    </div>

    <main class="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <header class="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/40 p-8 shadow-2xl shadow-black/20 sm:p-12">
        <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl"></div>
        <div class="relative">
          <p class="inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
            Vercel Edge Runtime Active
          </p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Sample Vercel Gateway
          </h1>
          <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            A clean, minimal homepage for your deployment that keeps protocol functionality untouched.
            Root URL serves this page, while operational routes such as <code>/work</code> continue
            to pass through the edge relay as before.
          </p>
          <div class="mt-7 flex flex-wrap gap-3 text-xs">
            <span class="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-200">Platform: Vercel</span>
            <span class="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-200">Runtime: Edge Functions</span>
            <span class="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-200">Transport: HTTPS/TLS</span>
          </div>
        </div>
      </header>

      <section class="mt-8 grid gap-4 sm:grid-cols-3">
        <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p class="text-xs uppercase tracking-wider text-slate-400">Routing</p>
          <p class="mt-2 text-lg font-semibold">Rewrite Based</p>
          <p class="mt-2 text-sm text-slate-300">Declarative path handling with <code>vercel.json</code>.</p>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p class="text-xs uppercase tracking-wider text-slate-400">Deployment</p>
          <p class="mt-2 text-lg font-semibold">Git Integrated</p>
          <p class="mt-2 text-sm text-slate-300">Automatic preview and production deployments from commits.</p>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p class="text-xs uppercase tracking-wider text-slate-400">Security</p>
          <p class="mt-2 text-lg font-semibold">Managed TLS</p>
          <p class="mt-2 text-sm text-slate-300">HTTPS by default with modern protocol compatibility.</p>
        </article>
      </section>

      <section class="mt-10 grid gap-4 md:grid-cols-2">
        <article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 class="text-lg font-semibold">Why teams use Vercel</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-300">
            <li><span class="text-cyan-300">Global edge network:</span> lower latency delivery and responsive routing.</li>
            <li><span class="text-cyan-300">Preview deployments:</span> every change can be tested on a shareable URL.</li>
            <li><span class="text-cyan-300">Instant rollbacks:</span> return to a previous healthy deployment quickly.</li>
            <li><span class="text-cyan-300">Domain management:</span> attach custom domains and route traffic safely.</li>
          </ul>
        </article>
        <article class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 class="text-lg font-semibold">Features relevant to this gateway</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-300">
            <li><span class="text-cyan-300">Edge execution:</span> request logic runs near users.</li>
            <li><span class="text-cyan-300">Flexible rewrites:</span> route <code>/</code> and <code>/work</code> behaviors cleanly.</li>
            <li><span class="text-cyan-300">Header control:</span> forward needed headers to upstream endpoints.</li>
            <li><span class="text-cyan-300">Zero server ops:</span> no VM management for this edge handler.</li>
          </ul>
        </article>
      </section>

      <footer class="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-xs text-slate-400">
        This is a presentation page for the base URL only. Functional proxy paths remain active and unchanged.
      </footer>
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