export type AnnouncementActionState = Readonly<{ status: "idle" | "error" | "success"; message?: string }>;
export const initialAnnouncementActionState: AnnouncementActionState = { status: "idle" };
