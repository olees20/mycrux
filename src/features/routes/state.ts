export type RouteActionState = { status: "idle" | "success" | "error"; message?: string };
export const initialRouteActionState: RouteActionState = { status: "idle" };
