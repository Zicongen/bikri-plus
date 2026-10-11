// Cloudflare Worker for Bikri Plus form submissions.
// Set these as Worker secrets/variables in Cloudflare:
// N8N_WEBHOOK_URL = https://n633847.app.n8n.cloud/webhook/bikri-plus
// N8N_AUTH_HEADER = x-webhook-secret
// N8N_AUTH_TOKEN = a NEW long random secret matching n8n Header Auth
// ALLOWED_ORIGIN = https://YOUR-USERNAME.github.io (or your repository Pages URL)
//
// Use the PRODUCTION n8n webhook URL (/webhook/...), not /webhook-test/,
// after activating the n8n workflow.

const MAX_BODY = 10000;
const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

function response(body, status, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = (env.ALLOWED_ORIGIN || "").trim();

    if (!allowedOrigin || origin !== allowedOrigin) {
      return response({ ok: false, error: "forbidden_origin" }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "POST") {
      return response({ ok: false, error: "method_not_allowed" }, 405, allowedOrigin);
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY) {
      return response({ ok: false, error: "too_large" }, 413, allowedOrigin);
    }

    let b;
    try { b = JSON.parse(raw || "{}"); }
    catch { return response({ ok: false, error: "bad_json" }, 400, allowedOrigin); }

    const type = b.type === "order" || b.type === "contact" ? b.type : null;
    const name = clip(b.name, 100);
    const phone = clip(b.phone, 30);
    if (!type || !name || !phone) {
      return response({ ok: false, error: "missing_fields" }, 400, allowedOrigin);
    }

    if (!env.N8N_WEBHOOK_URL || !env.N8N_AUTH_TOKEN) {
      return response({ ok: false, error: "server_not_configured" }, 500, allowedOrigin);
    }

    const payload = {
      type,
      source: "bikri-plus-website",
      submittedAt: new Date().toISOString(),
      pageUrl: clip(b.pageUrl, 300),
      name,
      phone,
      email: clip(b.email, 120),
      service: clip(b.service, 80),
    };

    if (type === "order") {
      payload.plan = clip(b.plan, 40);
      payload.price = Number(b.price) || 0;
      payload.billing = b.billing === "monthly" ? "monthly" : "one-time";
    } else {
      payload.form = clip(b.form, 40);
      payload.budget = clip(b.budget, 60);
      payload.message = clip(b.message, 2000);
    }

    const headers = { "Content-Type": "application/json" };
    headers[env.N8N_AUTH_HEADER || "x-webhook-secret"] = env.N8N_AUTH_TOKEN;

    try {
      const upstream = await fetch(env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) {
        return response({ ok: false, error: "upstream_" + upstream.status }, 502, allowedOrigin);
      }
      return response({ ok: true }, 200, allowedOrigin);
    } catch {
      return response({ ok: false, error: "upstream_unreachable" }, 502, allowedOrigin);
    }
  },
};
