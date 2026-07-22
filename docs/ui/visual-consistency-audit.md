# MyCrux visual consistency audit

Audit date: 22 July 2026

Target viewports: desktop `1440×900`, tablet `1024×768`, mobile `390×844`.

Legend:

- **Rendered**: exercised in Playwright at all three target viewports.
- **Matrix**: included in `e2e/visual-consistency.spec.ts` at all three target viewports using the local-only synthetic Supabase seed.
- **Source**: data-bound or tokenised route inspected at source level; its surrounding rendered layout is covered by the matrix.
- **Redirect**: compatibility route has no independent UI and resolves to the listed gym-scoped route.

API routes, exports, callbacks and webhooks are not visual pages and are outside this checklist.

## Public and authentication

| Route | 1440×900 | 1024×768 | 390×844 | Notes |
| --- | --- | --- | --- | --- |
| `/` | Rendered | Rendered | Rendered | Marketing shell and CTA contrast |
| `/login` | Rendered | Rendered | Rendered | Shared authentication shell |
| `/register` | Rendered | Rendered | Rendered | Shared authentication shell |
| `/forgot-password` | Rendered | Rendered | Rendered | Shared authentication shell |
| `/reset-password` | Rendered | Rendered | Rendered | Shared authentication shell |
| `/visit/:gymSlug` | Source | Source | Source | Data-bound public day-pass form |
| `/waiver/:token` | Source | Source | Source | Private, token-bound waiver flow |

## Onboarding and joining

| Route | 1440×900 | 1024×768 | 390×844 | Notes |
| --- | --- | --- | --- | --- |
| `/onboarding` | Source | Source | Source | Shared standalone shell; requires no-gym user fixture |
| `/onboarding/create` | Source | Source | Source | Shared standalone shell |
| `/join` | Source | Source | Source | Shared compact standalone shell |
| `/join/:reference` | Source | Source | Source | Join-code/QR data-bound state |

## Member experience

All routes below use the unified application shell and are included in the local synthetic **Matrix** at all three viewports unless marked Source.

| Route | 1440×900 | 1024×768 | 390×844 | Notes |
| --- | --- | --- | --- | --- |
| `/g/:gymSlug/app` | Matrix | Matrix | Matrix | Interactive floorplan |
| `/g/:gymSlug/app/routes` | Matrix | Matrix | Matrix | Map/list segmented view |
| `/g/:gymSlug/app/routes/:routeId` | Matrix | Matrix | Matrix | Route, ascent and feedback |
| `/g/:gymSlug/app/logbook` | Matrix | Matrix | Matrix | Responsive records and forms |
| `/g/:gymSlug/app/events` | Matrix | Matrix | Matrix | List/calendar views |
| `/g/:gymSlug/app/events/:eventId` | Matrix | Matrix | Matrix | Event detail |
| `/g/:gymSlug/app/community` | Matrix | Matrix | Matrix | Feed, posting and moderation states |
| `/g/:gymSlug/app/chat` | Matrix | Matrix | Matrix | Channel index |
| `/g/:gymSlug/app/chat/:channelId` | Matrix | Matrix | Matrix | Thread view |
| `/g/:gymSlug/app/competitions` | Matrix | Matrix | Matrix | Registration and scoring |
| `/g/:gymSlug/app/announcements` | Matrix | Matrix | Matrix | Compact empty/error states |
| `/g/:gymSlug/app/notifications` | Matrix | Matrix | Matrix | Preference controls |
| `/g/:gymSlug/app/statistics` | Matrix | Matrix | Matrix | Responsive charts/tables |
| `/g/:gymSlug/app/leaderboards` | Matrix | Matrix | Matrix | Filters and rankings |
| `/g/:gymSlug/app/wallet` | Matrix | Matrix | Matrix | Member token surface |
| `/g/:gymSlug/app/waivers` | Matrix | Matrix | Matrix | Waiver list |
| `/g/:gymSlug/app/waivers/:acceptanceId` | Source | Source | Source | Requires acceptance fixture |
| `/g/:gymSlug/app/guests` | Matrix | Matrix | Matrix | Guest registration |
| `/g/:gymSlug/app/partners` | Matrix | Matrix | Matrix | Partner safety and requests |
| `/g/:gymSlug/app/profile` | Matrix | Matrix | Matrix | Profile, consent and destructive actions |
| `/g/:gymSlug/app/search` | Matrix | Matrix | Matrix | Search results |

## Staff and owner experience

All routes below use the same application shell as members with capability-filtered staff navigation. They are included in the local synthetic **Matrix** at all three viewports unless marked Source.

| Route | 1440×900 | 1024×768 | 390×844 | Notes |
| --- | --- | --- | --- | --- |
| `/g/:gymSlug/staff` | Matrix | Matrix | Matrix | Priority dashboard and compact quick actions |
| `/g/:gymSlug/staff/floorplan` | Matrix | Matrix | Matrix | Responsive editor workspace |
| `/g/:gymSlug/staff/floorplan/faces/:faceId` | Source | Source | Source | Requires structured-face fixture |
| `/g/:gymSlug/staff/routes` | Matrix | Matrix | Matrix | Route-setting workspace |
| `/g/:gymSlug/staff/holds` | Matrix | Matrix | Matrix | Inventory and paginated table |
| `/g/:gymSlug/staff/check-in` | Matrix | Matrix | Matrix | Front-desk controls |
| `/g/:gymSlug/staff/guests` | Matrix | Matrix | Matrix | Guest operations |
| `/g/:gymSlug/staff/events` | Matrix | Matrix | Matrix | Event management |
| `/g/:gymSlug/staff/competitions` | Matrix | Matrix | Matrix | Competition management |
| `/g/:gymSlug/staff/route-feedback` | Matrix | Matrix | Matrix | Issue triage |
| `/g/:gymSlug/staff/announcements` | Matrix | Matrix | Matrix | Publishing workflow |
| `/g/:gymSlug/staff/waivers` | Matrix | Matrix | Matrix | Versioned waiver editor |
| `/g/:gymSlug/staff/member-access` | Matrix | Matrix | Matrix | QR, code, print layout |
| `/g/:gymSlug/staff/team` | Matrix | Matrix | Matrix | Role assignment |
| `/g/:gymSlug/staff/analytics` | Matrix | Matrix | Matrix | Gym analytics |
| `/g/:gymSlug/staff/route-analytics` | Matrix | Matrix | Matrix | Scroll-contained data table |
| `/g/:gymSlug/staff/route-analytics/history` | Matrix | Matrix | Matrix | Scroll-contained history table |
| `/g/:gymSlug/staff/plans` | Matrix | Matrix | Matrix | Usage and entitlements |
| `/g/:gymSlug/staff/billing` | Matrix | Matrix | Matrix | Platform billing boundary |
| `/g/:gymSlug/staff/integrations` | Matrix | Matrix | Matrix | Integration settings |
| `/g/:gymSlug/staff/privacy` | Matrix | Matrix | Matrix | Privacy operations |
| `/g/:gymSlug/staff/settings` | Matrix | Matrix | Matrix | Gym and branding settings |
| `/g/:gymSlug/staff/setup` | Matrix | Matrix | Matrix | Resumable setup wizard |

## Platform administration

| Route | 1440×900 | 1024×768 | 390×844 | Notes |
| --- | --- | --- | --- | --- |
| `/platform` | Matrix | Matrix | Matrix | Tenant table is scroll-contained |
| `/platform/gyms/new` | Matrix | Matrix | Matrix | Tenant creation form |
| `/platform/gyms/:gymId` | Matrix | Matrix | Matrix | Read-only support view |

## Compatibility redirects

The routes `/app`, `/app/routes`, `/app/community`, `/app/chat`, `/app/competitions`, `/app/events`, `/app/guests`, `/app/leaderboards`, `/app/logbook`, `/app/partners`, `/app/profile`, `/app/statistics`, `/app/waivers`, `/app/wallet`, and `/staff` are server redirects. They have no visual surface of their own and resolve into the unified gym-scoped shells.

## Checks performed by the route matrix

For each rendered route and viewport the matrix checks:

- successful response and a visible main landmark;
- no document-level horizontal overflow;
- no clipped interactive controls;
- no large pure-black navigation surface;
- no serious or critical Axe violations at desktop width;
- optional full-page screenshots when `E2E_VISUAL_SCREENSHOTS=true`.

The authenticated matrix is intentionally skipped unless `E2E_SUPABASE=true`. It must only run against the documented local synthetic seed. It must never be pointed at production.
