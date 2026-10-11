# Bikri Plus — GitHub Pages + Cloudflare Worker + n8n

## What runs where
- `index.html`: static website hosted on GitHub Pages.
- `worker.js`: Cloudflare Worker backend that forwards form/order submissions to n8n.
- Do **not** put the n8n secret in `index.html`, GitHub files, or any frontend JavaScript.

## 1. Publish the website on GitHub Pages
1. Create a GitHub repository, for example `bikri-plus`.
2. Upload `index.html` to the repository root (not inside `public/`).
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, branch `main`, folder `/(root)`, then Save.
5. Wait for the published URL, usually `https://YOUR-USERNAME.github.io/bikri-plus/` for a project site.

## 2. Deploy the Worker
1. Sign in to Cloudflare and open **Workers & Pages → Create → Worker**.
2. Create a Worker and paste the contents of `worker.js`, then deploy.
3. In Worker **Settings → Variables and Secrets**, configure:
   - `N8N_WEBHOOK_URL` = `https://n633847.app.n8n.cloud/webhook/bikri-plus`
   - `N8N_AUTH_HEADER` = `x-webhook-secret`
   - `N8N_AUTH_TOKEN` = a NEW long random secret (mark it as a Secret)
   - `ALLOWED_ORIGIN` = your exact GitHub Pages origin, without a trailing slash, e.g. `https://YOUR-USERNAME.github.io`
4. Save changes and redeploy if requested.
5. Copy the deployed Worker URL, such as `https://bikri-plus-api.YOUR-SUBDOMAIN.workers.dev`.

Important: for a GitHub project site, the origin is only `https://YOUR-USERNAME.github.io` (not the `/bikri-plus/` path).

## 3. Connect the website to the Worker
1. In the GitHub repository, edit `index.html`.
2. Find `YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev`.
3. Replace the placeholder with your actual Worker URL, keeping `https://`.
4. Commit the change and wait for GitHub Pages to redeploy.

## 4. Configure n8n
1. Open your n8n workflow and set the Webhook node to **POST**, path `bikri-plus`, and **Header Auth**.
2. The header name must match `N8N_AUTH_HEADER`; its value must match the new `N8N_AUTH_TOKEN`.
3. Activate the workflow.
4. Use the production URL `/webhook/bikri-plus`, not `/webhook-test/bikri-plus`, for the live website. Test URLs only work while the webhook is listening for a test event.

## 5. Test
Submit a contact form and an order. Confirm each request arrives in n8n and that the site shows success. If it fails, check the browser Network tab and the Worker logs in Cloudflare.

## Security notes
- The n8n token previously pasted into chat should be treated as exposed: rotate it and update the n8n Header Auth credential and Worker secret. Do not reuse it.
- CORS/allowed origin is not authentication by itself; public forms can still receive spam. Add rate limiting or a CAPTCHA/Turnstile check before using this for real orders.
- GitHub Pages cannot read `.env` files or run Netlify Functions. Do not upload `.env`.
