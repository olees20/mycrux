export type StaffActionState = Readonly<{
  status: "idle" | "error" | "success";
  message?: string;
  invitationUrl?: string;
}>;

export const initialStaffActionState: StaffActionState = { status: "idle" };
