# Stripe test-mode setup

Crux uses Stripe only for a gym buying the SaaS platform. It does not create charges for climbers, memberships, events or day passes.

1. In Stripe test mode, create a recurring product and price for the initial platform plan. Set `STRIPE_PLATFORM_PRICE_ID=price_…` to that server-side price ID.
2. Set `STRIPE_SECRET_KEY=sk_test_…` and `STRIPE_WEBHOOK_SECRET=whsec_…`. Never expose them as `NEXT_PUBLIC_` variables.
3. Enable Stripe Customer Portal configuration in test mode.
4. Forward events locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then use the printed signing secret.
5. Sign in as a gym owner, open `/g/{gymSlug}/staff/billing`, start Checkout, and use Stripe’s test card `4242 4242 4242 4242` with any future expiry/CVC.
6. Confirm `customer.subscription.created`, `updated`, and `deleted` reach the webhook. Re-sending the same `evt_…` must not create another event or projection update.

Checkout selects the price from server configuration, attaches `crux_gym_id` and `billing_scope=platform_saas` metadata, and maps the Stripe Customer to the gym. The webhook verifies the raw-body signature before parsing and stores only a tenant-scoped projection. Use `npm test` for the signed/tampered fixture and `supabase/tests/stripe_gym_subscriptions.sql` for duplicate-event and tenant checks.
