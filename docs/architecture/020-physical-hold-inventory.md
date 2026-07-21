# 020 — Canonical physical hold inventory

## Decision

`wall_holds` is the inventory record for a real physical hold. Manufacturer, model, colour, purchase date, condition, current face, placement, and UUID live on that existing row. No parallel inventory table or route-owned hold copy is introduced.

Current routes are derived from `route_holds`, preserving the established rule that one physical hold may belong to multiple routes. Route saves update those relationships transactionally. A deferred assignment-history trigger evaluates the final transaction state, so the route editor's internal delete/reinsert implementation does not create false unassignment history for unchanged holds.

## History and lifecycle

`hold_inventory_events` is append-only and records creation, detail changes, wall-local placement changes, wall moves, archive/restore transitions, and actual route assignment changes. Each event contains a bounded physical-state snapshot. Immutable route revisions separately retain historical route-specific hold geometry.

Managers can inspect a paginated gym-wide inventory and recent history, while owners can edit inventory details directly on the measured wall. Members can still read active wall holds required for route display but cannot read purchase or inventory history through the manager-only event policy.

## Scale and integrity

Gym/hold/time and gym/route/time indexes support history lookup without scanning other tenants. Inventory lists are paginated at 100 physical holds. Route assignment events are based on stable UUID relationships and never create another hold record. Existing active-route protections continue to prevent archiving a physical hold that remains in use.

## Hold-side route editing

The wall editor treats the selected hold as the editing unit. Its side panel can update metadata and geometry, and can add or remove the hold from several active routes in one transaction. `save_hold_route_assignments` locks affected routes in UUID order, checks their expected revisions, changes only the requested memberships, and creates one immutable route snapshot per affected route. Archived route assignments remain frozen.

Undo and redo are client-side snapshots of both physical hold state and unsaved route membership. Persisting either concern remains explicit, with optimistic revisions preventing an older browser session from overwriting newer route or wall data.

Physical replacement and deletion are recoverable lifecycle operations rather than destructive row deletion. Replacement creates one new canonical UUID, transfers active route memberships, archives the previous physical item, and records new route revisions and inventory events atomically. Deletion removes active memberships and retires the canonical hold while retaining route versions, inventory history, and audit evidence.
