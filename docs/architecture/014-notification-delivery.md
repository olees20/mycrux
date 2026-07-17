# ADR 014: Persist in-app notifications and defer external delivery

- Status: Accepted
- Date: 2026-07-17

## Context

Announcements, event changes, and invitation actions need reliable user-visible delivery. Email and push vendors are not yet selected, and scheduled announcements must become current without relying on a staff browser remaining open.

## Decision

PostgreSQL is the durable in-app notification source. Security-definer triggers fan out audience-scoped rows to active memberships in the same transaction as immediate announcement publication, event changes, and invitation lifecycle changes. Source/category uniqueness makes announcement and initial event delivery idempotent. Preferences are evaluated during fan-out; notification rows remain private to their recipient under RLS.

Future announcements are selected by time rather than prematurely exposed. A service-only idempotent processor handles due fan-out every five minutes through `/api/jobs/due-announcements`; Vercel authenticates it with `CRON_SECRET`. Expiry is enforced by both RLS and application queries. The `NotificationDeliveryProvider` interface is the extension boundary for queued email/push delivery; the current external provider deliberately accepts nothing and the UI labels those channels as future delivery.

## Consequences and trade-offs

- In-app delivery does not depend on an external vendor.
- Scheduled notifications may arrive up to five minutes after publication while content itself becomes visible on time.
- Database fan-out is simple and transactional for the initial scale; large tenants may later require an outbox worker.
- Quiet hours are stored now but apply to future external delivery, not durable in-app rows.
