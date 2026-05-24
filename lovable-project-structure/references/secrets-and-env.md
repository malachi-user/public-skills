# Secrets & environment variables

## Two layers, do not confuse them

| Layer | Where managed | Available at | How to add |
|---|---|---|---|
| **Runtime secrets** | Lovable Cloud → Settings → Secrets (per project) | `process.env.X` inside server functions / server routes at request time | Lovable UI, or `add_secret` tool from the agent |
| **Build secrets** | Workspace Settings → Build Secrets (per workspace) | `process.env.X` during `bun install` only (e.g. for `.npmrc` private registry tokens) | Workspace admin only, manually |

A runtime secret named `NPM_TOKEN` is **not** visible during `bun install`. They are different stores.

## What is NOT in the repo

- No `.env`, `.env.local`, or `.env.production` file. Don't create one and don't add one to `.gitignore` discussions — there's nothing to ignore.
- Don't hardcode secrets, even temporarily. External tools that commit a key trigger Lovable's secret scanner and can leak to GitHub history.

## Pre-populated env vars

Always present in server runtime, no setup needed:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Lovable Cloud database access.
- `LOVABLE_API_KEY` — auth for Lovable AI Gateway and Connector Gateway. Treat as secret; rotate via Lovable UI if leaked.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — browser-exposed (the `VITE_` prefix is the marker).

For each linked connector, an additional `<CONNECTOR>_API_KEY` env var appears (e.g. `SLACK_API_KEY`, `GOOGLE_MAIL_API_KEY`). These are gateway connection keys, not the raw provider API key.

## Browser vs server access

- `import.meta.env.VITE_FOO` — replaced by Vite at build time, bundled into the client JS. **Public.**
- `process.env.FOO` — read only in server functions/routes at runtime. **Private.** Calling `process.env.FOO` from a React component returns `undefined` in the browser.

If a non-secret config value needs to be in the browser, name it `VITE_*` and add via the runtime-secrets UI (Lovable will inject it into the build env too).

## Reading secrets correctly in server functions

```ts
export const fn = createServerFn({ method: "POST" })
  .handler(async () => {
    const key = process.env.MY_API_KEY; // read INSIDE handler
    if (!key) throw new Error("MY_API_KEY not configured");
    // ...
  });
```

Reading `process.env` at module top level returns `undefined` during the Worker build snapshot.