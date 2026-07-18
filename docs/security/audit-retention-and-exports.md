# Audit retention, exports and deletion

Audit records are append-only at the database boundary. Normal authenticated and service-role APIs cannot update or delete them. Records capture the actor, gym, action, target, outcome, timestamp and deliberately limited metadata; secrets, raw payment/webhook payloads, waiver signatures and private messages must not be logged.

The initial retention target is seven years for security, billing and waiver-adjacent accountability, subject to legal review for each operating country. A deletion request removes or anonymises ordinary profile/community content, while audit actor references, signed waiver evidence, fraud/safety holds and financial records may be retained under a documented lawful basis. Retention expiry requires a reviewed database migration or controlled maintenance job, never a browser action.

Member exports contain only the caller's profile, gym membership, ascent history and accepted-waiver references. Owner exports contain tenant configuration and operational content plus aggregated membership/check-in counts; they exclude member contact details, waiver signatures, guest emails, secrets and payment identifiers. Every export request creates an audit event. Export files should be delivered directly over the authenticated request, never placed in a public bucket, and should not be cached.
