import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type AppSupabaseClient = SupabaseClient<Database>;
export type GymRole = "owner" | "staff" | "route_setter" | "member";
export type MembershipStatus = "invited" | "active" | "suspended" | "left";
