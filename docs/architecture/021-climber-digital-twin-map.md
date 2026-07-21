# 021: Climber digital-twin map

Status: Accepted

## Context

The member homepage previously presented conventional content cards and linked to a route table. The digital-twin model now provides a gym floorplan, physical wall structures, measured climbing faces, reusable holds, many-to-many route assignments, ascents, and private route feedback. Members should navigate those relationships visually without receiving route-setting capabilities.

Commercial gyms can contain tens of thousands of routes over their history and many thousands of physical holds. Sending the whole twin to every homepage request would make initial rendering progressively slower.

## Decision

The gym-scoped member homepage is the interactive floorplan. The server initially returns only the active floorplan, structures, and measured faces that the current membership can read through RLS. Selecting a face invokes an authenticated server action which:

1. resolves the gym and user from the server session;
2. reads only published, unarchived routes on that face;
3. pages through route and hold assignments rather than relying on the PostgREST default row limit;
4. returns only the physical holds used by those published routes; and
5. returns the current member's recent sessions, favourites, and submitted feedback.

The client renders each physical hold once. Selecting a route creates a set of its hold identifiers, so highlighting is linear in the visible holds rather than routes multiplied by holds. Other holds fade without cloning SVG nodes.

The map is read-only for every role. Staff and route setters receive a separate link to existing capability-protected editing pages; no editor mutation or privileged role is accepted by the member map. Ascents and feedback continue through their existing authenticated server actions and database functions.

## Consequences

- Members move from gym to wall to face to route without a table-first workflow.
- Initial homepage cost scales with physical structures, while detailed route data is paid only for the selected face.
- Published-route RLS remains the final read boundary and existing mutation authorization remains unchanged.
- Archived routes and holds do not leak into the climber view, including when a staff member uses the read-only map.
- A future spatial API or tiled map renderer can replace the face loader without changing route, hold, ascent, or feedback ownership.

No schema or migration change is required for this decision.
