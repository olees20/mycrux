import type { Point } from "./core";

export const holdCategories = ["jug", "crimp", "sloper", "pinch", "pocket", "edge", "volume", "macro", "dual_texture", "foothold"] as const;
export type HoldCategory = typeof holdCategories[number];
export const holdConditions = ["new", "good", "fair", "worn", "damaged", "retired"] as const;
export type HoldCondition = typeof holdConditions[number];
export type HoldMetadata = { label: string; colour: string; manufacturer: string; model: string; purchaseDate: string; condition: HoldCondition; notes: string };
export type WallHold = { id: string; category: HoldCategory; iconKey: HoldCategory; position: Point; rotationDegrees: number; scaleFactor: number; metadata: HoldMetadata; createdAt: string };
export type HoldInventoryEvent = { id: number; eventType: string; routeName: string | null; wallName: string | null; createdAt: string };

export const holdCategoryLabel = (category: HoldCategory) => category.replaceAll("_", " ");
export const normalizeRotation = (degrees: number) => ((degrees % 360) + 360) % 360;

export function duplicateHold(hold: WallHold, id: string, widthMetres: number, heightMetres: number, offsetMetres: number): WallHold {
  return { ...hold, id, position: { x: Math.min(widthMetres, Math.max(0, Math.round((hold.position.x + offsetMetres) * 1000) / 1000)), y: Math.min(heightMetres, Math.max(0, Math.round((hold.position.y + offsetMetres) * 1000) / 1000)) }, metadata: { ...hold.metadata }, createdAt: new Date().toISOString() };
}

export function serializeHold(hold: WallHold) {
  return { id: hold.id, category: hold.category, iconKey: hold.iconKey, positionXMetres: hold.position.x, positionYMetres: hold.position.y, rotationDegrees: normalizeRotation(hold.rotationDegrees), scaleFactor: hold.scaleFactor, metadata: hold.metadata };
}
