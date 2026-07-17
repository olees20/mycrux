# ADR 007: Start with image-based route mapping

- Status: Accepted
- Date: 2026-07-17

## Context

Climbers need to locate routes on irregular walls. A full 3D model would be expensive to capture, render, maintain, and make accessible before product demand is proven.

## Decision

Use versioned wall photographs with normalized two-dimensional route overlays. Overlay geometry is stored independently of image pixel dimensions so responsive clients can render it. A route references a wall-image version and one or more typed points or paths. Original images are retained privately; optimized derivatives serve clients.

The model should preserve stable wall and route identifiers so future 3D coordinates can be added without replacing route history.

## Consequences and trade-offs

- Staff can create useful maps with ordinary phones and browsers.
- Two-dimensional overlays are accessible, cacheable, and inexpensive.
- Perspective, occlusion, and wall changes can reduce accuracy; image versioning and descriptive text mitigate this.
- This choice does not provide spatial measurement or automatic hold detection.

## Alternatives considered

- Full photogrammetry or LiDAR: richer but high capture, processing, device, and UX cost.
- Unannotated route lists: fastest, but poor at helping climbers locate a climb.
- Proprietary 3D mapping service: faster than building one, but creates cost and data portability concerns.

## Deferred decisions

3D scanning, AR navigation, computer-vision hold recognition, automated grade suggestions, and cross-image coordinate registration are phase-two research items.
