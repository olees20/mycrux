import { redirectToActiveGym } from "@/lib/server/gym-context";export default async function WalletPage(){await redirectToActiveGym("/app/wallet");}
