import { describe, expect, it } from "vitest";
import { hasValidBearerSecret } from "./request-auth";

describe("operations bearer authentication", () => {
  it("accepts only an exact bearer value", () => {
    const secret = "a-long-operations-secret-value";
    expect(hasValidBearerSecret(new Request("https://crux.test", { headers: { authorization: `Bearer ${secret}` } }), secret)).toBe(true);
    expect(hasValidBearerSecret(new Request("https://crux.test", { headers: { authorization: "Bearer wrong" } }), secret)).toBe(false);
    expect(hasValidBearerSecret(new Request("https://crux.test"), secret)).toBe(false);
  });
});
