# 019 — Hold-based routes and immutable history

## Decision

The existing `routes.id` remains the canonical climb identity used by ascents, feedback, competitions, analytics, media, and member views. A route's current physical definition is the many-to-many `route_holds` relationship to reusable `wall_holds`. A hold may therefore belong to multiple routes without being copied or owned by any route.

Every route insert or update advances `routes.history_revision` and writes an immutable `route_versions` snapshot. `route_version_holds` copies the exact category, icon, wall-local position, rotation, scale, and metadata of each selected hold at that moment. Later hold movement therefore cannot rewrite what an older route revision looked like.

## Workflow and lifecycle

Route managers open a measured face, enter name, colour, grade, setter and supporting metadata, then select holds directly on the wall canvas. A transactional RPC validates that every hold is active on that face before replacing the current collection and producing a new history revision.

Duplication creates a new draft route identity, records its source, and reuses the same holds. Archival is a state transition and creates another immutable revision. Authenticated users cannot delete route records; immutable revision foreign keys additionally prevent hard deletion. Existing publish and retire operations continue to update the canonical route and are captured automatically by database triggers.

## Authorization and scale

The browser never supplies a trusted user identity. Server actions establish gym context and Postgres repeats the `routes.manage` capability check. Current hold membership is member-readable only when the route itself is readable. Complete history is restricted to route managers.

Current face editing loads current assignments separately from bounded recent history. Gym-leading indexes support hold-to-route and route-to-version lookups, while the immutable version tables permit future analytics, density maps, setter planning, competitions, and route replay without rewriting the operational `routes` table.

## Complete historical analytics

Every snapshot stores the route's set date, planned removal date, actual publication/removal/archive timestamps, setter identity and display name, grade, wall identity and measurements, tags, and exact physical hold state. `changed_fields` and a bounded `changes` document record before/after values and added or removed hold UUIDs, making common historical analysis possible without repeatedly diffing large snapshots.

Deferred database triggers also create revisions when a route's physical hold is moved, rotated, resized, or edited, when tags change, and when its wall name or measurements change. Multiple physical changes in one transaction collapse into one final route snapshot. This keeps the history complete without producing one revision per row in a bulk wall save.

`get_route_history_analytics` exposes date-scoped immutable modifications to authorised route managers, including archived routes. Current operational analytics remain separate from this historical feed: current tables answer “what is live now”, while route versions answer “what changed at that time”.

## Route-layer rendering

Colour, grade, setter, discipline, active, and archived filters operate on current route definitions in memory. Matching route memberships are collapsed into one lookup entry per physical hold. The SVG therefore renders each installed hold exactly once instead of rendering every route as a duplicate wall layer. A selected route's holds receive full emphasis; holds from other matching routes are faded, and unmatched holds remain minimally visible for spatial context. The route list uses browser content visibility so hundreds of off-screen rows do not incur full rendering cost.
