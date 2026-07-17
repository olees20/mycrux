import { redirectToActiveGym } from "@/lib/server/gym-context";
export default async function EventsPage() { await redirectToActiveGym("/app/events"); }
