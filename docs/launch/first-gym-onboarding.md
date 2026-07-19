# First-gym onboarding checklist

This checklist is for the onboarding lead and the gym owner. Use synthetic data until the production configuration, legal documents and acceptance gates are approved. Never import member data through ad hoc SQL or spreadsheets outside an approved migration/import process.

## Discovery and responsibility

- [ ] Record the gym’s legal entity, operating timezone, locations, primary owner, backup owner, privacy contact, support contact and emergency escalation route.
- [ ] Agree the pilot scope and exclusions: Crux bills the gym for SaaS; member memberships, day-pass charging, refunds, tax, KYC/payouts and provider adapters are not supplied by the MVP.
- [ ] Agree supported devices/browsers, support hours, incident communications and the daily 08:00 UTC announcement limitation.
- [ ] Identify the gym’s lawful basis/controller obligations, retention requirements and approved waiver wording/process with its legal adviser.
- [ ] Sign the applicable commercial and data-processing terms before entering member data.

## Configure with synthetic data

- [ ] Create the gym with its final name, unique slug, timezone and accessible brand colours; verify the canonical URL.
- [ ] Have one backup administrator, route setter and front-desk worker join through Member access, assign their least-privilege roles in Team, and verify navigation boundaries.
- [ ] Create walls/sectors and at least two representative routes, including image alt text and a usable non-visual route description.
- [ ] Configure an event, announcement, community moderation flow, competition and notification preferences.
- [ ] Add the legally approved waiver as a new version, review effective/required dates and test accept/decline/guest paths. Never reuse the demo waiver.
- [ ] Select the SaaS plan in Stripe, verify Checkout/Portal, invoice contact, entitlement state, cancellation/grace behavior and signed webhook delivery.
- [ ] Leave external provider integrations disabled unless a reviewed adapter and encrypted configuration path have been released.

## Role acceptance

- [ ] Owner: branding/settings, team roles, billing, privacy export/deletion workflow, reports and audit-sensitive changes.
- [ ] Route setter: wall/route creation, mapping, publish/archive and route feedback without owner/billing access.
- [ ] Front desk: QR/manual check-in, guest/waiver status and event attendance without private community/chat or billing access.
- [ ] Member: registration/login, route discovery, ascent log, event, waiver, privacy/export, notification, community/chat and competition journeys.
- [ ] Cross-tenant: use a second synthetic gym and prove that direct URLs, search, realtime, exports and mutations cannot expose or alter its data.
- [ ] Accessibility: complete keyboard, 200% zoom, mobile and screen-reader checks for the gym’s actual branding and content.

## Data and launch handover

- [ ] Decide whether member import is required. If so, define fields, consent/lawful basis, duplicate handling, validation, rollback, reconciliation and secure file deletion before building/running it.
- [ ] Train staff not to paste secrets, payment data, medical details, waiver signatures or private messages into support tickets.
- [ ] Provide support URL/contact, status/incident process, export/deletion request route, staff leaver process and owner recovery procedure.
- [ ] Capture owner acceptance of final configuration, waiver version, roles, plan, support boundaries and known limitations.
- [ ] Run the production smoke section of the go-live checklist with designated synthetic accounts, then remove or clearly label those accounts.

## First week

- [ ] Review failed sign-ins, check-ins, waiver blocks, subscription/webhook state, upload errors and support requests daily using minimum necessary data.
- [ ] Confirm staff roles and member-access QR/code availability after day one and day seven.
- [ ] Hold a day-seven review covering adoption, accessibility, support load, privacy requests, incidents, billing and whether pilot scope should expand.
- [ ] Assign every follow-up a severity, named owner and due date; keep provider adapters, member commerce and 3D/AI disabled unless separately approved.
