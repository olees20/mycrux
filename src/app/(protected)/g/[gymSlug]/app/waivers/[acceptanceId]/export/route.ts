import { NextResponse } from "next/server";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

export async function GET(_request: Request, { params }: { params: Promise<{ gymSlug: string; acceptanceId: string }> }) {
  const { gymSlug, acceptanceId } = await params; const { gym } = await requireActiveGymContext({ gymSlug }); const supabase = await createRouteHandlerSupabaseClient();
  const { data } = await supabase.from("waiver_acceptances").select("id,accepted_name,accepted_at,date_of_birth,age_confirmed,emergency_contact_name,emergency_contact_phone,signature_text,consent_snapshot,evidence,retention_until,waiver_versions(version,title,content,content_hash,requirements,waivers(name))").eq("id", acceptanceId).eq("gym_id", gym.id).single();
  if (!data) return NextResponse.json({ error: "Signed waiver not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Content-Disposition": `attachment; filename="waiver-${data.id}.json"`, "Cache-Control": "private, no-store" } });
}
