import { describe, expect, it } from "vitest";
import { faceInclineLabel, moveFace, type ClimbingFace } from "./faces";

const faces: ClimbingFace[] = ["North", "South", "Roof"].map((name, sortOrder) => ({ id: name, structureId: "wall", name, widthMetres: 5, heightMetres: 4, climbingAngleDegrees: 0, notes: "", sortOrder, createdAt: "2026-07-19T00:00:00Z", routeCount: 0 }));

describe("wall structure faces", () => {
  it("reorders and normalizes face positions", () => expect(moveFace(faces, "South", -1).map(({ name, sortOrder }) => [name, sortOrder])).toEqual([["South", 0], ["North", 1], ["Roof", 2]]));
  it("does not move a face beyond the list boundary", () => expect(moveFace(faces, "North", -1)).toBe(faces));
  it("describes the climbing angle convention", () => {
    expect(faceInclineLabel(-10)).toBe("Slab"); expect(faceInclineLabel(0)).toBe("Vertical"); expect(faceInclineLabel(25)).toBe("Overhang"); expect(faceInclineLabel(90)).toBe("Roof");
  });
});
