# Row Level Security policy intent

All exposed base tables have RLS enabled and forced by `20260717163000_row_level_security.sql`. `anon` has no table privileges or policies. `authenticated` receives ordinary table privileges, but every operation is filtered by RLS. PostgreSQL's `service_role` has `BYPASSRLS` and is restricted to reviewed server-only modules and operational jobs.

## Trust model

- `auth.uid()` is the only user identity source. Client-provided user IDs, roles, `gym_id`, ownership fields, and platform-admin flags are untrusted.
- `private.current_membership_id`, `private.has_gym_role`, and `private.has_gym_capability` are `SECURITY DEFINER`, have an empty fixed `search_path`, and return only IDs/booleans. They are owned by the migration role, which bypasses policies, so policies on `gym_memberships` never recursively invoke themselves.
- An active membership is required for gym access. `invited`, `suspended`, and `left` memberships grant no tenant access.
- Owners implicitly have all gym capabilities. Staff capabilities come from their active `staff_roles` record. Route setters receive only route, feedback, and competition-scoring capabilities.
- Platform admins do not receive a JWT/RLS bypass. Cross-tenant administration must go through a server-only `service_role` path, and the action must create an audit event.
- Guest invitation, waiver, and pass tokens are verified by narrow server-only handlers. Tokens are stored as hashes and anonymous callers cannot query their tables.

## Protected columns

Update triggers reject changes to `gym_id` and identity/ownership columns such as `profile_id`, `author_id`, `sender_id`, parent IDs, and platform-admin state. They also preserve signed waiver snapshots and notification payloads. Capability-aware triggers prevent authors from undoing moderation or promoting themselves to channel moderator. Insert policies independently require the authenticated user's identity where ownership is personal. Members have no update policy on membership roles, and only owners can manage membership roles.

## Table-by-table policies

| Table | Read intent | Write intent |
| --- | --- | --- |
| `profiles` | Self or profiles sharing an active gym. | A user creates/updates only their own non-platform-admin profile; ID and admin flag are immutable. |
| `gyms` | Active members of that gym. | Owners update settings; creation/closure uses privileged onboarding/operations paths. |
| `gym_domains` | Active gym members. | Owners manage mappings; `gym_id` is immutable. |
| `gym_branding` | Active gym members. | Owners manage branding. |
| `staff_roles` | Active gym members. | Owners manage custom roles; system-role state cannot be client-created or changed. |
| `gym_memberships` | Self and active members of the same gym. | Owners add/change/remove memberships; ordinary members cannot change roles or tenant. |
| `invitations` | Owners only. | Owners issue and manage invitations; insertion records the authenticated inviter. Signed acceptance is server-only. |
| `announcements` | Active members see published, unarchived posts; permitted staff see drafts. | Staff with `announcements.manage`; author and tenant remain immutable. |
| `walls` | Active members see active, unarchived walls. | Staff with `routes.manage`. |
| `wall_images` | Active members see current, unarchived images. | Staff with `routes.manage`; wall and tenant remain immutable. |
| `routes` | Active members see published, unarchived routes. | Staff/route setters with `routes.manage`. |
| `route_tags` | Readers of the published route. | Staff/route setters with `routes.manage`. |
| `route_media` | Readers of the published route see ready, unarchived media. | Staff/route setters with `routes.manage`. |
| `route_feedback` | Own feedback, public visible feedback on published routes, and permitted staff. | Members create/update/delete their own; staff with feedback/route capability moderate without changing ownership. |
| `ascent_logs` | Owner only, including private notes. | Owner manages only their own logs for a visible route. |
| `favourites` | Owner only. | Owner inserts/deletes their own visible-route favourites. |
| `events` | Active members see published/completed events; permitted staff see drafts. | Staff with `events.manage`. |
| `event_registrations` | Registrant or staff with `events.manage`. | Members manage their own registration for published events; guest registration is server-only. |
| `waivers` | Active members and staff with `waivers.manage`. | Staff with `waivers.manage`. |
| `waiver_versions` | Active members see published/superseded versions. | Staff with `waivers.manage`; creator, waiver, and tenant are immutable. |
| `waiver_acceptances` | Acceptor or staff with `waivers.manage`. | Members append their own acceptance of a published version; staff may record revocation. Guest acceptance is server-only. |
| `guest_invites` | Staff with guest-management capability only. | Staff with guest-management capability; signed guest access is server-only. |
| `passes` | Owning member or staff with `passes.manage`. | Staff with `passes.manage`; guest signed access is server-only. |
| `competitions` | Active members see registration/live/completed competitions; competition staff see drafts. | Staff with `competitions.manage`. |
| `competition_routes` | Active members and competition staff. | Staff with `competitions.manage`. |
| `score_entries` | Active gym members and competition staff. | Only staff with competition management/scoring capability may record or change scores. Participant and competition keys are immutable. |
| `competition_leaderboard` | PostgreSQL 15+ authenticated access invokes underlying `score_entries` RLS. | Read-only. PostgreSQL 14 fallback remains revoked. |
| `community_posts` | Active members see visible posts plus their own; moderators see flagged/hidden rows. | Members create/update their own and soft-delete through updates; moderators may update moderation state. |
| `comments` | Active members see visible comments plus their own; moderators see moderated rows. | Members create/update their own; moderators may update. Physical delete is not granted by policy. |
| `reactions` | Active gym members. | Members insert/delete only their own reactions. |
| `partner_requests` | Active members see open requests plus their own; moderators see all. | Members create/update their own; moderators may update. |
| `chat_channels` | Community channels for active members; restricted channels require explicit membership or chat management. | Staff with `chat.manage`. |
| `channel_members` | Self or callers authorized for the channel. | Members join/leave as themselves; chat managers administer membership. |
| `messages` | Callers authorized for the channel. | Members create/update their own; chat managers moderate. Physical deletion is not granted. |
| `notifications` | Recipient only. | Recipient updates read/archive state; creation is a trusted server operation. |
| `notification_preferences` | Owner only. | Owner manages only their per-gym preferences. |
| `audit_logs` | Gym owners see their tenant audit rows. Platform-global rows are server-only. | Append-only trusted server/database paths; no authenticated mutation policy. |
| `billing_customers` | Gym owners. | Verified Stripe/server-only paths; no authenticated mutation policy. |
| `subscriptions` | Gym owners. | Verified Stripe webhooks/server-only paths; no authenticated mutation policy. |
| `feature_entitlements` | Active gym members so server/UI feature gates agree. | Billing/administration server-only paths. |

## Service-role boundary

The service-role key may be imported only by `src/lib/supabase/admin.ts`. That module begins with `import "server-only"`, keeps its raw client private, exposes purpose-specific functions rather than a raw client, validates signed inputs before queries, and emits structured failure events. Client Components, browser helpers, and generic shared utilities must never import it.

Normal Server Component and Route Handler clients use the caller's cookies and anonymous key so RLS applies. SQL tests use a local `service_role` database role solely to prove that the server boundary can perform controlled cross-tenant work.

## Verification

`supabase/tests/rls_security.sql` uses real `anon`, `authenticated`, and `BYPASSRLS service_role` roles. It verifies own-gym reads and writes, denied cross-gym reads/writes, denied membership/platform-admin escalation, protected-column enforcement, route-setter scope, platform-admin JWT isolation, anonymous denial, and service-role cross-tenant access.
