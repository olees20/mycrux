# ADR 009: Store media in Supabase Storage

- Status: Accepted
- Date: 2026-07-17

## Context

Wall photographs, route media, avatars, waiver artifacts, and exports have different privacy and retention needs. Files must not become public merely because a URL is known.

## Decision

Use Supabase Storage with separate buckets by access class and purpose. Buckets are private by default; authorized server or RLS-backed flows issue short-lived signed URLs. Object keys include an immutable gym identifier and random object identifier, never personal names. Database rows hold ownership, tenant, MIME type, byte size, checksum, processing state, and retention metadata.

Uploads use allow-listed MIME types, verified size limits, random names, and server-approved paths. Images are re-encoded and stripped of metadata before publication. Deleting a database record schedules object cleanup; auditable records use retention or archive rules rather than immediate destruction.

## Consequences and trade-offs

- Storage authorization aligns with Supabase identity and tenant policies.
- Signed URLs complicate caching and expiration handling.
- Database and object operations are not one transaction, so reconciliation jobs are required.
- Processing untrusted media needs resource limits and malware defenses.

## Alternatives considered

- Public buckets: easy delivery but unsuitable for private or pre-publication media.
- Store blobs in Postgres: transactional but expensive and inefficient for delivery.
- Direct S3: mature controls, with additional credentials and policy integration.

## Deferred decisions

CDN vendor selection, video transcoding, malware scanning provider, customer-managed keys, and regional storage selection are deferred.
