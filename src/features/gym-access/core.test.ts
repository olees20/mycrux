import { describe, expect, it } from "vitest";
import { formatGymCode, gymJoinErrorMessage, normalizeGymCode } from "./core";

describe("gym access code helpers", () => {
  it("normalizes case and optional separators", () => {
    expect(normalizeGymCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(formatGymCode("abcdefgh")).toBe("ABCD-EFGH");
  });

  it("maps rotation and rate-limit failures to actionable copy", () => {
    expect(gymJoinErrorMessage({ message: "Gym access code has been rotated" })).toContain("replaced");
    expect(gymJoinErrorMessage({ message: "Too many gym code attempts" })).toContain("15 minutes");
  });
});
