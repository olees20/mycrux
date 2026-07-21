# 017 — Scalable wall canvas

## Decision

Every measured climbing face has a permanent two-dimensional coordinate space derived directly from `walls.width_metres` and `walls.height_metres`. Coordinates are expressed in metres from a bottom-left `(0, 0)` origin. The browser viewport may zoom and pan, but those presentation transforms never alter wall-local coordinates.

Canvas grid visibility, snapping interval, and snapping state are persisted on the face. Width and height are not duplicated into a canvas table: the Phase 2 face measurements remain authoritative, so resizing a face automatically resizes its editor. Per-face optimistic revisions prevent silent settings overwrites.

## Scale and future attachment

- SVG renders the blank wall, measurement grid, axes, rulers, and cursor without storing pixels or viewport-dependent positions.
- Grid lines use a repeated pattern rather than one DOM node per line.
- Whole-metre ruler marks are bounded by the maximum measured face dimensions.
- Future holds, volumes, and other wall-local objects can store metre coordinates against the stable `walls.id` face relationship.
- Normalized image overlays remain a separate legacy presentation and are not converted in this phase.

## Authorization and scope

Only gym owners can open and persist this Phase 3 editor. Canvas saves derive the user and gym authorization from the authenticated server session and an owner-only database RPC. No holds or routes are created or modified.
