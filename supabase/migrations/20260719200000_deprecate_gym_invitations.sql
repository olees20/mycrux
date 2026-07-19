-- Retire email-bound gym membership invitations now that authenticated QR/code
-- joining is the only public member-entry mechanism. The historical table and
-- its rows are retained so this release does not destroy audit or support data.

drop trigger if exists audit_invitation_acceptance on public.invitations;
drop trigger if exists generate_invitation_notifications on public.invitations;
drop trigger if exists invitations_set_updated_at on public.invitations;

drop function if exists private.audit_invitation_acceptance();
drop function if exists private.invitation_notification_trigger();

drop policy if exists invitations_select_owner on public.invitations;
drop policy if exists invitations_insert_owner on public.invitations;
drop policy if exists invitations_update_owner on public.invitations;
drop policy if exists invitations_delete_owner on public.invitations;
drop policy if exists invitations_select_staff_manager on public.invitations;
drop policy if exists invitations_select_authorised_staff on public.invitations;

revoke all on table public.invitations from anon, authenticated;

drop function if exists public.get_gym_invitation_status(text);
drop function if exists public.accept_gym_invitation(text);
drop function if exists public.create_staff_invitation(uuid, text, text, text, timestamptz);
drop function if exists public.resend_staff_invitation(uuid, text, timestamptz);
drop function if exists public.revoke_staff_invitation(uuid);

comment on table public.invitations is
  'Deprecated historical gym-membership invitations. No application role can read or mutate this table; retain rows until a separately reviewed retention migration.';
