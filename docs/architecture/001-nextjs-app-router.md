# ADR 001: Use Next.js App Router

- Status: Accepted
- Date: 2026-07-17

## Context

Crux needs one responsive web application for public pages, authentication, member journeys, and staff tools. It needs server-rendered tenant pages, accessible progressive enhancement, secure server integrations, and a straightforward Vercel deployment path.

## Decision

Use Next.js App Router with React and strict TypeScript. Route groups separate public, authentication, and protected interfaces without changing URLs. Server Components are the default; Client Components are introduced only for browser state or interaction. Mutations use Server Actions or route handlers with shared validation and authorization. Business logic belongs in feature/server modules, not page files.

## Consequences and trade-offs

- Streaming, layouts, metadata, and server rendering are first-class, with less client JavaScript.
- Server/client boundaries require discipline; secrets and privileged clients must be server-only.
- Next.js upgrades can change caching and request APIs, so framework behavior is covered by integration tests and pinned dependency ranges.
- Route handlers are suitable for webhooks and small jobs, but not indefinite background processing.

## Alternatives considered

- SPA plus a separate API: clearer process separation but duplicates routing, deployment, and authentication work.
- Pages Router: stable but does not match the desired server-component model.
- A custom Node server: more control, with greater operational cost and weaker Vercel integration.

## Deferred decisions

Native applications, offline-first synchronization, and extracting a standalone API are deferred until usage demonstrates the need.
