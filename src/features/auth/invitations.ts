export type InvitationLifecycleState = "valid" | "invalid" | "expired" | "revoked" | "used" | "wrong_email";

export function invitationFailureMessage(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  if (error.code === "23505" || message.includes("already been used")) return "This invitation has already been used.";
  if (message.includes("revoked")) return "This invitation was revoked by the gym.";
  if (message.includes("expired")) return "This invitation has expired. Ask the gym for a new link.";
  if (message.includes("another email")) return "This invitation was sent to a different email address. Sign in with the invited address or ask the gym to resend it.";
  if (error.code === "28000") return "Sign in with a verified account before accepting this invitation.";
  return "This invitation is invalid. Check the complete link or ask the gym for a new one.";
}

export function invitationStatusMessage(state: InvitationLifecycleState, gymName?: string | null) {
  switch (state) {
    case "valid": return `This invitation is ready${gymName ? ` for ${gymName}` : ""}.`;
    case "expired": return "This invitation has expired. Ask the gym for a new link.";
    case "revoked": return "This invitation was revoked by the gym.";
    case "used": return "This invitation has already been used.";
    case "wrong_email": return "This invitation belongs to a different email address.";
    default: return "This invitation is invalid. Check the complete link or ask the gym for a new one.";
  }
}
