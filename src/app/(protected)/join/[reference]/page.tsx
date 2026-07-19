import { GymJoinConfirmation } from "@/components/gym-join-form";
import type { GymJoinState } from "@/features/gym-access/core";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function QrGymJoinPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const supabase = await createServerComponentSupabaseClient();
  await requireUser({ redirectTo: `/join/${encodeURIComponent(reference)}`, client: supabase });
  const { data } = await supabase.rpc("get_gym_join_status", { join_reference: reference, reference_kind: "qr" });
  const status = data?.[0];
  return <GymJoinConfirmation gymName={status?.gym_name} gymSlug={status?.gym_slug} joinState={(status?.state ?? "invalid") as GymJoinState} kind="qr" reference={reference} />;
}
