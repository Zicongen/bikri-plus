// Receives form/order data from the website and forwards it to your n8n webhook.
// The n8n URL and secret live ONLY in environment variables, so visitors never see them.

const MAX_BODY = 10000; // bytes
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const reply = (statusCode, obj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { ok: false, error: 'method_not_allowed' });

  // Only accept requests that come from your own site(s).
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const origin = event.headers.origin || event.headers.Origin || '';
  if (allowed.length && !allowed.includes(origin)) return reply(403, { ok: false, error: 'forbidden' });

  const target = process.env.N8N_WEBHOOK_URL;
  if (!target) return reply(500, { ok: false, error: 'server_not_configured' });

  if ((event.body || '').length > MAX_BODY) return reply(413, { ok: false, error: 'too_large' });
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { ok: false, error: 'bad_json' }); }

  const type = b.type === 'order' || b.type === 'contact' ? b.type : null;
  const name = clip(b.name, 100);
  const phone = clip(b.phone, 30);
  if (!type || !name || !phone) return reply(400, { ok: false, error: 'missing_fields' });

  // Whitelist fields: nothing unexpected is passed on to n8n.
  const payload = {
    type,
    source: 'bikri-plus-website',
    submittedAt: new Date().toISOString(),
    pageUrl: clip(b.pageUrl, 300),
    name,
    phone,
    email: clip(b.email, 120),
    service: clip(b.service, 80),
  };
  if (type === 'order') {
    payload.plan = clip(b.plan, 40);
    payload.price = Number(b.price) || 0;
    payload.billing = b.billing === 'monthly' ? 'monthly' : 'one-time';
  } else {
    payload.form = clip(b.form, 40);
    payload.budget = clip(b.budget, 60);
    payload.message = clip(b.message, 2000);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.N8N_AUTH_TOKEN) {
    headers[process.env.N8N_AUTH_HEADER || 'x-webhook-secret'] = process.env.N8N_AUTH_TOKEN;
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(target, { method: 'POST', headers, body: JSON.stringify(payload), signal: ctl.signal });
    if (!r.ok) return reply(502, { ok: false, error: 'upstream_' + r.status });
    return reply(200, { ok: true });
  } catch (e) {
    return reply(502, { ok: false, error: 'upstream_unreachable' });
  } finally {
    clearTimeout(timer);
  }
};
