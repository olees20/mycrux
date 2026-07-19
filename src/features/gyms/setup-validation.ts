import { z } from "zod";
import { contrastRatio } from "./validation";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const colour = z.string().regex(/^#[0-9A-Fa-f]{6}$/).transform((value) => value.toUpperCase());

export const setupDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter a gym name").max(120),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid contact email")]).transform((value) => value.toLowerCase()),
  contactPhone: optionalText(40),
  primaryColour: colour,
  accentColour: colour,
  backgroundColour: colour,
}).superRefine((value, context) => {
  if (contrastRatio(value.primaryColour, value.backgroundColour) < 4.5) {
    context.addIssue({ code: "custom", path: ["primaryColour"], message: "Primary and background colours need at least 4.5:1 contrast" });
  }
});

export const setupLocationSchema = z.object({
  addressLine1: z.string().trim().min(2, "Enter the street address").max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(2, "Enter the town or city").max(100),
  postcode: z.string().trim().min(2, "Enter the postcode").max(20),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter country code"),
  timezone: z.string().trim().min(1, "Enter an IANA timezone").max(80).refine((value) => {
    try { Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }, "Enter a valid IANA timezone, such as Europe/London"),
});

export const setupClimbingSchema = z.object({
  disciplines: z.array(z.enum(["bouldering", "sport", "trad", "speed", "training"])).min(1, "Choose at least one discipline"),
  gradeSystems: z.string().trim().min(1, "Enter at least one grading system").max(200).transform((value) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]),
  defaultRouteType: z.enum(["boulder", "sport", "top_rope", "trad", "training"]),
  defaultGrade: z.string().trim().min(1, "Enter a default grade").max(20),
}).refine((value) => Array.isArray(value.gradeSystems) && value.gradeSystems.every((item) => item.length <= 30), { path: ["gradeSystems"], message: "Each grading system must be 30 characters or fewer" });

export const setupMembersSchema = z.object({ publicJoinRequestsEnabled: z.boolean() });

export type SetupDetails = z.infer<typeof setupDetailsSchema>;
export type SetupLocation = z.infer<typeof setupLocationSchema>;
export type SetupClimbing = z.infer<typeof setupClimbingSchema>;
