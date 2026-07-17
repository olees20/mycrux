import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("accepts local application paths", () => {
    expect(safeRedirectPath("/app/routes?wall=slab")).toBe("/app/routes?wall=slab");
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "javascript:alert(1)",
    "/app\nSet-Cookie:test",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/app");
  });

  it("uses a validated fallback for absent values", () => {
    expect(safeRedirectPath(null, "/onboarding")).toBe("/onboarding");
  });
});
