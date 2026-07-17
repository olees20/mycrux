import { describe, expect, it } from "vitest";
import { contrastRatio, gymBrandingSchema, gymSlugInput, hasValidLogoSignature, logoFileSchema, readableForeground } from "./validation";

describe("gym onboarding validation", () => {
  it("normalises safe slugs and rejects reserved or malformed paths", () => {
    expect(gymSlugInput.parse(" North-Wall ")).toBe("north-wall");
    expect(() => gymSlugInput.parse("admin")).toThrow("reserved");
    expect(() => gymSlugInput.parse("north/wall")).toThrow();
  });

  it("enforces WCAG AA contrast for primary text against the background", () => {
    expect(contrastRatio("#17211B", "#F7F7F2")).toBeGreaterThan(4.5);
    expect(gymBrandingSchema.safeParse({ primaryColour: "#777777", accentColour: "#D9FF45", backgroundColour: "#888888", welcomeMessage: "Welcome" }).success).toBe(false);
    expect(readableForeground("#17211B")).toBe("#FFFFFF");
    expect(readableForeground("#D9FF45")).toBe("#000000");
  });

  it("allow-lists raster logo types and caps files at two megabytes", () => {
    expect(logoFileSchema.safeParse(new File(["logo"], "logo.png", { type: "image/png" })).success).toBe(true);
    expect(logoFileSchema.safeParse(new File(["<svg/>"] , "logo.svg", { type: "image/svg+xml" })).success).toBe(false);
    expect(logoFileSchema.safeParse(new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.webp", { type: "image/webp" })).success).toBe(false);
  });

  it("checks image signatures instead of trusting the submitted MIME type", async () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(hasValidLogoSignature(new File([pngHeader], "logo.png", { type: "image/png" }))).resolves.toBe(true);
    await expect(hasValidLogoSignature(new File(["not an image"], "fake.png", { type: "image/png" }))).resolves.toBe(false);
  });
});
