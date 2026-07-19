export type GymJoinActionState = Readonly<{
  status: "idle" | "error";
  message?: string;
}>;

export type MemberAccessActionState = Readonly<{
  status: "idle" | "error" | "success";
  message?: string;
}>;

export const initialGymJoinActionState: GymJoinActionState = { status: "idle" };
export const initialMemberAccessActionState: MemberAccessActionState = { status: "idle" };
