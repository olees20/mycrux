# Production observability

This design provides diagnosable application behavior without placing private content in telemetry. It is an operational baseline, not a substitute for managed uptime monitoring or a production error provider.

## Structured events and correlation

The proxy validates or creates `x-request-id`, forwards it to server code, and returns it to the caller. Route handlers use the same value as `correlationId` in JSON logs. Search logs by that exact identifier when a user supplies a response header or support reference. The logger recursively redacts credential-shaped fields and values and truncates oversized strings.

Never log waiver signatures, private messages, integration/webhook payloads, payment objects, authorization headers, cookies, QR references, email addresses, or uploaded file bodies. Allowed webhook context is limited to provider, provider event ID/type, internal delivery ID, outcome, attempt/count state, and duration.

`errorReporter` is a provider boundary. Its default provider writes the same redacted structured event. Connect a managed provider by supplying an `ErrorReportingProvider` at the server composition boundary; preserve correlation IDs and the same data-minimization rules.

## Endpoints

| Endpoint | Access | Purpose | Expected response |
| --- | --- | --- | --- |
| `GET /api/health/live` | Public | Confirms the web process can answer | `200`, `status: ok` |
| `GET /api/health/ready` | Public/platform probe | Times a minimal Supabase query | `200 ready` or `503 unavailable` |
| `GET /api/operations/integrations` | `Authorization: Bearer $CRON_SECRET` | Queue, retry, dead-letter and oldest-backlog visibility | `200 ok/degraded`, `401`, or `503` |

Health responses are `no-store`, expose no credentials, tenant identifiers, or database errors, and return the correlation ID. Protect operations endpoints in the hosting firewall as an additional layer.

## Suggested alert signals

- Page immediately when 5xx responses exceed 5% for five minutes with at least 50 requests, readiness fails for three consecutive probes, or migration checks fail during release.
- Page when any integration dead-letter item appears or the oldest pending/retry delivery exceeds 15 minutes.
- Warn when authentication failures exceed 100 per source network or 500 globally in 10 minutes; page only when coupled with successful-login anomalies or provider degradation.
- Warn when upload/storage failures exceed 2% for 10 minutes; page at 10% or when all uploads fail.
- Warn when scheduled-job failures occur twice consecutively; page after five failures or when due work is more than 15 minutes late.

Tune thresholds using production baselines, expected traffic, and provider quotas. Alert on sustained user impact, not isolated invalid requests.
