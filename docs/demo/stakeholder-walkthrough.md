# Stakeholder demo walkthrough

This walkthrough uses fictional `example.invalid` identities and the deliberately public local password `Crux-Demo-Only-2026!`. Use it only in local or isolated staging. Never enable these accounts or load `supabase/seed.sql` in production.

## Demo inventory

The repeatable seed creates two unrelated tenants:

- Demo Crux Centre (`demo-crux-centre`): owner, front-desk worker, route setter and member; two walls/routes; an upcoming event; two ascents; announcement; community post; chat messages; competition registration; optional fictional waiver; canceled Growth subscription still in grace.
- Demo Summit Lab (`demo-summit-lab`): a separate owner, wall and route, with a past-due Starter subscription. It exists to demonstrate that normal users cannot cross tenant boundaries.

| Role | Email | Intended view |
| --- | --- | --- |
| Gym owner | `owner@crux.example.invalid` | Demo Crux Centre owner/staff tools |
| Front desk | `staff@crux.example.invalid` | Guest, pass, check-in, event and waiver operations |
| Route setter | `setter@crux.example.invalid` | Wall/route management, feedback and scoring |
| Member | `member@crux.example.invalid` | Member community and climbing journeys |
| Isolation owner | `isolation-owner@crux.example.invalid` | Demo Summit Lab only |
| Platform admin | `admin@crux.example.invalid` | Tenant support console without impersonation |

## 30-minute guided script

### 1. Gym owner — configuration and business state

1. Sign in as the gym owner and open the staff dashboard. Point out gym-scoped navigation, member/staff switching, and role/capability boundaries.
2. Open Team to show canonical roles and invitations. Do not send email; copy only synthetic invitation links.
3. Open Walls and routes. Show Demo Slab, Demo Overhang, the two published routes, bulk publish/retire controls, and the 2D overlay workflow. Upload a disposable synthetic wall image if demonstrating media processing.
4. Open Events, create a draft event, then inspect the seeded Demo Technique Social and attendee export.
5. Open Waivers and inspect the explicitly fictional optional version. Explain immutable versions and the required real-world legal review.
6. Open Billing and Plans. Show that platform SaaS billing is separate from member/day-pass money, and explain the seeded canceled/grace state without opening a real Stripe Checkout.
7. Open analytics, audit export, privacy operations and integrations. Note permission checks, status/backlog visibility, and data minimization.

### 2. Route setter — route lifecycle

1. Sign out and sign in as the route setter.
2. Open the staff route library, filter/select the seeded routes, and create a draft synthetic boulder. Demonstrate grade, colour, tags, setter, planned retirement and optional image/overlay.
3. Publish the draft, switch to member view, locate it in route explorer/list view, and return to staff route feedback and route-setting analytics.
4. Confirm owner-only billing/team operations are unavailable. Do not change role data in the database to make the demo pass.

### 3. Front desk — guest arrival

1. Sign in as the front-desk worker and open Guests/check-in.
2. Create a synthetic guest registration using an `example.invalid` address and “pay at reception.” Copy the one-time reference and open the waiver link in a private window.
3. Complete only the fictional demo acceptance, return to check-in, verify the reference, confirm reception payment, and check in once. Show that replay is rejected.
4. Generate a member’s short-lived QR from the member session, then verify/check it in from the front-desk session. Explain two-minute expiry, hashing at rest and waiver checks.

### 4. Member — climbing and community

1. Sign in as the member. Use the gym search and route explorer in map and list modes; open Lime and Punishment.
2. Log an ascent, choose privacy, and inspect the paginated logbook and statistics. Compare visual charts with their adjacent data tables.
3. Book Demo Technique Social, inspect waitlist/cancellation copy, and open the seeded competition.
4. Accept community guidelines, inspect the synthetic post, add a reaction/comment, open Demo beta chat, and send a disposable message.
5. Inspect announcements, notifications, leaderboard opt-in, partner safety guidance, wallet/check-in QR and the optional fictional waiver.

### 5. Tenant isolation and platform support

1. While signed in as the Demo Crux Centre member, try a copied Demo Summit Lab route UUID/path. The route must be absent/not found.
2. Sign in as the isolation owner and confirm only Demo Summit Lab is available; its Tenant Secret Traverse must now be visible.
3. Sign in as platform admin. Show tenant counts/status and support notes, but confirm there is no tenant impersonation or member-content browser.

## Reset and verification

For local Supabase only:

```sh
supabase db reset
npm run test:db
```

`supabase db reset` deletes the local database, reapplies all migrations, and reloads the seed. Reapplying `supabase/seed.sql` is also idempotent, but a full reset is preferred because walkthrough-created records and Storage objects are otherwise retained. Remove local Storage objects with the local Supabase reset workflow; never use broad deletion commands against a hosted project.

For an isolated hosted demo project, use the provider’s reviewed reset/restore procedure and confirm the project reference is not production before any destructive action. After reset, verify both gym slugs, all six demo logins, seeded MVP records, and the `demo_seed.sql`/`rls_security.sql` tests. No demo reset command accepts a remote database URL by design.

## Known demo boundaries

- Images and videos are intentionally not embedded in SQL seed data; upload synthetic files during the walkthrough to exercise the real validation/storage path.
- Email, push and external membership/provider adapters remain disabled until configured.
- Stripe records are synthetic projections. Use Stripe test mode for a real Checkout demonstration; never use live prices or cards.
- The waiver is explicitly non-legal demo text and optional so it cannot accidentally become an entry requirement.
