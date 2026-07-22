import { describe, expect, it } from "vitest";
import { boundsFromPoints, buildWorldSurface, frameBounds, surfaceDepthAt, surfacePoint, triangulateSurface, validateSurfacePolygon } from "./geometry";

const structure = { start: { x: 2, y: 3 }, end: { x: 12, y: 3 } };

describe("digital twin geometry", () => {
  it("converts face-local metres into stable world coordinates", () => {
    expect(surfacePoint(structure, { widthMetres: 10, heightMetres: 4, angleDegrees: 0 }, { u: 2, v: 3, depth: 0 })).toEqual({ x: 4, y: 3, z: 3 });
    const roof = surfacePoint(structure, { widthMetres: 10, heightMetres: 4, angleDegrees: 90 }, { u: 2, v: 3, depth: 0 });
    expect(roof.x).toBeCloseTo(4);
    expect(roof.y).toBeCloseTo(0);
    expect(roof.z).toBeCloseTo(6);
  });

  it("builds a rectangular wall with two triangles and a usable normal", () => {
    const surface = buildWorldSurface(structure, { widthMetres: 10, heightMetres: 4, angleDegrees: 15 });
    expect(surface.vertices).toHaveLength(4);
    expect(surface.triangleIndices).toHaveLength(6);
    expect(Math.hypot(surface.normal.x, surface.normal.y, surface.normal.z)).toBeCloseTo(1);
  });

  it("rejects self-intersecting custom surfaces", () => {
    const crossed = [{ u: 0, v: 0, depth: 0 }, { u: 2, v: 2, depth: 0 }, { u: 0, v: 2, depth: 0 }, { u: 2, v: 0, depth: 0 }];
    expect(validateSurfacePolygon(crossed)).toEqual({ valid: false, reason: "The surface vertices must enclose an area." });
    expect(triangulateSurface(crossed)).toEqual([]);
  });

  it("triangulates a concave but valid custom surface", () => {
    const polygon = [{ u: 0, v: 0, depth: 0 }, { u: 4, v: 0, depth: 0 }, { u: 4, v: 4, depth: 0 }, { u: 2, v: 2, depth: 0 }, { u: 0, v: 4, depth: 0 }];
    expect(validateSurfacePolygon(polygon).valid).toBe(true);
    expect(triangulateSurface(polygon)).toHaveLength(9);
  });

  it("interpolates hold depth across a custom faceted surface",()=>{
    const face={widthMetres:4,heightMetres:4,angleDegrees:0,surfaceKind:"custom" as const,vertices:[{u:0,v:0,depth:0},{u:4,v:0,depth:0},{u:4,v:4,depth:2},{u:0,v:4,depth:2}]};
    expect(surfaceDepthAt(face,2,2)).toBeCloseTo(1);
    expect(surfaceDepthAt(face,2,3)).toBeCloseTo(1.5);
  });

  it("frames arbitrary gym bounds with safe clipping planes", () => {
    const bounds = boundsFromPoints([{ x: -10, y: 0, z: -4 }, { x: 30, y: 8, z: 16 }]);
    const frame = frameBounds(bounds, 16 / 9);
    expect(frame.target).toEqual({ x: 10, y: 4, z: 6 });
    expect(frame.distance).toBeGreaterThan(20);
    expect(frame.near).toBeGreaterThan(0);
    expect(frame.far).toBeGreaterThan(frame.distance);
  });
});
