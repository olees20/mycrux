# ADR 006: Use Stripe only for gym-to-platform subscriptions

- Status: Accepted
- Date: 2026-07-17

## Context

Crux has two fundamentally different payment domains: gyms paying for the software, and members or guests paying a gym for memberships, classes, retail, or day passes. Combining them changes merchant-of-record, tax, payout, dispute, and compliance obligations.

## Decision

Use the platform's Stripe account for B2B SaaS subscriptions where a gym pays Crux. Checkout creates a subscription, Customer Portal manages it, and signed webhooks update local billing and entitlement projections. Prices are selected from server configuration, never accepted from a client. Webhook processing is idempotent and Stripe remains authoritative for subscription state.

Crux does **not** process gym member or day-pass payments in this scope. Passes may represent access rights, but no platform Stripe charge funds them. A future gym-payments integration must use a separate architecture and ADR, likely with each gym controlling its merchant relationship and funds flow.

## Consequences and trade-offs

- The initial billing boundary is simple: one Stripe customer per gym organization and no member funds flowing through Crux.
- Entitlements can lag webhooks briefly, requiring idempotency and reconciliation.
- The product cannot initially sell gym memberships or day passes online.
- Billing data and climbing/member data remain logically separated and access-controlled.

## Alternatives considered

- Stripe Connect at launch: supports gym commerce but adds onboarding, KYC, payouts, tax, refunds, and support complexity.
- Put all charges through the platform account: rejected because it conflates merchants and liabilities.
- Manual invoicing only: simple initially but prevents automated entitlement management.

## Deferred decisions

Stripe Connect, point-of-sale integrations, membership billing, day-pass charging, tax automation, coupons, usage billing, and multi-currency pricing are deferred.
