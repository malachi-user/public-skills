# Working with the Lovable MCP

The Lovable MCP server turns Lovable from "a website the user clicks in" into a system you can drive directly: read the project's code, run SQL against its database, and publish to production — without the user touching the editor.

## Connecting

Lovable ships a hosted MCP server at `https://mcp.lovable.dev` (streamable HTTP, OAuth).

| How it's connected | Tool name prefix |
|---|---|
| claude.ai connector (authorized once in claude.ai → Settings → Connectors) | `mcp__claude_ai_Lovable__*` |
| Added via CLI: `claude mcp add --transport http lovable https://mcp.lovable.dev` | `mcp__lovable__*` |

Either way the tool set is identical — only the prefix differs. Check what's live with `claude mcp list`; a healthy server reports `✔ Connected`.

OAuth needs a browser, so it can only be completed in an **interactive** session (`/mcp` in Claude Code, or the claude.ai connector settings page). A headless/automated run cannot authorize a server — if it reports `! Needs authentication`, stop and tell the user to authorize it rather than working around it.

Each client and each machine authorizes separately. A grant made on the user's laptop does not carry over to a server or to a second tool — that's the usual reason a connector "works locally but not in automation".

### Other MCP clients hit the same account

Codex and other agents connect to Lovable through their own connector UI, not through `claude mcp`. The registrations are independent, but they authenticate against the **same Lovable account, workspace, projects and credit balance**. So:

- Work done from one client is immediately visible from the other — same repo, same database, same deploys.
- Credits are drawn from one shared balance whichever client sends the message.
- The exposed tool surface can differ slightly between clients, but the practical capability is equivalent: create a project, edit it in natural language, read files and diffs, publish, query the database, view analytics, manage integrations and skills.
- **Don't drive the same project from two clients at once** — two agents messaging one project collide on the same branch.

### Permissions (the failure that looks like a broken MCP)

An MCP call from a non-interactive run fails with *"requested permissions to use `mcp__..._Lovable__get_me`, but you haven't granted it yet"* unless the tool is allowlisted. This is a **permissions problem, not a connection problem** — the server is connected fine.

Add to `.claude/settings.json` → `permissions.allow`:

```jsonc
"mcp__claude_ai_Lovable"                       // whole server, incl. writes/deploys/credits
"mcp__claude_ai_Lovable__query_database"       // or grant tool by tool (preferred)
```

Recommended split: allowlist the read-only tools (`get_me`, `list_workspaces`, `list_projects`, `get_project`, `list_files`, `read_file`, `list_edits`, `get_diff`, `get_database_status`, `list_connectors`, `get_project_knowledge`) so automated runs can inspect freely, and leave the ones that spend credits (`send_message`, `create_project`), write to production (`query_database`, `deploy_project`), or change config behind an explicit prompt.

## Tool map

| Need | Tools |
|---|---|
| Who am I / what's available | `get_me`, `list_workspaces`, `get_workspace` (plan + **credit balance**), `list_projects` |
| Project facts | `get_project` → `editor_url`, `preview_url`, latest commit sha, screenshot |
| Read the code without cloning | `list_files`, `read_file`, `list_edits`, `get_diff` |
| Change the code | GitHub push (see below) **or** `send_message` |
| Ship to production | `deploy_project` |
| Database | `get_database_status`, `enable_database`, `query_database` |
| Persistent agent instructions | `get`/`set_project_knowledge`, `get`/`set_workspace_knowledge` |
| Reusable agent skills | `list`/`get`/`create`/`update`/`delete_workspace_skill` |
| Integrations | `list_connectors`, `list_custom_connectors`, `add_connector` (returns a dashboard URL — cannot add one programmatically) |
| Traffic | `get_project_analytics`, `get_project_analytics_trend` |
| New projects | `create_project`, `remix_project`, `list_template_projects`, `list_design_systems`, `render_project_widget` |
| Housekeeping | `set_project_visibility`, `move_projects_to_folder`, `get_file_upload_url` |

## Two ways to change code — pick one per task

**Path A — edit through GitHub.** You write the code, commit, push. Deterministic, reviewable in a diff, costs **no Lovable credits**, and every rule in this skill (routing conventions, migrations, Worker constraints) applies. Default to this whenever you know exactly what the code should look like.

**Path B — `send_message` to the Lovable agent.** Describe the outcome in natural language ("add a testimonials section matching the existing card style"); Lovable's own agent writes the code, installs packages, and wires integrations. Costs workspace credits. Use it for open-ended visual work, for wiring integrations (Stripe, Resend, auth) where Lovable has scaffolding you'd otherwise reverse-engineer, or when attaching a design image is the fastest spec. `plan_mode: true` gets a plan back with no code written.

**Never run both at once.** A `send_message` run commits to the same branch you're pushing to — concurrent writes cause conflicts and can desync the editor. Wait for one to finish before starting the other.

## The end-to-end loop: edit on GitHub, deploy with MCP

This is the workflow the MCP unlocks — previously step 5 required the user to click "Publish" by hand.

1. `get_project(project_id)` — grab `preview_url` and the latest commit sha, and confirm the project is the one you think it is.
2. `git pull` → edit → commit → `git push` to the **default branch**. (The user may have edited in the Lovable editor since you last pulled.)
3. Wait ~5–15s. Lovable's GitHub App syncs the commit and rebuilds the preview automatically.
4. Verify it landed: `list_edits` or `read_file` at the new sha, and/or `get_project` again for a fresh screenshot of the preview.
5. `deploy_project(project_id)` → returns the live production URL. Frontend changes are now public.

Notes on step 5:
- Backend changes (new migrations, server functions, secrets) go live on push without a deploy — the DB and server runtime are shared between preview and production. Only the static/SSR frontend build is gated behind the deploy.
- `deploy_project` is a **public, outward-facing action**. Confirm with the user before publishing unless they explicitly asked you to ship.
- The optional `name` argument sets the published URL slug. Omit it to keep the existing slug — passing a new one changes the public URL.

## Database over MCP — read *and* write

Yes, both. `query_database` accepts SELECT, INSERT, UPDATE, DELETE and DDL, and returns rows as JSON.

```
get_database_status(project_id)   → is a Postgres (Supabase) DB provisioned?
enable_database(project_id)       → provision one; 30–60s, needed only once
query_database(project_id, sql)   → run SQL
```

**There is one database.** Preview and production share it, so every write through `query_database` hits live user data immediately. There is no staging copy and no undo.

Working rules:

- **Reads are the default.** Inspecting schema, checking whether a migration applied, counting rows, debugging why a page renders empty — all fine.
- **Writes only when explicitly asked**, and state the row count you're about to touch before you run it. Always `SELECT` the target rows first to confirm the `WHERE` clause matches what you expect.
- **Schema changes still belong in a migration file**, not in `query_database`. Running `CREATE TABLE` / `ALTER TABLE` over MCP works, but the repo's `supabase/migrations/` then no longer describes the real schema, and `src/integrations/supabase/types.ts` isn't regenerated — so the TypeScript types silently lie. Add `supabase/migrations/<timestamp>_<name>.sql` and push; Lovable applies it. Use DDL over MCP only to *inspect*, or for a genuine emergency fix that you immediately capture as a migration.
- **Never dump personal data into a chat or WhatsApp message.** `SELECT *` on a users/leads/orders table sends real customer records into the transcript. Select the specific columns you need, aggregate, or report counts.

Useful inspection queries:

```sql
-- what tables and columns exist
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- RLS policies (Lovable's security model depends on these)
select schemaname, tablename, policyname, cmd, qual
from pg_policies where schemaname = 'public';

-- is RLS actually on?
select relname, relrowsecurity
from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';

-- did the latest migration apply?
select version, name from supabase_migrations.schema_migrations
order by version desc limit 5;
```

A table with `relrowsecurity = false` in a Lovable project is a finding, not a detail — report it.

## Credits and long-running agent calls

- `send_message` and `create_project` spend the user's workspace credits. `get_workspace(workspace_id)` shows the balance — check it before kicking off a large build.
- Both wait up to `timeout_seconds` (default and max 600). On timeout the response is `status: "in_progress"` with a `message_id`; poll with `get_message(project_id, message_id, thread_id)` until `completed`.
- In a **one-shot automated run** (e.g. the WhatsApp bot) there is no "later" — the process ends when the turn does. Either wait inside the same turn, or hand the user the `message_id` and the editor URL. Never promise to check back in X minutes.

## Knowledge and workspace skills

`set_project_knowledge` / `set_workspace_knowledge` inject persistent instructions into every Lovable agent run for that project/workspace — the right place for Hebrew RTL rules, brand voice, "always use `dir="rtl"` on the root", preferred libraries. Max 10,000 chars, and **set replaces the whole thing**: always `get_*` first and merge, never blind-overwrite.

`create_workspace_skill` / `update_workspace_skill` write `skills/<name>/SKILL.md` into the workspace repo — the same SKILL.md format used here, shared across all projects in the workspace. Requires workspace admin/owner. Read with `get_workspace_skill` before updating.

## What the MCP still can't do

Flag these to the user instead of trying to work around them:

- **Add or configure connectors** — `add_connector` only returns the dashboard URL for the user to open.
- **Set secrets / environment variables** — Lovable Cloud UI only. See [secrets & env vars](secrets-and-env.md).
- **Custom domains** — Project Settings → Domains, after the first publish.
- **Git operations** (branches, PRs, reverts) — use `git` / `gh` against the GitHub repo.
- **Repair broken GitHub sync** — the user must disconnect/reconnect from Project Settings.
