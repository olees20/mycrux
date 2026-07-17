import { redirectToActiveGym } from "@/lib/server/gym-context";
export default async function ProfilePage() { await redirectToActiveGym("/app/profile"); }
