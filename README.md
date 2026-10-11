# Bikri Plus – Netlify setup

Folders
- public/                     the website (this is the only folder Netlify publishes)
- netlify/functions/submit.js receives form + order data and forwards it to n8n
- .env / .env.example         secrets for local testing only (.env is git-ignored)

Setup
1. Push this folder to GitHub (the .env file is ignored by .gitignore) and connect it to Netlify.
2. Netlify -> Site configuration -> Environment variables. Add: N8N_WEBHOOK_URL, N8N_AUTH_HEADER, N8N_AUTH_TOKEN, ALLOWED_ORIGINS
   (tick "Contains secret values" for N8N_WEBHOOK_URL and N8N_AUTH_TOKEN).
3. n8n Webhook node: Method POST, Path bikri-plus, Authentication = Header Auth
   (name = value of N8N_AUTH_HEADER, value = N8N_AUTH_TOKEN). Activate the workflow.
4. Redeploy. Test with an order and a contact form.

Local test: npm i -g netlify-cli, then "netlify dev" in this folder (it reads .env).
