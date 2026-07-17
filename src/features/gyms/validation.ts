import { z } from "zod";

export const reservedGymSlugs = new Set([
  "admin", "api", "app", "auth", "billing", "create", "help", "login",
  "onboarding", "register", "settings", "staff", "support", "www",
]);

export const gymSlugInput = z.string().trim().toLowerCase()
  .min(3).max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens")
  .refine((slug) => !reservedGymSlugs.has(slug), "That gym address is reserved");

const optionalText = (length: number) => z.string().trim().max(length).optional().transform((value) => value || null);

export const gymDetailsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: gymSlugInput,
  addressLine1: z.string().trim().min(2).max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(2).max(100),
  postcode: z.string().trim().min(2).max(20),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  timezone: z.string().trim().min(1).max(80),
  contactEmail: z.email().trim().toLowerCase().max(320),
  contactPhone: optionalText(40),
  disciplines: z.array(z.enum(["bouldering", "sport", "trad", "speed", "training"])).min(1),
  openingHoursText: z.string().trim().min(2).max(2_000),
  publicJoinRequestsEnabled: z.boolean(),
});

const hexColour = z.string().regex(/^#[0-9A-Fa-f]{6}$/).transform((value) => value.toUpperCase());

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableForeground(background: string): "#000000" | "#FFFFFF" {
  return contrastRatio(background, "#000000") >= contrastRatio(background, "#FFFFFF") ? "#000000" : "#FFFFFF";
}

export const gymBrandingSchema = z.object({
  primaryColour: hexColour,
  accentColour: hexColour,
  backgroundColour: hexColour,
  welcomeMessage: optionalText(500),
}).superRefine((branding, context) => {
  if (contrastRatio(branding.primaryColour, branding.backgroundColour) < 4.5) {
    context.addIssue({ code: "custom", path: ["primaryColour"], message: "Primary and background colours need at least 4.5:1 contrast" });
  }
});

export const logoFileSchema = z.instanceof(File)
  .refine((file) => file.size <= 2 * 1024 * 1024, "Logo must be 2 MB or smaller")
  .refine((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type), "Use a PNG, JPEG, or WebP logo");

export async function hasValidLogoSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export type GymDetails = z.infer<typeof gymDetailsSchema>;
export type GymBranding = z.infer<typeof gymBrandingSchema>;
