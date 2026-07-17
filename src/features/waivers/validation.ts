import { z } from "zod";

export const requirementsSchema = z.object({
  collect_date_of_birth: z.boolean(), require_age_confirmation: z.boolean(), minimum_age: z.number().int().min(1).max(120), collect_emergency_contact: z.boolean(), consent_items: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});
export type WaiverRequirements = z.infer<typeof requirementsSchema>;

export const acceptanceSchema = z.object({
  accepted_name: z.string().trim().min(1).max(160), signature_text: z.string().trim().min(1).max(160), date_of_birth: z.union([z.iso.date(), z.literal("")]), age_confirmed: z.boolean(), emergency_contact_name: z.string().trim().max(160), emergency_contact_phone: z.string().trim().max(40), consents: z.array(z.string().min(1).max(500)).min(1).max(20), user_agent: z.string().max(1000),
});
