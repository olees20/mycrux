import { describe, expect, it } from "vitest";
import { resizeWall, rotateWall, snapPoint, wallAngleDegrees, wallLength, wallRectanglePoints, type FloorplanWall } from "./core";

const configuration = { widthMetres: 30, heightMetres: 20, gridSizeMetres: 1, showGrid: true, snapToGrid: true };
const wall: FloorplanWall = { id: "a", name: "Wall 1", start: { x: 2, y: 2 }, end: { x: 5, y: 6 }, thicknessMetres: 0.2, createdAt: "2026-07-19T00:00:00Z" };

describe("floorplan geometry", () => {
  it("measures wall coordinates in metres", () => expect(wallLength(wall)).toBe(5));

  it("renders a narrow rectangle with the configured thickness", () => {
    const corners = wallRectanglePoints({ ...wall, start: { x: 0, y: 0 }, end: { x: 4, y: 0 } });
    expect(corners).toEqual([{ x: 0, y: 0.1 }, { x: 4, y: 0.1 }, { x: 4, y: -0.1 }, { x: 0, y: -0.1 }]);
  });

  it("prefers adjoining endpoints over grid snapping", () => {
    expect(snapPoint({ x: 5.08, y: 5.96 }, [wall], configuration, 0.15)).toEqual({ x: 5, y: 6 });
    expect(snapPoint({ x: 8.4, y: 8.6 }, [wall], configuration, 0.15)).toEqual({ x: 8, y: 9 });
  });

  it("rotates around the midpoint without changing length", () => {
    const rotated = rotateWall({ ...wall, start: { x: 2, y: 2 }, end: { x: 6, y: 2 } }, 90);
    expect(rotated.start).toEqual({ x: 4, y: 0 });
    expect(rotated.end).toEqual({ x: 4, y: 4 });
    expect(wallAngleDegrees(rotated)).toBe(90);
  });

  it("resizes from the start point while preserving angle", () => {
    const resized = resizeWall(wall, 10);
    expect(wallLength(resized)).toBeCloseTo(10, 3);
    expect(wallAngleDegrees(resized)).toBeCloseTo(wallAngleDegrees(wall), 2);
  });
});
