export type StaffActionState = Readonly<{
  status: "idle" | "error" | "success";
  message?: string;
}>;

export const initialStaffActionState: StaffActionState = { status: "idle" };
