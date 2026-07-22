# ADR 022: Production member 3D digital twin

**Status:** Accepted  
**Date:** 2026-07-22

## Decision

The authenticated gym homepage uses a lazily loaded React Three Fiber scene as the primary member experience. The existing 2D floorplan remains the canonical staff authoring tool and can temporarily be restored for members with `NEXT_PUBLIC_ENABLE_3D_GYM=false` during rollout.

World space is measured in metres. A floorplan structure supplies the horizontal tangent, base elevation and physical backing. Each climbing face supplies a local U/V surface, incline, facing side, material and optional ordered polygon vertices. Existing hold `position_x_metres` and `position_y_metres` values map directly to surface U/V coordinates; route membership remains the existing many-to-many `route_holds` relation.

Custom face vertices are normalized in `wall_face_vertices`. Postgres validates coordinate limits and polygon simplicity inside the existing owner-only, security-definer face-save transaction. Members receive read-only access through gym-membership RLS; direct authenticated writes remain revoked.

## Rendering and performance

- Three.js, React Three Fiber and Drei provide meshes, raycasting, orbit/touch camera controls, lighting and shadows.
- Faces and wall backings are generated procedurally, so no external model download blocks first render.
- Holds are grouped by category and highlight state and rendered with instancing. Volumes use a distinct triangular procedural mesh.
- Geometry is lazy-loaded with the member scene. Holds and routes load only after face focus, in bounded 500-row pages.
- Device pixel ratio is capped at 1.65 and reduced to 1.15 on small screens or reduced-motion devices. Expensive shadows are disabled in that mode.
- A user-visible Performance control reports current renderer draw calls and triangles without enabling a per-frame React state loop.

## Accessibility and failure handling

Every face has a keyboard-focusable HTML hotspot with a visible focus indicator. Route details, filters, ascent logging and feedback remain semantic HTML outside the canvas. Browsers without usable WebGL receive a simplified wall-and-face list rather than a broken canvas or staff editor.

## Current limitations

Procedural hold silhouettes communicate category and route selection but are not manufacturer-accurate assets. GLTF assets, texture atlases, occlusion tuning, geometry LODs, shared-edge editing, start/finish route roles and scanned wall import remain later work. The current custom editor supports planar ordered polygons with optional per-vertex depth; it does not yet provide photogrammetry or freeform curved surfaces.
