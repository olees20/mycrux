import { redirectToActiveGym } from "@/lib/server/gym-context";
export default async function CommunityPage() { await redirectToActiveGym("/app/community"); }
