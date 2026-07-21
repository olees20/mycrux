import { describe, expect, it } from "vitest";
import { duplicateHold, holdCategories, normalizeRotation, type WallHold } from "./holds";

const hold: WallHold = { id: "one", category: "crimp", iconKey: "crimp", position: { x: 4.9, y: 2 }, rotationDegrees: 0, scaleFactor: 1, metadata: { label: "", colour: "#65a30d", manufacturer: "", model: "", purchaseDate: "", condition: "good", notes: "" }, createdAt: "2026-07-19T00:00:00Z" };

describe("route-independent holds", () => {
  it("supports every required category", () => expect(holdCategories).toEqual(["jug","crimp","sloper","pinch","pocket","edge","volume","macro","dual_texture","foothold"]));
  it("normalizes rotation into canvas degrees", () => { expect(normalizeRotation(-15)).toBe(345); expect(normalizeRotation(375)).toBe(15); });
  it("duplicates metadata and clamps the new wall-local position", () => { const copy = duplicateHold(hold, "two", 5, 3, 0.25); expect(copy).toMatchObject({ id: "two", position: { x: 5, y: 2.25 } }); expect(copy.metadata).not.toBe(hold.metadata); });
});
