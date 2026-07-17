export type WaiverActionState = { status: "idle" | "success" | "error"; message?: string };
export const initialWaiverState: WaiverActionState = { status: "idle" };
