# 016 — Wall structures contain climbing faces

## Decision

The existing `walls` table becomes the canonical climbing-face model when `wall_structure_id` is present. This preserves every existing route, wall image, feedback, ascent and analytics relationship because routes already reference `walls.id`. Creating a second face table would split those relationships and require an unnecessary route migration.

A physical `wall_structure` can contain zero or more ordered faces such as North Face, South Face, Roof, or Overhang. Each structured face has required width, height, climbing angle and optional notes. Legacy unstructured wall/area records remain nullable and operational until they can be mapped deliberately.

## Conventions and lifecycle

- Climbing angle is measured from vertical: negative is slab, zero is vertical, positive is overhang, and 90 degrees is a horizontal roof.
- Face names are case-insensitively unique within a structure, not across an entire gym.
- Reordering uses the existing `sort_order` field.
- Removal archives a face instead of destroying it.
- A face with route history cannot be removed, and a structure with active faces cannot be archived. This prevents visual navigation from orphaning route history.
- Owners save the complete face list through a transactional, audited RPC using a per-structure optimistic revision.

## Deferred

Holds, volumes, face imagery, route composition, AR anchors, and non-rectangular surface meshes remain later phases. Width multiplied by height is displayed as a nominal UI aid but is not persisted as authoritative surface area.
