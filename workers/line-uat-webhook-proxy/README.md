# LINE UAT Webhook Proxy

This Worker is the stable UAT endpoint for LINE Messaging API. It verifies
`X-Line-Signature`, returns HTTP 200 immediately, and forwards the JSON body to
the UAT Google Apps Script Web App. The Apps Script 302 redirect is handled
inside the Worker and is never returned to LINE.

## Local verification

```bash
npx wrangler dev
curl http://localhost:8787/health
```

## Deploy

Set the UAT channel secret as a Cloudflare secret; do not commit it:

```bash
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler deploy
```

Then set the deployed Worker URL in LINE Developers as the UAT Webhook URL:

```text
https://happy-line-uat-webhook-proxy.<account-subdomain>.workers.dev/
```

The LINE Verify button must be tested only after the secret is configured.
