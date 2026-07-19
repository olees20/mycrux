# QR-first gym member access

Each gym receives two non-privileged member access identifiers:

- a high-entropy UUID encoded in a normal HTTPS URL for QR scanning;
- an eight-character, case-insensitive fallback code using the unambiguous
  alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

The identifiers select a gym; they do not authenticate a user and are not staff
credentials. `/join` routes require a Supabase session. After authentication the
user sees the gym name and explicitly confirms joining. The database RPC derives
the profile from `auth.uid()` and can only create an active `member` membership
with no staff role.

Current credentials live in `public.gym_join_credentials`. RLS exposes them only
to owners and staff with `staff.manage`. Rotated credentials move to private
history so old QR images and codes return a distinct rotated state without being
accepted. Private attempt records enforce 20 manual-code lookups or submissions
per authenticated user per 15 minutes, including direct RPC calls.

The legacy `invitations` table remains as inaccessible historical storage; the
member-invitation RPCs, policies and notification triggers have been removed. A
prospective team member joins as a normal member first. An owner or manager then
assigns an allowed operational role from Team access. Existing delegation rules
still prevent managers assigning the manager role or anyone assigning owner access.

## Migration

Apply the forward-only migration to the linked Supabase project:

```sh
npx supabase db push
```

For an explicit local database test URL:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npm run test:db
```

## Manual test checklist

1. As an owner or gym manager, open **Staff → Member access**. Confirm the QR,
   formatted code, copy, download and print controls work.
2. Scan the QR with the phone's standard camera while signed out. Register or sign
   in and confirm that the browser returns to the same gym join screen.
3. Confirm the gym name, choose **Join this gym**, and verify redirection to its
   member dashboard with exactly one member membership.
4. Repeat using the manual code from no-gym onboarding, including lower-case input
   and the optional dash.
5. Disable member joining and confirm both QR and code show the disabled state.
6. Re-enable and rotate access. Confirm the old QR and old code show the rotated
   state and the new versions work.
7. Archive or suspend the gym in an isolated test environment and confirm joining
   reports that the gym is unavailable.
8. Sign in as an ordinary member and confirm the Member access management page is
   unavailable. As a manager, assign a joined member a permitted staff role and
   confirm owner/manager escalation remains denied.
9. Make more than 20 invalid manual-code attempts within 15 minutes and confirm
   the rate-limit message appears.
