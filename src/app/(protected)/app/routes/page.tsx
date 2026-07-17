import { redirectToActiveGym } from "@/lib/server/gym-context";
export default async function RoutesPage() { await redirectToActiveGym("/app/routes"); }
