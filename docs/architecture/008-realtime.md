# ADR 008: Use Realtime only for bounded interactive features

- Status: Accepted
- Date: 2026-07-17

## Context

Gym chat, presence, and timely community updates benefit from live delivery. Making every screen realtime would increase subscriptions, complexity, battery use, and authorization risk.

## Decision

Use Supabase Realtime for gym-scoped chat channels, partner-finder updates, and selected notification refreshes. Persist durable messages and posts in Postgres; Realtime transports change events but is not the system of record. Channels are derived from authorized gym/channel identifiers and RLS controls readable rows. Clients reconnect, deduplicate by durable ID, and refetch after gaps.

Ordinary lists use server rendering, explicit refresh, or cache revalidation. Presence and ephemeral typing indicators contain no sensitive profile data and are rate-limited.

## Consequences and trade-offs

- Interactive areas feel immediate without coupling the whole product to sockets.
- Clients must handle duplicates, ordering, reconnects, and missed events.
- Subscription counts and fan-out need monitoring.
- Authorization changes may require clients to be disconnected or tokens refreshed.

## Alternatives considered

- Polling: simpler authorization, but wasteful and less responsive for chat.
- Custom WebSocket service: maximum control with additional infrastructure and scaling work.
- Realtime everywhere: rejected because most content does not justify the operational cost.

## Deferred decisions

Direct messages, end-to-end encryption, large public broadcasts, and a dedicated event bus are deferred until moderation and scale requirements are known.
