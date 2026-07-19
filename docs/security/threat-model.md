# Threat model

This is a pragmatic engineering threat model for the Crux application, not a formal certification or penetration-test report. It should be revisited when trust boundaries, integrations, or sensitive data change.

## Assets and trust boundaries

The primary assets are member identities and privacy choices, gym tenancy data, staff capabilities, waivers and signatures, check-in and ascent history, audit records, subscription state, integration credentials, and uploaded media. Browser input, uploaded files, webhook payloads, QR references, URL parameters, and integration data are untrusted. Supabase Auth establishes identity; PostgreSQL RLS and capability functions establish tenant authority; service-role access is restricted to server-only adapters; Stripe remains authoritative for payment state.

## Threat actors and controls

| Actor | Likely objectives | Principal controls |
| --- | --- | --- |
| Platform administrator | Accidental or malicious cross-tenant access; destructive suspension; collection of unnecessary personal data | Explicit platform-admin allow-list, server-side checks, read-only support view, reason-required operations, append-only audit trail, no tenant impersonation |
| Gym owner or staff | Escalate capability, inspect another gym, alter scores/bookings, exfiltrate member data | Gym-scoped composite relationships, capability checks in server code and SQL, RLS, transactional RPCs, scoped exports, audit events |
| Member | Read another member's private activity, forge bookings/check-ins, bypass waiver or eligibility | `auth.uid()` ownership policies, visibility rules, active-membership checks, transactional RPC validation, short-lived hashed check-in tokens |
| Guest or unauthenticated user | Enumerate accounts, brute-force auth, reuse guest links, upload hostile content | Generic auth responses, authentication throttles, 256-bit random guest/token material stored as hashes, expiry and single-purpose validation, centralized upload validation |
| Malicious tenant | Cross-tenant IDOR, guessed UUID use, storage-path confusion, aggregate inference | RLS on tenant tables, gym ID included in object/RPC checks, two-gym isolation tests, server-side gym context, permission-aware search |
| Compromised integration | Replay or forge webhooks, send oversized/malformed payloads, poison logs | HMAC or Stripe signature verification over raw bodies, constant-time comparison, event idempotency, payload-size/schema checks, disabled-adapter fail-closed behavior, log redaction |

## Abuse cases reviewed

- Authentication and session refresh use Supabase's server client and validated users rather than trusting browser claims. Protected routes are guarded in the proxy and sensitive operations re-authorize on the server.
- Next.js Server Actions provide same-origin protections for form mutations. Webhooks and scheduled jobs do not rely on cookies and instead require cryptographic secrets. No state-changing public form route bypasses server authorization.
- React text rendering is used throughout; there is no HTML injection or rich-text rendering surface. If Markdown or HTML is added, it must use an allow-list sanitizer and receive dedicated XSS tests.
- User-provided redirect destinations pass through the local-path allow-list. Provider-created Stripe URLs are accepted only from the authenticated server-side Stripe SDK.
- SQL is parameterized through Supabase queries and RPCs. Security-definer routines set an empty `search_path`, qualify objects, and check actor and tenant context. RLS integration tests exercise two tenants.
- Media processing checks declared type, extension, file signature, decoded image dimensions and pixel count, then re-encodes images to strip metadata. Database storage-path and quota controls provide a second boundary.
- Guest preregistration, member check-in, and QR references use cryptographically secure random bytes. Sensitive references are hashed at rest and time-bounded where appropriate.

## Security assumptions

- The deployment platform overwrites `x-forwarded-for`/`x-real-ip`; clients cannot choose the effective source address.
- Supabase JWT signing keys, service-role credentials, Stripe secrets, webhook secrets, and cron secrets are stored in the deployment secret manager and rotated after suspected disclosure.
- Production traffic is HTTPS-only. Database migrations and RLS tests run before release.
- Provider dashboards restrict webhook destinations and Stripe live/test credentials are not mixed.
