# Server code (TanStack Start, not Edge Functions)

All paths are examples — match the project's existing conventions. If you're editing from an external tool and unsure of Lovable's server-code rules, read `lovable-project-structure/SKILL.md` "Server code rules" first; inside the Lovable editor you can skip that and just follow the patterns below.

- Server **functions** (`createServerFn`) = typed RPC your React code calls. File naming `*.functions.ts`. Never under `src/server/`.
- Server **routes** (`createFileRoute` + `server.handlers`) = raw HTTP. The IPN webhook lives at `src/routes/api/public/sumit-webhook.ts` (public, unauthenticated).
- Read `process.env.*` **inside** the handler only.
- Use `supabaseAdmin` (from `src/integrations/supabase/client.server.ts`) only in the webhook route. Use `requireSupabaseAuth` middleware for user-scoped functions.

## Shared Sumit helper — `src/lib/sumit.server.ts`

```ts
// Server-only. Never import from client code.
const SUMIT_BASE = "https://api.sumit.co.il";

export function sumitCredentials() {
  const CompanyID = Number(process.env.SUMIT_COMPANY_ID);
  const APIKey = process.env.SUMIT_API_KEY;
  if (!CompanyID || !APIKey) throw new Error("Sumit credentials not configured");
  return { CompanyID, APIKey };
}

export async function sumitPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUMIT_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  console.log("[sumit]", path, res.status, JSON.stringify(json).slice(0, 2000));
  return json as T;
}
```

## A) Public config — `src/lib/sumit-config.functions.ts`

```ts
import { createServerFn } from "@tanstack/react-start";

export const getSumitConfig = createServerFn({ method: "GET" }).handler(async () => {
  const companyId = process.env.SUMIT_COMPANY_ID;
  const publicKey = process.env.SUMIT_PUBLIC_KEY;
  if (!companyId || !publicKey) throw new Error("Sumit public config missing");
  // Only the COMPANY_ID + PUBLIC_KEY may leave the server. Never return SUMIT_API_KEY.
  return { companyId, publicKey };
});
```

## B) Create payment — `src/lib/sumit-payment.functions.ts`

```ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sumitCredentials, sumitPost } from "@/lib/sumit.server";

type CreateInput = {
  planId: string; planName: string; planPrice: number;
  planDescription?: string; durationMonths: number; isRecurring: boolean;
  origin: string; // window.location.origin, passed from the client
};

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: CreateInput) => d)
  .handler(async ({ data, context }) => {
    const user = context.user;            // from requireSupabaseAuth
    const email = user.email!;
    const name = user.user_metadata?.full_name ?? email;

    // 1. create our pending record (service role: server-trusted write)
    const { data: rec, error } = await supabaseAdmin
      .from("payment_records")
      .insert({ user_id: user.id, plan_id: data.planId, amount: data.planPrice, status: "pending" })
      .select("id").single();
    if (error || !rec) throw new Error(`record insert failed: ${error?.message}`);
    const recordId = rec.id;

    // 2. build the Sumit beginredirect request
    const supabaseUrl = process.env.SUPABASE_URL!; // only used if you route IPN there; prefer the stable lovable URL — see note
    const ipnUrl = `${data.origin}/api/public/sumit-webhook`;
    const externalId = `${recordId}:${user.id}:${data.planId}:${data.durationMonths}:${data.isRecurring}`;

    const payload = {
      Credentials: sumitCredentials(),
      ResponseLanguage: "he",
      Customer: { Name: name, EmailAddress: email },
      Items: [{
        Item: { Name: data.planName, Description: data.planDescription ?? data.planName },
        Quantity: 1, UnitPrice: data.planPrice,
      }],
      VATIncluded: true,
      RedirectURL: `${data.origin}/payment-success?record=${recordId}`,
      CancelRedirectURL: `${data.origin}/subscribe`,
      IPNURL: ipnUrl,
      ExternalIdentifier: externalId,
    };

    const resp = await sumitPost<any>("/billing/payments/beginredirect/", payload);
    const redirectUrl = resp?.Data?.RedirectURL ?? resp?.RedirectURL;
    if (!redirectUrl) {
      await supabaseAdmin.from("payment_records")
        .update({ status: "failed", failure_reason: "no redirect url", provider_payload: resp })
        .eq("id", recordId);
      throw new Error("Sumit did not return a redirect URL");
    }
    await supabaseAdmin.from("payment_records")
      .update({ provider_payload: { begin: resp } }).eq("id", recordId);

    return { success: true, redirectUrl, recordId };
  });
```

> **IPN URL note:** Sumit's servers must reach the IPN. `window.location.origin` works on the production/preview Lovable URL, but to survive renames use the **stable** `project--<id>.lovable.app` origin. If you can't pass a stable origin from the client, hardcode the stable base in an env var (e.g. `PUBLIC_SITE_URL`) and read it server-side.

## C) Finalize by record — same file

Called from `PaymentSuccess.tsx` with everything the redirect returned.

```ts
type FinalizeInput = {
  recordId: string;
  providerReferenceOverride?: string;     // OG-PaymentID
  codeFromRedirect?: string;              // Code, if present
  returnParams: Record<string, string>;   // every query param from the redirect
};

export const finalizeByRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: FinalizeInput) => d)
  .handler(async ({ data, context }) => {
    const p = data.returnParams ?? {};
    const code = (data.codeFromRedirect ?? p.Code ?? p.code ?? "").trim();
    const paymentId = data.providerReferenceOverride
      ?? p["OG-PaymentID"] ?? p["og-paymentid"] ?? p.PaymentID;
    const documentNumber = p["OG-DocumentNumber"] ?? p["og-documentnumber"];

    // Redirect Mode success detection (see sumit-api.md)
    const hasSuccessCode = code === "000" || code === "0";
    const isImmediateSuccess = hasSuccessCode || (!!paymentId && !!documentNumber) || (!!paymentId && !!data.recordId);

    const { data: rec } = await supabaseAdmin
      .from("payment_records").select("*").eq("id", data.recordId).single();
    if (!rec) throw new Error("record not found");
    if (rec.user_id !== context.user.id) throw new Error("not your record");
    if (rec.status === "completed") return { success: true, alreadyDone: true };

    if (!isImmediateSuccess) {
      await supabaseAdmin.from("payment_records")
        .update({ status: "failed", failure_reason: `no success signal (code=${code})`, provider_payload: { ...(rec.provider_payload ?? {}), finalize: p } })
        .eq("id", data.recordId);
      return { success: false };
    }

    // Activate subscription
    await activateSubscription(rec.user_id, rec.plan_id);
    await supabaseAdmin.from("payment_records").update({
      status: "completed",
      provider_reference: paymentId ?? rec.provider_reference,
      completed_at: new Date().toISOString(),
      provider_payload: { ...(rec.provider_payload ?? {}), finalize: p },
    }).eq("id", data.recordId);

    return { success: true, paymentId, documentNumber };
  });
```

Shared activation helper (in the same server file):

```ts
async function activateSubscription(userId: string, planId: string | null) {
  let endDate: string | null = null;
  if (planId) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans").select("duration_months,is_recurring").eq("id", planId).single();
    if (plan && !plan.is_recurring) {
      const d = new Date(); d.setMonth(d.getMonth() + (plan.duration_months ?? 1));
      endDate = d.toISOString();
    }
  }
  await supabaseAdmin.from("profiles").update({
    subscription_status: "active",
    subscription_end_date: endDate, // null when recurring
  }).eq("id", userId);
}
```

## D) Get payment details — same file (for the UI)

```ts
export const getPaymentDetails = createServerFn({ method: "POST" })
  .validator((d: { paymentId: string }) => d)
  .handler(async ({ data }) => {
    const resp = await sumitPost<any>("/creditguy/gateway/gettransaction", {
      Credentials: sumitCredentials(),
      TransactionID: data.paymentId,
    });
    const t = resp?.Data ?? resp;
    return {
      authNumber: t?.AuthNumber ?? null,
      amount: t?.Amount ?? null,
      cardPattern: t?.CardPattern ?? t?.LastDigits ?? null,
    };
  });
```

## E) IPN webhook — `src/routes/api/public/sumit-webhook.ts` (server ROUTE)

Sumit's servers POST here. No user JWT → use `supabaseAdmin`. Accept JSON **and** form-urlencoded. Always return 200 quickly so Sumit doesn't retry-storm; do the work, then ack.

```ts
import { createFileRoute } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sumitCredentials, sumitPost } from "@/lib/sumit.server";

export const Route = createFileRoute("/api/public/sumit-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ct = request.headers.get("content-type") ?? "";
        let params: Record<string, string> = {};
        if (ct.includes("application/json")) {
          params = await request.json().catch(() => ({}));
        } else {
          const form = await request.formData();
          form.forEach((v, k) => { params[k] = String(v); });
        }
        console.log("[sumit-webhook] body", JSON.stringify(params).slice(0, 2000));

        // 1. recover context from ExternalIdentifier: recordId:userId:planId:durationMonths:isRecurring
        const ext = params.ExternalIdentifier ?? params.externalidentifier ?? "";
        const [recordId, userId, planId] = ext.split(":");
        const paymentId = params["OG-PaymentID"] ?? params["og-paymentid"] ?? params.PaymentID;

        // 2. find the record (fallback to provider_reference if no ExternalIdentifier)
        let rec = null as any;
        if (recordId) {
          ({ data: rec } = await supabaseAdmin.from("payment_records").select("*").eq("id", recordId).single());
        }
        if (!rec && paymentId) {
          ({ data: rec } = await supabaseAdmin.from("payment_records").select("*").eq("provider_reference", paymentId).single());
        }
        if (!rec) { console.warn("[sumit-webhook] no matching record"); return jsonOk(); }
        if (rec.status === "completed") return jsonOk();

        // 3. VERIFY against Sumit before activating (webhook path is server-to-server, so we can verify)
        let verified = false;
        if (paymentId) {
          const tx = await sumitPost<any>("/creditguy/gateway/gettransaction", {
            Credentials: sumitCredentials(), TransactionID: paymentId,
          });
          const status = (tx?.Data?.Status ?? tx?.Status ?? "").toString().toLowerCase();
          verified = !!(tx?.Data?.AuthNumber) || status.includes("success") || status === "approved";
        }

        if (!verified) {
          await supabaseAdmin.from("payment_records").update({
            status: "verification_failed",
            provider_payload: { ...(rec.provider_payload ?? {}), ipn: params },
          }).eq("id", rec.id);
          return jsonOk();
        }

        // 4. activate
        await activateFromWebhook(rec.user_id ?? userId, rec.plan_id ?? planId);
        await supabaseAdmin.from("payment_records").update({
          status: "completed",
          provider_reference: paymentId ?? rec.provider_reference,
          completed_at: new Date().toISOString(),
          provider_payload: { ...(rec.provider_payload ?? {}), ipn: params },
        }).eq("id", rec.id);

        return jsonOk();
      },
    },
  },
});

function jsonOk() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

async function activateFromWebhook(userId?: string, planId?: string) {
  if (!userId) return;
  let endDate: string | null = null;
  if (planId) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans").select("duration_months,is_recurring").eq("id", planId).single();
    if (plan && !plan.is_recurring) {
      const d = new Date(); d.setMonth(d.getMonth() + (plan.duration_months ?? 1));
      endDate = d.toISOString();
    }
  }
  await supabaseAdmin.from("profiles")
    .update({ subscription_status: "active", subscription_end_date: endDate })
    .eq("id", userId);
}
```

**Why both finalize-by-record AND the webhook activate?** Redirect Mode returns the user to your page (fast path → `finalizeByRecord`), and Sumit independently fires the IPN (reliable server path → webhook). Either may arrive first; both are idempotent (they no-op when `status === 'completed'`). Keep both — the redirect can be lost (user closes tab) and the IPN can be delayed.
