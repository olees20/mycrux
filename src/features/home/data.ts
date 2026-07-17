import "server-only";

import { createServerComponentSupabaseClient } from "@/lib/supabase/server";
import { dateInTimezone, isEntitlementActive } from "./data-core";

export async function loadGymHomeData(gymId: string, timezone: string, now = new Date(), includeStaffAudience = false) {
  const supabase = await createServerComponentSupabaseClient();
  const nowIso = now.toISOString();
  const today = dateInTimezone(now, timezone);
  const [announcements, events, routes, community, entitlement, competition] = await Promise.all([
    supabase.from("announcements").select("id,title,body,published_at,priority,is_pinned").eq("gym_id", gymId).eq("status", "published").is("archived_at", null).lte("published_at", nowIso).or(`expires_at.is.null,expires_at.gt.${nowIso}`).in("audience", includeStaffAudience ? ["public", "members", "staff"] : ["public", "members"]).order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(3),
    supabase.from("events").select("id,title,starts_at,ends_at,location").eq("gym_id", gymId).eq("status", "published").is("archived_at", null).in("visibility", ["public", "members"]).gte("ends_at", nowIso).order("starts_at").limit(3),
    supabase.from("routes").select("id,name,colour,grade,set_on,wall_id").eq("gym_id", gymId).eq("status", "published").is("archived_at", null).eq("set_on", today).order("published_at", { ascending: false }).limit(4),
    supabase.from("community_posts").select("id,title,body,post_type,created_at,author_id").eq("gym_id", gymId).eq("visibility", "members").eq("moderation_status", "visible").is("deleted_at", null).order("created_at", { ascending: false }).limit(3),
    supabase.from("feature_entitlements").select("enabled,starts_at,ends_at").eq("gym_id", gymId).eq("feature_key", "occupancy.integration").maybeSingle(),
    supabase.from("competitions").select("id,name,status").eq("gym_id", gymId).in("status", ["registration", "live", "completed"]).is("archived_at", null).order("starts_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const leaderboard = competition.data ? await supabase.from("competition_leaderboard").select("profile_id,total_score,rank").eq("gym_id", gymId).eq("competition_id", competition.data.id).order("rank").limit(3) : { data: [], error: null };
  const profileIds = [...new Set([...(community.data ?? []).map(({ author_id }) => author_id), ...(leaderboard.data ?? []).flatMap(({ profile_id }) => profile_id ? [profile_id] : [])])];
  const profiles = profileIds.length ? await supabase.from("profiles").select("id,display_name").in("id", profileIds) : { data: [], error: null };
  return { announcements, events, routes, community, competition, leaderboard, profiles, occupancyEnabled: isEntitlementActive(entitlement.data, now), occupancyError: entitlement.error };
}
