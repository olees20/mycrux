import { describe, expect, it } from "vitest";
import { securityHeaders } from "./headers";

describe("security headers", () => {
  it("denies embedding and MIME sniffing", () => {
    expect(securityHeaders).toEqual(expect.arrayContaining([
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ]));
  });

  it("uses a restrictive content security policy", () => {
    const policy = securityHeaders.find(({ key }) => key === "Content-Security-Policy")?.value;
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("default-src *");
  });
});
