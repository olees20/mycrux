# Security review and residual risks

Reviewed 18 July 2026. This is a repository-level review, not a claim of compliance, certification, or a substitute for an independent penetration test.

## Implemented controls

- Added a site-wide Content Security Policy, clickjacking protection, MIME-sniffing protection, a restrictive permissions policy, referrer policy, and production HSTS.
- Added fixed-window authentication throttles for login, registration, and password-reset requests. Keys combine action, source address, and normalized email and are SHA-256 hashed before storage. Responses remain generic to resist account enumeration.
- Expanded structured-log redaction to cover credentials, sessions, signatures, bearer values, JWT-shaped values, sensitive URL query parameters, nested data, and oversized strings.
- Confirmed local-only redirect validation, webhook raw-body signature verification, request size limits, cryptographically secure QR and guest-access tokens, centralized media validation, server-only privileged clients, and tenant-scoped RLS/RPC authorization.
- Confirmed there is no rich-text or raw-HTML rendering surface. React escaping is the current XSS boundary for user-authored text.

## Prioritized residual risks

1. **Medium — distributed auth throttling.** The limiter is process-local, so limits are not globally consistent across serverless instances and disappear on restart. Put auth endpoints behind an edge/WAF rate limit or replace the store with a shared atomic provider before a high-volume public launch. Supabase Auth provider limits remain an additional boundary.
2. **Medium — upstream PostCSS advisory.** `npm audit --omit=dev` reports GHSA-qx2v-qp2m-jg93 in the PostCSS version nested inside Next.js 16.2.10. The application does not accept or stringify attacker-controlled CSS, which reduces exposure. npm currently proposes an invalid Next.js downgrade; monitor the Next.js release line and upgrade when its dependency is patched.
3. **Medium — CSP still permits inline scripts and styles.** Next.js requires inline bootstrapping and the current UI uses inline-compatible styling. Move to nonce-based CSP when framework/deployment support is introduced. CSP is defense in depth; output encoding remains required.
4. **Medium — proxy IP trust.** Application throttling assumes the production reverse proxy overwrites forwarding headers. Lock this down at the platform edge and test after deployment.
5. **Medium — privileged credential blast radius.** A leaked Supabase service-role key bypasses RLS. Keep it server-only, scope production access operationally, rotate it, and alert on unusual privileged operations.
6. **Low — video inspection depth.** MP4 uploads receive signature, path, size, and quota checks but are not transcoded or malware-scanned. Add asynchronous scanning/transcoding before serving user video at scale.
7. **Low — CSP allow-list breadth.** Image loading permits HTTPS sources and Supabase connections use a wildcard subdomain. Narrow these to the exact deployment hosts once production domains are fixed.
8. **Low — dependency review is point-in-time.** Run production and full-tree audits in CI, review lockfile changes, and use automated update tooling. Do not apply forced major-version audit fixes without compatibility review.

## Release checks

- Run `npm run test:ci`, `npm run test:db`, the public Playwright smoke test, and a production build.
- Confirm response headers on an HTTPS preview deployment, including HSTS only in production.
- Exercise repeated invalid login and reset requests, verifying generic UI responses and upstream/edge throttling.
- Upload mislabeled, oversized, high-pixel-count, and malformed media and confirm rejection.
- Replay signed webhooks and confirm idempotent handling; alter one payload byte and confirm rejection.
- Attempt representative cross-gym reads and mutations with two real test tenants.
