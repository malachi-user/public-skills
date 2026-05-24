---
name: sumit-payment-lovable
description: Use when adding Sumit (סומיט) credit-card billing / subscriptions to a Lovable project via Redirect Mode — whether from Lovable's own editor/AI or from an external tool (Claude Code, local IDE, GitHub). Covers the subscription_plans + payment_records schema, RLS, the Sumit beginredirect payment flow, the success/IPN finalization logic (Code=000 is NOT always returned in Redirect Mode), and the admin plan manager. Maps the common "Supabase Edge Functions" Sumit recipe onto Lovable's TanStack Start server functions/routes. Triggers on "sumit", "סומיט", "סליקה", "beginredirect", "subscription_plans", "payment_records", "Redirect Mode".
---

# Sumit payment / subscriptions on Lovable (Redirect Mode)

Build a full subscription system on a Lovable project: admin-managed plans, a checkout that redirects to Sumit (סומיט), and automatic access grant after a successful payment.

This skill is **Sumit-specific** and stands on its own — the schema, the Sumit API calls, the Redirect Mode success logic, and the frontend flow are the substance. The only Lovable-specific decision is *where each piece of server code lives*; that's isolated to one table below so you can skip it if you already know the platform.

## Pick your context first

- **Working inside Lovable's own editor / AI** (you already know the platform): you don't need any Lovable background. Just follow the implementation order below and use the placement table as a quick reminder of which Lovable primitive each server piece maps to. Skip the `lovable-project-structure` prerequisite — that's for outside editors.
- **Working from an external tool** (Claude Code, local IDE, GitHub PRs): read `lovable-project-structure` first — it defines the file layout, the three Supabase clients, migrations, secrets, and the sync lifecycle. Without it you'll likely break a Lovable invariant.

Either way, everything assumes the **modern Lovable template** (TanStack Start on Cloudflare Workers).

## Server-code placement: do NOT use Supabase Edge Functions

Most published Sumit guides (and the spec this skill is built from) target **Supabase Edge Functions** (`supabase/functions/...`, Deno, `Deno.serve`). **Lovable's modern template does not use them** — all server logic runs as TanStack Start server functions/routes on Cloudflare Workers. If you scaffold `supabase/functions/`, it will silently do nothing. (If you're in the Lovable editor you already know this; the table is just the mapping.)

Map each "Edge Function action" to its Lovable primitive:

| Sumit spec (Edge Function) | Lovable implementation | Why |
|---|---|---|
| `sumit-config` (return public config) | **Server function** `createServerFn` | Simple typed RPC, no auth needed |
| `sumit-payment` → `create-payment` | **Server function** + `requireSupabaseAuth` middleware | Needs the logged-in user's identity |
| `sumit-payment` → `finalize-by-record` | **Server function** (called from PaymentSuccess page) | Reads/writes our records, runs as user |
| `sumit-payment` → IPN webhook | **Server route** under `src/routes/api/public/` using `supabaseAdmin` | Unauthenticated external call from Sumit; must bypass RLS |
| `sumit-payment` → `get-payment-details` | **Server function** | Typed RPC for the UI |

Rule of thumb: anything **Sumit's servers call back into** (the IPN/webhook) is a **public server route**. Anything **your own React code calls** is a **server function**.

## Implementation order

1. **Migration** — `subscription_plans`, `payment_records`, new `profiles` columns, `user_roles` + `has_role()`, RLS. See [database-schema.md](references/database-schema.md).
2. **Secrets** — add `SUMIT_COMPANY_ID`, `SUMIT_API_KEY`, `SUMIT_PUBLIC_KEY` via the Lovable Cloud Secrets UI (or `add_secret`). Never hardcode. See `lovable-project-structure/references/secrets-and-env.md`.
3. **Server code** — config fn, create-payment fn, finalize-by-record fn, get-payment-details fn, and the public IPN route. See [server-endpoints.md](references/server-endpoints.md).
4. **Frontend** — `Subscribe`, `PaymentSuccess`, `SubscriptionPlansManager` routes + the `useAuth` access logic. See [frontend.md](references/frontend.md).
5. The Sumit API request/response shapes and the Redirect Mode success-detection rules live in [sumit-api.md](references/sumit-api.md).

## Critical gotchas (do not skip)

1. **Redirect Mode does NOT reliably return `Code=000`.** The fact that Sumit sent the browser to your `RedirectURL` (and not `CancelRedirectURL`) is itself the success signal. Detect success as: `Code === '000' || Code === '0'` **OR** the presence of `OG-PaymentID` + `OG-DocumentNumber` in the return params. Never gate access on `Code` alone.
2. **`ExternalIdentifier` format** must be `recordId:userId:planId:durationMonths:isRecurring` so the IPN can recover full context even with no DB lookup.
3. **Webhook record fallback:** if the IPN arrives without a parseable `ExternalIdentifier`, find the record by `provider_reference`. Handle both `application/json` and `application/x-www-form-urlencoded` bodies — Sumit sends either.
4. **`refreshAccess()` needs retry.** There is a lag between the DB write and the next read of `hasActiveSubscription`. PaymentSuccess must poll a few times (e.g. 5× with backoff) and keep the "enter my area" button disabled until access is confirmed.
5. **Prices are stored in ILS** (`DECIMAL(10,2)`), VAT-inclusive (`VATIncluded: true`).
6. **Secrets are read inside the handler**, never at module scope (returns `undefined` in the Worker build). `SUMIT_API_KEY` stays server-side only; only `SUMIT_COMPANY_ID` + `SUMIT_PUBLIC_KEY` may reach the browser.
7. **CORS / webhook URL:** the IPN route is hit by Sumit's servers — use the **stable `project--<id>.lovable.app`** URL (survives renames), not the `id-preview--*` URL. Server routes set their own response headers; add permissive CORS only on the public webhook route if Sumit needs it.
8. **Roles:** admin checks for the plan manager use the `user_roles` table + `has_role(auth.uid(),'admin')` — never a column on `profiles`. (Lovable security invariant.)
9. **Verbose logging** at every step (create → redirect → return → finalize → IPN) — Redirect Mode is hard to debug without it. Log the raw Sumit payloads into `payment_records.provider_payload`.
