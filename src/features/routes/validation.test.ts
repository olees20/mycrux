import { describe, expect, it } from "vitest";
import { hasValidImageSignature, parseOverlay, routeImageSchema } from "./validation";

describe("route and wall validation", () => {
  it("accepts normalized points and polygons", () => {
    expect(parseOverlay('{"kind":"point","x":0.25,"y":1}')).toEqual({ kind: "point", x: 0.25, y: 1 });
    expect(parseOverlay('{"kind":"polygon","points":[{"x":0,"y":0},{"x":1,"y":0},{"x":0.5,"y":1}]}')).toMatchObject({ kind: "polygon" });
  });
  it("rejects out-of-bounds and incomplete overlays", () => {
    expect(() => parseOverlay('{"kind":"point","x":-0.1,"y":0.5}')).toThrow();
    expect(() => parseOverlay('{"kind":"polygon","points":[{"x":0,"y":0}]}')).toThrow();
  });
  it("checks image size, type, and signature", async () => {
    const png = new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])], "wall.png", { type: "image/png" });
    const fake = new File(["not png"], "wall.png", { type: "image/png" });
    expect(routeImageSchema.safeParse(png).success).toBe(true);
    expect(await hasValidImageSignature(png)).toBe(true);
    expect(await hasValidImageSignature(fake)).toBe(false);
  });
});
