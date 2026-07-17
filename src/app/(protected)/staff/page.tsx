import { redirectToActiveGym } from "@/lib/server/gym-context";
export default async function StaffPage() { await redirectToActiveGym("/staff", ["owner", "staff", "route_setter"]); }
