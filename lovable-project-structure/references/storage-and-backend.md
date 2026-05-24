# Storage & backend

## Lovable Cloud = Supabase (managed)

Lovable Cloud is a thin product wrapper around a Supabase project that Lovable provisions, owns, and bills through the workspace. From the codebase's perspective it **is** Supabase — same Postgres, same Auth, same Storage, same RLS, same JS client (`@supabase/supabase-js`). The differences:

- The project owner manages it from the Lovable UI (Cloud tab), not the Supabase dashboard. The owner *can* open the Supabase SQL Editor from inside Lovable to run ad-hoc queries against the same database.
- Lovable injects env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, server-side `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) into both build and runtime — there is no `.env` file in the repo.
- In user-facing copy, call it "Lovable Cloud". In code/comments, calling it Supabase is fine.

## The three Supabase clients

Always pick the right one — wrong client = either silent RLS bypass or 401s.

| File | Import | Where | Key | RLS |
|---|---|---|---|---|
| `src/integrations/supabase/client.ts` | `supabase` | Browser only | Publishable | Applies as anon/user |
| `src/integrations/supabase/auth-middleware.ts` | `requireSupabaseAuth` middleware | Server functions needing user identity | Publishable + user JWT | Applies as the logged-in user |
| `src/integrations/supabase/client.server.ts` | `supabaseAdmin` | Server routes / webhooks only | **Service role** | **Bypasses RLS** |

`client.server.ts` must never be imported from client code — file naming + import-protection enforce this, but a wrong-folder import (e.g. moving it into `src/components/`) can leak the service role key into the browser bundle.

`attachSupabaseAuth` must be registered in `src/start.ts` `functionMiddleware` for `requireSupabaseAuth` to receive the user's bearer token on server-fn RPC calls.

## Database tables & migrations

- Source of truth: `supabase/migrations/<timestamp>_<name>.sql`. Each file is applied **once, in order**; Lovable tracks applied migrations.
- **Never edit a file that has already been applied.** To change schema, add a new migration.
- `src/integrations/supabase/types.ts` is regenerated from the live DB. Don't hand-edit; it's overwritten on next sync.
- The project owner can run one-off SQL via the SQL Editor inside Lovable Cloud → Database. Those changes aren't captured in migrations automatically, so an external editor pulling the repo may see a schema drift. When in doubt, run `select * from supabase_migrations.schema_migrations` (the owner can) to see what's applied.

## Row Level Security (RLS)

- RLS is **on** by default for every new table.
- Every table needs explicit policies for `select`, `insert`, `update`, `delete` per role.
- Never bypass RLS by switching to `supabaseAdmin` "to make it work" in a server function called from the user's browser — fix the policy instead.

## User roles pattern (security-critical)

Lovable enforces this exact pattern. Do not store roles on `profiles` or any column on `auth.users` — that enables privilege escalation via row updates.

```sql
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
```

Then use `public.has_role(auth.uid(), 'admin')` inside RLS policies. The `security definer` + dedicated table is what prevents recursive RLS and stops users from granting themselves roles.

## Storage buckets

Created via migration (`insert into storage.buckets ...`) or from Lovable Cloud UI. Bucket policies are RLS policies on `storage.objects`. Public buckets serve via `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>`.

## Auth

- Email/password + OAuth providers (Google, Apple, GitHub, etc.) are configured in Lovable Cloud → Users, **not** in code. External editors can't change auth provider config by editing files.
- Session is persisted in `localStorage` via the browser client.
- `onAuthStateChange` listener belongs in a top-level React provider, not inside route loaders.