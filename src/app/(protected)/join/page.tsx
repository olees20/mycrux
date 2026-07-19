import { GymJoinConfirmation } from "@/components/gym-join-form";
import { normalizeGymCode, type GymJoinState } from "@/features/gym-access/core";
import { requireUser } from "@/lib/server/authorization";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

export default async function ManualGymJoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = normalizeGymCode((await searchParams).code ?? "");
  const supabase = await createServerComponentSupabaseClient();
  await requireUser({ redirectTo: `/join?code=${encodeURIComponent(code)}`, client: supabase });
  const { data, error } = await supabase.rpc("get_gym_join_status", { join_reference: code, reference_kind: "code" });
  const status = data?.[0];
  const state = error?.message?.toLowerCase().includes("too many") ? "rate_limited" : (status?.state ?? "invalid") as GymJoinState;
  return <GymJoinConfirmation gymName={status?.gym_name} gymSlug={status?.gym_slug} joinState={state} kind="code" reference={code} />;
}
