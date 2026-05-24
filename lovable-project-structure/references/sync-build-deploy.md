# GitHub sync, build & deploy

## Bidirectional sync

- Lovable ↔ GitHub is **two-way and automatic** via the Lovable GitHub App. Commits made in the Lovable editor push to the connected branch within seconds; commits pushed to GitHub from anywhere appear in the Lovable editor within seconds.
- There is no manual "pull" or "push" button — `git push origin <default-branch>` is the sync trigger from the outside.
- Default branch is what Lovable syncs with. Other branches show up only if the workspace has the Labs "GitHub Branch Switching" feature enabled.
- Only **one** GitHub account per Lovable account.

## Working from an external tool (Claude Code, local IDE)

Safe workflow:

1. `git pull` before editing — the user may have made changes in the Lovable editor since you last looked.
2. Edit, commit, push to the default branch (or open a PR and merge).
3. Wait ~5–15s; the Lovable preview at `id-preview--<project-id>.lovable.app` rebuilds with your commit.
4. If the user wants the change live on production (`<project>.lovable.app` or their custom domain), **they must click "Publish → Update"** in the editor. Pushing to GitHub alone does **not** publish frontend changes.

Avoid:

- **Force push / rebase / history rewrites** on the synced branch — can desync the editor and require support intervention.
- **Editing `src/routeTree.gen.ts`** — regenerated every build; your edits vanish and may cause a merge conflict on next sync.
- **Hand-editing applied migrations** (`supabase/migrations/<old>.sql`) — Lovable considers them immutable history; add a new migration instead.
- **Adding `.env` files** — Lovable doesn't use them; secrets live in the Cloud UI.
- **Renaming/moving `src/integrations/supabase/*`** — the Lovable editor expects these exact paths to wire up the clients and types regeneration.

## Frontend vs backend deploy

| Change type | Lands on preview URL | Lands on production URL |
|---|---|---|
| Frontend (React, CSS, routes) | On push (auto) | **Only after user clicks Publish → Update** |
| New migration | On push (auto, applied to Cloud DB) | On push (auto — DB is shared) |
| New/changed server function or server route | On push (auto) | On push (auto) |
| Secret added in Lovable UI | Immediately | Immediately |
| Connector linked | Immediately | Immediately |

Backend changes deploy without a publish click because the DB and server runtime are shared between preview and production. Only the static/SSR build is gated by the publish action.

## URLs to know

| URL pattern | Purpose |
|---|---|
| `id-preview--<project-id>.lovable.app` | Latest commit preview. Requires Lovable login by default (Share → Share preview creates a 7-day public link). |
| `project--<project-id>-dev.lovable.app` | Stable preview URL (immutable even if project is renamed). Use for webhook callbacks during dev. |
| `project--<project-id>.lovable.app` | Stable production URL. Use for webhook callbacks in prod. |
| `<project-slug>.lovable.app` | Friendly production URL; changes if project is renamed. |
| Custom domain | Configured in Project Settings → Domains after first publish. |

For `/api/public/*` routes called by external services (webhooks, cron), use the stable `project--*` URLs — they survive project renames.

## Build & runtime

- Package manager: **bun** (`bunfig.toml`, `bun.lock`). Use `bun add` / `bun remove`, not `npm` / `yarn` / `pnpm`.
- Build: Vite 7 + the TanStack Start plugin. Output is deployed to Cloudflare Workers (`wrangler.jsonc` defines bindings). Do **not** add `ssr.external` or `resolve.external` to `vite.config.ts` — the Worker bundle requires everything bundled at build time, and externals cause a hard build failure.
- Strict TypeScript. Unresolved imports = hard build failure. Create the target file (or `bun add` the package) **before** writing the import.
- Node-only packages (anything needing `child_process`, native `.node` addons, `sharp`, `canvas`, `puppeteer`, file watching) will pass `bun dev` and fail in the Worker production build. Pick fetch-based / WASM alternatives.

## When sync breaks

Symptoms: editor shows old code, preview won't update, "out of sync" banner.

1. Confirm the push landed on the correct (default) branch on GitHub.
2. Have the user open the Lovable editor and refresh — sync is pull-based on view.
3. If still broken, the user can disconnect/reconnect GitHub from Project Settings. As an external editor you can't trigger this — flag it to the user.