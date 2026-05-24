# Frontend (TanStack Start routes + useAuth)

Routes are file-based under `src/routes/` with **flat dot naming** (`payment-success.tsx`, `subscribe.tsx`, `admin.plans.tsx`) — never `src/pages/`, never `[param]` folders. Use shadcn/ui components already in `src/components/ui/`. Call server functions by importing them and invoking via TanStack Query mutations/queries.

## `useAuth` — access logic

Extend the project's existing auth provider (don't create a parallel one). Add `hasActiveSubscription` and a `refreshAccess()` that re-reads the profile.

```ts
// inside the auth context value
const ACTIVE_STATUSES = ["active", "paid", "completed", "success", "approved", "subscribed"];

function computeHasActiveSubscription(profile: Profile | null): boolean {
  if (!profile) return false;
  if (ACTIVE_STATUSES.includes((profile.subscription_status ?? "").toLowerCase())) return true;
  if (profile.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) return true;
  return false;
}

// refreshAccess: re-fetch the profile row and recompute. Returns the fresh flag.
async function refreshAccess(): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_end_date")
    .eq("id", userId).single();
  setProfile((p) => ({ ...p, ...data }));
  return computeHasActiveSubscription(data as Profile);
}
```

Expose `{ user, profile, hasActiveSubscription, refreshAccess, isAdmin }` from the context. `isAdmin` comes from a `user_roles` read (`role === 'admin'`), not from `profiles`.

## `subscribe.tsx` — choose plan & sign up

- Load active plans: `supabase.from("subscription_plans").select("*").eq("is_active", true).order("display_order")`.
- If the user is logged in **and** `hasActiveSubscription` (or `isAdmin`) → show "you already have access" with a link to the personal area.
- If not logged in → show a signup/login form (collect `privacy_accepted`, optional `marketing_consent`) alongside plan selection.
- On submit (after auth): call `createPayment` and redirect the browser to Sumit.

```ts
const onChoose = async (plan: Plan) => {
  const { redirectUrl } = await createPayment({ data: {
    planId: plan.id, planName: plan.name, planDescription: plan.description,
    planPrice: Number(plan.price), durationMonths: plan.duration_months,
    isRecurring: plan.is_recurring, origin: window.location.origin,
  }});
  window.location.href = redirectUrl; // leave the SPA → Sumit hosted page
};
```

## `payment-success.tsx` — return from Sumit

This is the `RedirectURL` target. Read **all** query params, finalize, then poll `refreshAccess` before enabling the CTA.

```tsx
export const Route = createFileRoute("/payment-success")({ component: PaymentSuccess });

function PaymentSuccess() {
  const search = Route.useSearch() as Record<string, string>;
  const { refreshAccess } = useAuth();
  const [state, setState] = useState<"working" | "ok" | "fail">("working");
  const [accessReady, setAccessReady] = useState(false);
  const [txInfo, setTxInfo] = useState<{ paymentId?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const recordId = search.record;
      const code = search.Code ?? search.code;
      const paymentId = search["OG-PaymentID"] ?? search["og-paymentid"];

      // Mirror the server rule so we can show the right message immediately.
      const hasSuccessCode = code === "000" || code === "0";
      const isImmediateSuccess = hasSuccessCode || (!!paymentId && !!recordId);
      if (!recordId || !isImmediateSuccess) { setState("fail"); return; }

      const res = await finalizeByRecord({ data: {
        recordId, providerReferenceOverride: paymentId,
        codeFromRedirect: code, returnParams: search,
      }});
      if (!res.success) { setState("fail"); return; }
      setTxInfo({ paymentId: res.paymentId });
      setState("ok");

      // refreshAccess with retry — DB write may lag the next read
      for (let i = 0; i < 5; i++) {
        if (await refreshAccess()) { setAccessReady(true); break; }
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    })();
  }, []);

  if (state === "working") return <p>מאמת את התשלום…</p>;
  if (state === "fail") return <p>התשלום לא הושלם. נסו שוב או פנו לתמיכה.</p>;
  return (
    <div>
      <h1>התשלום הצליח 🎉</h1>
      {txInfo?.paymentId && <p>מספר עסקה: {txInfo.paymentId}</p>}
      <Button disabled={!accessReady} onClick={() => navigate("/dashboard")}>
        {accessReady ? "כניסה לאזור האישי" : "מפעיל גישה…"}
      </Button>
    </div>
  );
}
```

Key points:
- The CTA stays **disabled** until `accessReady` (a confirmed `hasActiveSubscription`), so the user never lands in the gated area before the flag flips.
- Detect success client-side with the same `Code==='000'||'0'` OR `paymentId+record` rule — but the **server** is authoritative; the page only mirrors it for UX.

## `admin.plans.tsx` — plan manager (admin only)

- Guard: if `!isAdmin`, redirect or render "unauthorized". RLS already blocks writes, but guard the UI too.
- Full CRUD on `subscription_plans` via the browser `supabase` client (admin RLS allows it): name, description, `price`, `duration_months`, `is_recurring`, `is_active`, `display_order`.
- Use shadcn `Dialog` + `Form` for create/edit, a table/list for display ordered by `display_order`.

```ts
// create
await supabase.from("subscription_plans").insert({
  name, description, price, duration_months, is_recurring, is_active, display_order,
});
// update
await supabase.from("subscription_plans").update({ ...fields }).eq("id", planId);
// delete
await supabase.from("subscription_plans").delete().eq("id", planId);
```

## Reminders

- All money displayed in ILS (₪). The DB stores `decimal(10,2)`; format on display.
- Don't mention "Supabase" in user-facing Hebrew/English copy — it's "Lovable Cloud".
- **Deploy (external editors only):** after pushing, the preview rebuilds automatically; the user must click **Publish → Update** for frontend changes to hit the production URL. Backend (migration, server fns, webhook route, secrets) deploys on push. Inside the Lovable editor this is handled by the normal publish flow — ignore this note.
