import { z } from "zod";

export const routeImageSchema = z.instanceof(File)
  .refine((file) => file.size > 0 && file.size <= 10 * 1024 * 1024, "Image must be 10 MB or smaller")
  .refine((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type), "Use a PNG, JPEG, or WebP image");

export async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

const coordinate = z.number().min(0).max(1);
export const routeOverlaySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("point"), x: coordinate, y: coordinate }),
  z.object({ kind: z.literal("polygon"), points: z.array(z.object({ x: coordinate, y: coordinate })).min(3).max(100) }),
]);

export function parseOverlay(value: string) {
  if (!value) return null;
  return routeOverlaySchema.parse(JSON.parse(value));
}
