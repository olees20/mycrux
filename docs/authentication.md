# Authentication configuration

MyCrux uses Supabase Auth email/password sessions, but does not require an email
confirmation step in this version of the product. A successful registration must
return both a user and a session; the server then sends a user with no active gym
membership directly to `/onboarding`.

## Required hosted Supabase setting

In the Supabase dashboard for each deployed environment:

1. Open **Authentication → Providers → Email**.
2. Disable **Confirm email** (in dashboard versions that rename the control,
   disable the equivalent email-confirmation requirement).
3. Save the provider configuration.

This is an infrastructure setting and cannot be changed safely by browser or
application code. If confirmation remains enabled, Supabase normally creates the
user without returning a session; MyCrux reports that automatic sign-in failed
instead of displaying a misleading verification screen.

The `/auth/callback` code-exchange route remains in place because password reset
links use the PKCE callback before opening `/reset-password`. Password-reset
responses remain account-enumeration resistant. Login failures likewise use the
same message for an unknown email and an incorrect password.

Removing confirmation does not bypass authentication or tenant authorization.
Protected routes still validate the server session with `auth.getUser()`, and all
membership, gym-owner, role, and RLS checks remain enforced. No
application table stores or fabricates an email-confirmed state.
