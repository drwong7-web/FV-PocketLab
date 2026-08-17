# Creem billing setup

PocketLab uses Creem as Merchant of Record for **Pro monthly**, **Pro yearly**, and **Lifetime** (one-time). The Vite app never sees the Creem API key. Checkout and the customer portal are created by Supabase Edge Functions; entitlements are applied only by the signed webhook.

## 1. Products (test mode first)

In the [Creem dashboard](https://creem.io/dashboard), turn **Test Mode** on (sidebar toggle). Create three products:

| PocketLab plan | Billing | Tax category |
| --- | --- | --- |
| Pro monthly | Recurring, every month | `saas` |
| Pro yearly | Recurring, every year | `saas` |
| Lifetime | One-time | `saas` |

Copy the three `prod_…` IDs.

Test card for a successful payment: `4111 1111 1111 1111` (any future expiry, any CVC).

## 2. Secrets (never put these in `VITE_*`)

```bash
npx supabase secrets set CREEM_API_KEY=creem_test_...
npx supabase secrets set CREEM_WEBHOOK_SECRET=whsec_...
npx supabase secrets set CREEM_PRODUCT_PRO_MONTHLY=prod_...
npx supabase secrets set CREEM_PRODUCT_PRO_YEARLY=prod_...
npx supabase secrets set CREEM_PRODUCT_LIFETIME=prod_...
npx supabase secrets set CREEM_TEST_MODE=true
```

The API key is under [Dashboard → API Keys](https://creem.io/dashboard/api-keys). The webhook secret appears after you add the endpoint in step 4.

## 3. Deploy

```bash
npx supabase db push --linked
npx supabase functions deploy creem-checkout creem-portal creem-webhook --project-ref hmeosususvxesdojjtro
```

Webhook JWT verification is off (`verify_jwt = false` in `config.toml`). Checkout and portal still require a signed-in user.

## 4. Register the webhook

Dashboard → Developers → Webhook. Endpoint:

```
https://hmeosususvxesdojjtro.supabase.co/functions/v1/creem-webhook
```

Subscribe at least to:

- `checkout.completed`
- `subscription.paid`
- `subscription.trialing`
- `subscription.active`
- `subscription.scheduled_cancel`
- `subscription.past_due`
- `subscription.expired`
- `subscription.paused`
- `subscription.canceled`
- `refund.created`
- `dispute.created`

Then copy the signing secret into `CREEM_WEBHOOK_SECRET` if you have not already.

## 5. Smoke test

1. Sign in on `https://localhost:8081`.
2. Settings → **Upgrade to Pro monthly**.
3. Pay with the test card.
4. You return to `/app?billing=success`. After the webhook, **Refresh** should show Pro monthly.
5. Settings → **Manage billing** opens the Creem customer portal.

A lifetime purchase must not be undone by a later monthly or yearly cancel. A lifetime refund/dispute is the only path that returns that account to Free.

Switching monthly ↔ yearly is a new checkout (no proration).

## Going live

1. Complete KYC/KYB under Dashboard → Balances → Payout Account.
2. Create the same three products in **live** mode (IDs are different from test).
3. `npx supabase secrets set` the live `creem_…` key, live product IDs, live webhook secret, and `CREEM_TEST_MODE=false`.
4. Point the live webhook at the same Edge Function URL.
5. Add the production origin to Creem success URLs if the dashboard requires an allow-list.

Do not paste API keys into chat. Test mode first.
