import { describe, expect, it } from "vitest";
import { clampCanvasPoint, metreRulerTicks, snapCanvasPoint } from "./wall-canvas";

describe("permanent wall canvas coordinates", () => {
  it("uses bounded metre coordinates", () => expect(clampCanvasPoint({ x: -1, y: 8 }, 6, 5)).toEqual({ x: 0, y: 5 }));
  it("snaps to the configured metre interval", () => expect(snapCanvasPoint({ x: 2.13, y: 3.88 }, 10, 6, 0.25, true)).toEqual({ x: 2.25, y: 4 }));
  it("retains millimetre precision when snapping is disabled", () => expect(snapCanvasPoint({ x: 2.1234, y: 3.8765 }, 10, 6, 1, false)).toEqual({ x: 2.123, y: 3.877 }));
  it("builds whole-metre ruler marks through the measured edge", () => expect(metreRulerTicks(3.7)).toEqual([0, 1, 2, 3]));
});
