"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { holdCategories, holdConditions } from "./holds";
import { requireActiveGymContext } from "@/lib/server/gym-context";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server";

const category = z.enum(holdCategories);
const metadata = z.object({ label: z.string().trim().max(100), colour: z.string().regex(/^#[0-9a-fA-F]{6}$/), manufacturer: z.string().trim().max(100), model: z.string().trim().max(120), purchaseDate: z.union([z.iso.date(),z.literal("")]), condition: z.enum(holdConditions), notes: z.string().trim().max(1000) });
const hold = z.object({ id: z.uuid(), category, iconKey: category, positionXMetres: z.number().min(0).max(200), positionYMetres: z.number().min(0).max(100), rotationDegrees: z.number().min(0).lt(360), scaleFactor: z.number().min(0.1).max(10), metadata });
const schema = z.object({ gymSlug: z.string().trim().min(1).max(80), faceId: z.uuid(), expectedRevision: z.number().int().nonnegative(), widthMetres: z.number().min(0.1).max(200), heightMetres: z.number().min(0.1).max(100), holds: z.array(hold).max(10000) }).superRefine((value, context) => value.holds.forEach((item, index) => { if (item.positionXMetres > value.widthMetres || item.positionYMetres > value.heightMetres) context.addIssue({ code: "custom", path: ["holds", index, "position"], message: "A hold lies outside the measured wall." }); }));
export type SaveWallHoldsInput = z.input<typeof schema>;
export type SaveWallHoldsResult = { status: "success"; revision: number; message: string } | { status: "error"; message: string; conflict?: boolean };
export type HoldOperationResult = { status:"success"; message:string; revision?:number; holdId?:string; routeRevisions?:Record<string,number> } | { status:"error"; message:string; conflict?:boolean };

export async function saveWallHoldsAction(input: SaveWallHoldsInput): Promise<SaveWallHoldsResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the hold values." };
  const { gym } = await requireActiveGymContext({ gymSlug: parsed.data.gymSlug, allowedRoles: ["owner"] });
  const supabase = await createServerComponentSupabaseClient();
  const { data, error } = await supabase.rpc("save_wall_holds", { target_gym_id: gym.id, target_face_id: parsed.data.faceId, expected_revision: parsed.data.expectedRevision, hold_payload: parsed.data.holds });
  if (error) {
    const conflict = error.code === "40001" || error.message.includes("another session");
    return { status: "error", conflict, message: conflict ? "The hold library changed in another session. Reload before saving again." : "The holds could not be saved. Check their positions and metadata." };
  }
  const result = data as { revision?: number } | null;
  revalidatePath(`/g/${gym.slug}/staff/floorplan/faces/${parsed.data.faceId}`);
  return { status: "success", revision: result?.revision ?? parsed.data.expectedRevision + 1, message: "Hold library saved." };
}

const assignmentSchema=z.object({gymSlug:z.string().trim().min(1).max(80),faceId:z.uuid(),routeRevisions:z.record(z.uuid(),z.number().int().positive()),assignments:z.array(z.object({holdId:z.uuid(),routeIds:z.array(z.uuid()).max(1000)})).max(100)});
export async function saveHoldRouteAssignmentsAction(input:z.input<typeof assignmentSchema>):Promise<HoldOperationResult>{
  const parsed=assignmentSchema.safeParse(input);if(!parsed.success)return{status:"error",message:parsed.error.issues[0]?.message??"Check the route assignments."};
  const{gym}=await requireActiveGymContext({gymSlug:parsed.data.gymSlug,allowedRoles:["owner"]});const supabase=await createServerComponentSupabaseClient();
  const{data,error}=await supabase.rpc("save_hold_route_assignments",{target_gym_id:gym.id,target_face_id:parsed.data.faceId,expected_route_revisions:parsed.data.routeRevisions,assignment_payload:parsed.data.assignments});
  if(error){const conflict=error.code==="40001";return{status:"error",conflict,message:conflict?"A route changed in another session. Reload before saving assignments.":"Route assignments could not be saved."};}
  revalidatePath(`/g/${gym.slug}/staff/floorplan/faces/${parsed.data.faceId}`);revalidatePath(`/g/${gym.slug}/app/routes`);
  return{status:"success",message:"Hold route assignments saved with new route history revisions.",routeRevisions:(data??{})as Record<string,number>};
}

const physicalOperationSchema=z.object({gymSlug:z.string().trim().min(1).max(80),faceId:z.uuid(),holdId:z.uuid(),expectedRevision:z.number().int().nonnegative(),replacementHoldId:z.uuid().optional()});
export async function replacePhysicalHoldAction(input:z.input<typeof physicalOperationSchema>):Promise<HoldOperationResult>{
  const parsed=physicalOperationSchema.safeParse(input);if(!parsed.success||!parsed.data.replacementHoldId)return{status:"error",message:"The replacement hold details are invalid."};
  const{gym}=await requireActiveGymContext({gymSlug:parsed.data.gymSlug,allowedRoles:["owner"]});const supabase=await createServerComponentSupabaseClient();
  const{data,error}=await supabase.rpc("replace_physical_hold",{target_gym_id:gym.id,target_hold_id:parsed.data.holdId,replacement_hold_id:parsed.data.replacementHoldId,expected_holds_revision:parsed.data.expectedRevision});
  if(error){const conflict=error.code==="40001";return{status:"error",conflict,message:conflict?"The Hold Library changed in another session. Reload first.":"The physical hold could not be replaced."};}
  const result=data as{hold_id:string;revision:number};revalidatePath(`/g/${gym.slug}/staff/floorplan/faces/${parsed.data.faceId}`);revalidatePath(`/g/${gym.slug}/staff/holds`);
  return{status:"success",message:"Physical hold replaced and every active route updated.",holdId:result.hold_id,revision:Number(result.revision)};
}

export async function retirePhysicalHoldAction(input:z.input<typeof physicalOperationSchema>):Promise<HoldOperationResult>{
  const parsed=physicalOperationSchema.safeParse(input);if(!parsed.success)return{status:"error",message:"The physical hold details are invalid."};
  const{gym}=await requireActiveGymContext({gymSlug:parsed.data.gymSlug,allowedRoles:["owner"]});const supabase=await createServerComponentSupabaseClient();
  const{data,error}=await supabase.rpc("retire_physical_hold",{target_gym_id:gym.id,target_hold_id:parsed.data.holdId,expected_holds_revision:parsed.data.expectedRevision});
  if(error){const conflict=error.code==="40001";return{status:"error",conflict,message:conflict?"The Hold Library changed in another session. Reload first.":"The physical hold could not be retired."};}
  const result=data as{hold_id:string;revision:number};revalidatePath(`/g/${gym.slug}/staff/floorplan/faces/${parsed.data.faceId}`);revalidatePath(`/g/${gym.slug}/staff/holds`);
  return{status:"success",message:"Physical hold retired. Route and inventory history were preserved.",holdId:result.hold_id,revision:Number(result.revision)};
}
