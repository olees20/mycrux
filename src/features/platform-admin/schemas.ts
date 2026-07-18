import { z } from "zod";

export const platformGymSummarySchema = z.object({
  id: z.uuid(), slug: z.string(), name: z.string(), status: z.string(), created_at: z.string(), suspended_at: z.string().nullable(),
  onboarding_state: z.enum(["ready", "owner_required", "suspended"]), member_count: z.number(), subscription_status: z.string().nullable(), plan_key: z.string().nullable(),
});

const supportNoteSchema = z.object({ id: z.uuid(), note: z.string(), created_at: z.string(), author: z.string() });
const auditEventSchema = z.object({ id: z.uuid(), action: z.string(), target_type: z.string(), target_id: z.uuid().nullable(), outcome: z.string(), created_at: z.string() });
const entitlementSchema = z.object({ feature_key: z.string(), enabled: z.boolean(), limit_value: z.number().nullable(), source: z.string(), ends_at: z.string().nullable() });
const subscriptionSchema = z.object({ plan_key: z.string(), status: z.string(), current_period_end: z.string().nullable(), grace_ends_at: z.string().nullable() });

export const platformGymSupportSchema = z.object({
  gym: z.object({ id: z.uuid(), slug: z.string(), name: z.string(), status: z.string(), created_at: z.string(), suspended_at: z.string().nullable(), suspension_reason: z.string().nullable() }),
  membership_counts: z.record(z.string(), z.number()),
  subscription: subscriptionSchema.nullable(),
  entitlements: z.array(entitlementSchema),
  support_notes: z.array(supportNoteSchema),
  audit_events: z.array(auditEventSchema),
});

export const platformGymListSchema = z.array(platformGymSummarySchema);
