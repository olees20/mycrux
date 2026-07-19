export type GymSetupActionState = Readonly<{
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}>;

export const initialGymSetupActionState: GymSetupActionState = { status: "idle" };

