# Incident runbooks

Start every incident by recording the UTC start time, environment, deployment SHA, affected tenant scope, and one `x-request-id`. Preserve evidence and avoid copying credentials or private payloads into tickets or chat.

## Elevated authentication failures

1. Check Supabase Auth status, recent deploys, and `registration_failed`/login rate-limit patterns by correlation ID and source aggregate.
2. If abusive, tighten edge/WAF limits and block the narrowest offending network; do not disable authentication globally.
3. If legitimate users are affected, pause the latest auth deployment or forward-fix configuration, publish a status update, and keep generic enumeration-safe responses.
4. Rotate Auth/service-role credentials only if disclosure is suspected; revoke sessions if signing material may be compromised.

## Webhook backlog or dead letters

1. Call the authenticated integration-status endpoint and note pending, retry, dead-letter, and oldest age. Check Stripe/provider status.
2. Stop or reduce outbound processing if a dependency is failing; continue verified ingestion so events remain durable.
3. Fix credentials/configuration, then replay by immutable provider event/idempotency key. Never edit payloads or bypass signature verification.
4. Confirm counts drain, connection error state clears, and audit events show idempotent processing. Escalate before provider retention/replay windows expire.

## Failed database migration

1. Block the release and prevent newer application code from receiving traffic. Do not rerun destructive statements blindly.
2. Capture the exact migration, PostgreSQL error, and database migration state without credentials or row data.
3. Prefer a reviewed forward-fix migration. Restore from a verified backup only when forward repair cannot preserve correctness.
4. Run the full migration/RLS suite against a disposable database, apply in staging, then production. Verify readiness and two-tenant isolation before resuming rollout.

## Storage or media-processing errors

1. Check Supabase Storage availability, bucket policy deployment, quota metrics, and `media_processing_failed`/upload errors.
2. Disable only the affected upload UI or feature flag if failures are corrupting data; keep existing media reads available.
3. Do not relax MIME, signature, path, pixel, quota, or RLS controls as a workaround. Quarantine uncertain objects.
4. After recovery, retry from the original client file where possible and verify metadata rows do not reference missing objects.

## Elevated 5xx or failed readiness

1. Compare liveness and readiness. If liveness fails, roll traffic to healthy instances; if only readiness fails, inspect Supabase/network health and database query timing.
2. Group structured errors by event, deployment SHA, route, and correlation ID. Check the latest deploy and environment-variable changes.
3. Roll back application code when schema-compatible; otherwise deploy a forward fix. Never point production at preview databases or credentials.
4. Verify three successful readiness probes, error rate recovery, core auth/member/staff journeys, and webhook ingestion before resolving.

After mitigation, document impact, timeline, root cause, data-integrity checks, follow-up owner, and alert/test improvements.
