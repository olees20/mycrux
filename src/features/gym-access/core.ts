export const gymCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type GymJoinState =
  | "valid"
  | "invalid"
  | "disabled"
  | "rotated"
  | "unavailable"
  | "already_member"
  | "blocked"
  | "rate_limited";

export function normalizeGymCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatGymCode(value: string) {
  const normalized = normalizeGymCode(value);
  return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

export function gymJoinStatusMessage(state: GymJoinState, gymName?: string | null) {
  switch (state) {
    case "valid": return `You are joining ${gymName ?? "this gym"} as a member.`;
    case "disabled": return `${gymName ?? "This gym"} is not accepting QR or code joins right now.`;
    case "rotated": return "This gym access code has been replaced. Scan the latest QR code or ask the gym for its current code.";
    case "unavailable": return `${gymName ?? "This gym"} is currently unavailable.`;
    case "already_member": return `You already belong to ${gymName ?? "this gym"}.`;
    case "blocked": return `Your existing access to ${gymName ?? "this gym"} cannot be restored with a public code. Contact the gym team.`;
    case "rate_limited": return "Too many gym-code attempts. Wait 15 minutes before trying again.";
    default: return "That gym code or QR link is invalid. Check it and try again.";
  }
}

export function gymJoinErrorMessage(error: Readonly<{ code?: string; message?: string }>) {
  const message = error.message?.toLowerCase() ?? "";
  if (message.includes("too many")) return "Too many gym-code attempts. Wait 15 minutes before trying again.";
  if (message.includes("rotated")) return gymJoinStatusMessage("rotated");
  if (message.includes("disabled")) return "This gym is not accepting QR or code joins right now.";
  if (message.includes("unavailable")) return "This gym is currently unavailable.";
  if (message.includes("existing membership") || error.code === "42501") return "This membership cannot be activated with a public code. Contact the gym team.";
  return gymJoinStatusMessage("invalid");
}
