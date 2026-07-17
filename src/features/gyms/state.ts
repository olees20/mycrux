export type GymActionState = Readonly<{ status: "idle" | "error" | "success"; message?: string }>;
export const initialGymActionState: GymActionState = { status: "idle" };
