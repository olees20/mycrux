# Integration provider interface

`IntegrationProvider` in `src/lib/integrations/providers.ts` is the boundary for gym-specific systems. An adapter declares a stable key, display name, category, availability, and a parser that converts a verified webhook into a minimal normalized event. The membership, check-in, gym-payment and calendar entries are intentionally disabled placeholders; no undocumented external API behavior is assumed.

Configuration must be encrypted before it reaches `integration_connections.encrypted_configuration`. The `enc:v{key-version}:…` envelope and SHA-256 fingerprint support key rotation without storing plaintext. The base tables are unavailable to browser roles; owner UI receives status-only RPC rows, so ciphertext and webhook payloads never reach the client.

Webhook flow:

1. The server route reads the raw body, enforces a size limit, validates provider/integration IDs and verifies an HMAC signature before parsing JSON.
2. A service-role RPC inserts `(integration_id, idempotency_key)` once. Duplicate deliveries return the existing row.
3. Workers claim pending/retry deliveries and call the adapter. Attempts use bounded exponential backoff; the fifth failure moves the delivery to `dead_letter` and marks the connection errored.
4. Receipt and lifecycle changes are audited using identifiers and error codes only. Secrets and payloads must not be logged.

`INTEGRATION_WEBHOOK_SECRET` is optional while every adapter is disabled. Set a random 32+ character value before enabling an adapter. Provider-specific signature schemes should replace the generic HMAC at adapter implementation time.
