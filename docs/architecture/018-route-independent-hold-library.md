# 018 — Route-independent Hold Library

## Decision

An installed hold is a reusable physical object attached to one measured climbing face, not to a route. `wall_holds` stores a client-generated UUID, gym and face ownership, category, application-owned icon key, metre position, rotation, scale, bounded metadata, and lifecycle timestamps. The schema intentionally has no `route_id`; a later route model can associate routes with existing hold UUIDs without changing the physical wall twin.

The supported vocabulary is jug, crimp, sloper, pinch, pocket, edge, volume, macro, dual texture, and foothold. Icons are trusted SVG components selected by `icon_key`. Raw SVG or HTML is never stored or rendered.

## Editing and scale

- Holds use the permanent bottom-left wall coordinate system, so zoom and pan never alter persisted positions.
- The editor supports palette placement, drag, keyboard nudging, rotation, scaling, metadata, duplication, and deletion.
- A full-document RPC saves at most 10,000 active holds per face and increments an optimistic revision under a row lock.
- Omitted holds are soft archived. Face shrink, archive, and deactivation are rejected while they would orphan active hold coordinates.
- Rendering uses one SVG element per visible hold. The gym-leading active index supports bounded face loads without global scans.

## Authorization

Only gym owners can mutate the initial library. The server derives the authenticated profile and gym context; the security-definer RPC repeats the owner check, validates tenant ownership and every value, and records successful saves in the audit log. Authenticated gym members may read active holds through RLS. Direct client inserts, updates, and deletes are revoked.
