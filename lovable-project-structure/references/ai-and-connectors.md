# Lovable AI & Connectors

## Lovable AI Gateway

- One env var (`LOVABLE_API_KEY`) gives server code access to many LLMs (OpenAI, Anthropic, Google, etc.) without per-provider keys.
- Endpoint: `https://ai.gateway.lovable.dev/v1/...` (OpenAI-compatible chat completions API). Use it from server functions/routes.
- Billing is usage-based against the workspace; no extra setup beyond Lovable Cloud being enabled.
- Never call the gateway from browser code — it would expose `LOVABLE_API_KEY`. Always proxy via a server function.

Example:
```ts
const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
});
```

## Connectors

Connectors are pre-built integrations the workspace owner links via Lovable UI. They come in two flavors:

### Gateway connectors (most common)

Authenticate the **workspace owner's account** (not each end-user). All requests go through the Lovable Connector Gateway, which handles OAuth refresh transparently. External tools must use the gateway URL pattern, **not** the provider's direct API or official SDK:

```
https://connector-gateway.lovable.dev/{connector_id}/{provider_path}
```

Required headers on every request:

| Header | Value |
|---|---|
| `Authorization` | `Bearer ${LOVABLE_API_KEY}` |
| `X-Connection-Api-Key` | `${<CONNECTOR>_API_KEY}` (e.g. `SLACK_API_KEY`) |

Example (Slack `chat.postMessage`):
```ts
await fetch("https://connector-gateway.lovable.dev/slack/api/chat.postMessage", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": process.env.SLACK_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ channel, text }),
});
```

**Connectors that use the gateway**: Ashby, Google Maps, Google Sheets, Microsoft Excel, Attention, AWS S3, Contentful, Google Search Console, Microsoft Teams, BigQuery, Google Docs, Microsoft OneDrive, Microsoft Word, Telegram, Fireflies, Google Drive, Inngest, Microsoft PowerPoint, Twilio, Twitch, WordPress.com, Asana, Gemini Enterprise, Google Calendar, Granola, HubSpot, Linear, Microsoft Outlook, Airtable, Google Slides, Mailgun, Notion, Semrush, Slack, TikTok, Brevo, Databricks, Gmail (`google_mail`), Resend, Snowflake, Microsoft OneNote, Storyblok, Wiz.

### Direct-API connectors

These do **not** use the gateway. The injected `<CONNECTOR>_API_KEY` is the real provider API key — call the provider directly with their SDK or REST API:

- Firecrawl, Perplexity, ElevenLabs, Aikido.

### Verifying a connection

```
POST https://connector-gateway.lovable.dev/api/v1/verify_credentials
Authorization: Bearer $LOVABLE_API_KEY
X-Connection-Api-Key: $<CONNECTOR>_API_KEY
```

Returns `{ outcome: "verified" | "skipped" | "failed", latency_ms, error? }`. Useful when debugging 401s without making destructive calls.

### Per-user OAuth (when connectors don't fit)

Connectors authenticate the **builder's** account. If the app needs each end-user to authorize their own account (e.g. each user reads their own Gmail), connectors are not sufficient — implement standard OAuth per user with your own client credentials and store tokens per user in the database. External editors generally should not try to repurpose a connector for per-user auth.

## Non-secret connector fields

Some connector fields are public (app IDs, project IDs). Those are exposed as `VITE_LOVABLE_CONNECTOR_{CONNECTOR_ID}_{FIELD_ID}` and usable in browser code via `import.meta.env`. Secret fields stay server-only.