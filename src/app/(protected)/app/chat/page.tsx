import { redirect } from "next/navigation";
import { requireActiveGymContext } from "@/lib/server/gym-context";
export default async function ChatRedirect(){const{gym}=await requireActiveGymContext({});redirect(`/g/${gym.slug}/app/chat`);}
