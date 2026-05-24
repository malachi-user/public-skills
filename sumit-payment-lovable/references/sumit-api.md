# Sumit (סומיט) API — Redirect Mode reference

Base URL: `https://api.sumit.co.il`. All calls are `POST` with a JSON body that includes a `Credentials` object.

## Credentials object

```json
{ "Credentials": { "CompanyID": 12345, "APIKey": "secret-server-key" } }
```

- `CompanyID` — numeric, from `SUMIT_COMPANY_ID`.
- `APIKey` — secret, from `SUMIT_API_KEY`. **Server-side only.** Never ship to the browser.
- `SUMIT_PUBLIC_KEY` — used only for client-side transaction detail display; safe to expose via `sumit-config`.

## 1. Begin redirect payment — `/billing/payments/beginredirect/`

Creates a hosted payment page and returns a URL to send the customer to.

Request:
```json
{
  "Credentials": { "CompanyID": 12345, "APIKey": "..." },
  "ResponseLanguage": "he",
  "Customer": { "Name": "ישראל ישראלי", "EmailAddress": "user@example.com" },
  "Items": [{
    "Item": { "Name": "מנוי חודשי", "Description": "גישה מלאה" },
    "Quantity": 1,
    "UnitPrice": 49.90
  }],
  "VATIncluded": true,
  "RedirectURL": "https://app.example.com/payment-success?record=<recordId>",
  "CancelRedirectURL": "https://app.example.com/subscribe",
  "IPNURL": "https://project--<id>.lovable.app/api/public/sumit-webhook",
  "ExternalIdentifier": "<recordId>:<userId>:<planId>:<durationMonths>:<isRecurring>"
}
```

Response (shape can vary; handle both nesting levels):
```json
{ "Status": 0, "Data": { "RedirectURL": "https://pay.sumit.co.il/..." } }
```
Read `resp.Data.RedirectURL ?? resp.RedirectURL`. Send the browser there.

## 2. Get transaction — `/creditguy/gateway/gettransaction`

Used by the webhook (to verify) and by `get-payment-details` (to display).

Request:
```json
{ "Credentials": { "CompanyID": 12345, "APIKey": "..." }, "TransactionID": "<OG-PaymentID>" }
```
Response of interest: `AuthNumber`, `Amount`, `CardPattern`/`LastDigits`, `Status`. Treat presence of `AuthNumber` (or a success-like `Status`) as verified.

## Redirect Mode success detection — the critical rule

In Redirect Mode, Sumit sends the customer back to `RedirectURL` with query params, but **`Code=000` is not guaranteed**. The reliable signals, in priority order:

1. The browser landed on `RedirectURL` (success page) and **not** `CancelRedirectURL`. That alone is a strong positive.
2. `Code === '000'` or `Code === '0'` when present.
3. Presence of `OG-PaymentID` **and** `OG-DocumentNumber` in the return params.

Combined rule used throughout this skill:
```js
const hasSuccessCode = code === '000' || code === '0';
const isImmediateSuccess = hasSuccessCode || (providerPaymentId && recordId);
```
Use `OG-PaymentID + OG-DocumentNumber` as the stronger confirmation when available. **Never** fail a payment solely because `Code` is missing.

## Return parameters on `RedirectURL`

Names arrive in mixed casing — always check both:

| Param | Meaning |
|---|---|
| `record` | your `payment_records.id` (you put it in the URL) |
| `OG-PaymentID` / `og-paymentid` | Sumit payment id → store as `provider_reference` |
| `OG-DocumentNumber` / `og-documentnumber` | receipt/document number |
| `Code` / `code` | result code — **may be absent in Redirect Mode** |
| `AuthNumber` | authorization number |

## ExternalIdentifier

Always set it to `recordId:userId:planId:durationMonths:isRecurring`. It survives back into both the redirect and the IPN, so the webhook can fully reconstruct context without a DB join. If the IPN ever arrives without it, fall back to matching `payment_records.provider_reference = OG-PaymentID`.

## IPN / webhook

- Sumit POSTs to `IPNURL` server-to-server after the payment. Body may be `application/json` **or** `application/x-www-form-urlencoded` — parse both.
- Use the **stable** `project--<id>.lovable.app` URL for `IPNURL` so it survives project renames (the `id-preview--*` URL is not stable for external callers).
- The webhook should verify via `gettransaction` before activating, then write `status='completed'`. Respond `200` quickly and make it idempotent.

## VAT & currency

- `VATIncluded: true` — prices already include VAT.
- Amounts are in ILS (₪). Store as `decimal(10,2)`.
