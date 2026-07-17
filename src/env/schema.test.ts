import { describe, expect, it } from "vitest";
import { parsePublicEnvironment, parseServerEnvironment } from "./schema";

const publicValues = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("environment validation", () => {
  it("accepts valid public configuration", () => {
    expect(parsePublicEnvironment(publicValues)).toEqual(publicValues);
  });

  it("reports every missing required server value", () => {
    expect(() => parseServerEnvironment({})).toThrowError(/SUPABASE_SERVICE_ROLE_KEY is required/);
    expect(() => parseServerEnvironment({})).toThrowError(/STRIPE_WEBHOOK_SECRET is required/);
  });

  it("rejects malformed URLs", () => {
    expect(() => parsePublicEnvironment({ ...publicValues, NEXT_PUBLIC_SITE_URL: "localhost" })).toThrowError(/valid URL/);
  });
});
