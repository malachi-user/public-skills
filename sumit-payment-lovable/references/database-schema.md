# Database schema & RLS

Add **one new** timestamped migration under `supabase/migrations/<timestamp>_sumit_subscriptions.sql`. Never edit an already-applied migration (Lovable treats them as immutable history). After the user pushes, Lovable Cloud applies it and regenerates `src/integrations/supabase/types.ts`.

## Migration

```sql
-- 1. Roles (Lovable security invariant: roles live in their own table, never on profiles)
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.user_roles where user_id = _user_id and role = _role
) $$;

-- 2. Subscription plans
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_months integer not null default 1,
  price decimal(10,2) not null,
  is_recurring boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;

-- 3. Payment records
create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  amount decimal(10,2) not null,
  status text not null default 'pending', -- pending | completed | failed | verification_failed
  provider_reference text,               -- Sumit PaymentID
  provider_payload jsonb,                -- full payloads for debugging
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_records enable row level security;
create index if not exists idx_payment_records_user on public.payment_records(user_id);
create index if not exists idx_payment_records_provider_ref on public.payment_records(provider_reference);

-- 4. Profiles columns (add only if missing — profiles is usually created by the template)
alter table public.profiles add column if not exists subscription_status text default 'inactive'; -- active | inactive | cancelled
alter table public.profiles add column if not exists subscription_end_date timestamptz;            -- null when recurring
alter table public.profiles add column if not exists privacy_accepted boolean default false;
alter table public.profiles add column if not exists marketing_consent boolean default false;

-- 5. updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_plans_updated on public.subscription_plans;
create trigger trg_plans_updated before update on public.subscription_plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated on public.payment_records;
create trigger trg_payments_updated before update on public.payment_records
  for each row execute function public.set_updated_at();
```

## RLS policies (same migration)

```sql
-- user_roles: a user can read their own roles; only admins manage
create policy "read own roles" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- subscription_plans: anyone can read; only admins write
create policy "plans readable by all" on public.subscription_plans
  for select using (true);
create policy "admins insert plans" on public.subscription_plans
  for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update plans" on public.subscription_plans
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete plans" on public.subscription_plans
  for delete using (public.has_role(auth.uid(), 'admin'));

-- payment_records: a user sees/creates only their own; admins manage all
create policy "users read own payments" on public.payment_records
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "users create own payments" on public.payment_records
  for insert with check (auth.uid() = user_id);
create policy "admins update payments" on public.payment_records
  for update using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete payments" on public.payment_records
  for delete using (public.has_role(auth.uid(), 'admin'));
```

## Notes

- **The IPN webhook writes to `payment_records` and `profiles` using `supabaseAdmin` (service role), which bypasses RLS** — that is correct and required, because Sumit's callback has no user JWT. RLS above governs the *browser* clients only.
- `finalize-by-record` runs as the logged-in user via `requireSupabaseAuth`; its writes to `payment_records`/`profiles` must satisfy the policies above. If you need it to update `payment_records.status`, either run that update through `supabaseAdmin` inside the server fn or add a scoped update policy for the owner — prefer `supabaseAdmin` in the server fn so the owner can't forge a "completed" status from the browser.
- Don't hand-edit `src/integrations/supabase/types.ts`; it regenerates after the migration syncs.
- Seed an admin role for the project owner once: `insert into public.user_roles (user_id, role) values ('<owner-uuid>', 'admin');` (owner runs this via the Lovable SQL editor, or include it in the migration if the UUID is known).
