export type AscentActionState = { status: "idle" | "success" | "error"; message: string };
export const initialAscentState: AscentActionState = { status: "idle", message: "" };
