# ADR 002: Use Supabase as the managed backend

- Status: Accepted
- Date: 2026-07-17

## Context

The product needs relational tenant data, authentication, media storage, realtime channels, and database-level authorization without operating several independent services.

## Decision

Use Supabase Postgres, Auth, Storage, and Realtime. Versioned SQL migrations are the source of truth for schema, functions, policies, and buckets. Browser and server requests normally use the user's JWT so RLS applies. A service-role client is permitted only in explicitly server-only modules for narrow platform administration, verified webhooks, and trusted maintenance tasks.

Edge Functions may be used when proximity to Supabase or a long-running webhook flow justifies them; Next.js route handlers remain the default integration boundary.

## Consequences and trade-offs

- One platform supplies integrated identity and data services, accelerating delivery.
- Postgres remains portable, but Auth, Storage policies, and Realtime introduce vendor coupling.
- Connection, quota, and Realtime limits must be observed and tested.
- Dashboard-only production changes are prohibited because they create configuration drift.

## Alternatives considered

- AWS primitives: maximum flexibility but substantially more infrastructure and IAM work.
- Firebase: strong client tooling, but a document model is a poor fit for relational tenancy and reporting.
- Self-hosted Postgres plus bespoke services: portable but operationally expensive at MVP scale.

## Deferred decisions

Dedicated queues, search infrastructure, data warehouse replication, and self-hosting Supabase are deferred.
