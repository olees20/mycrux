import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redacts sensitive fields and bearer values recursively", () => {
    const output = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logger.write({
      level: "warn",
      event: "security_test",
      context: { password: "hunter2", nested: { note: "Bearer abc.def", signatureText: "signed" } },
      error: new Error("failed at /callback?token=visible&next=/app"),
    });
    const payload = output.mock.calls[0]?.[0] as string;
    expect(payload).not.toContain("hunter2");
    expect(payload).not.toContain("abc.def");
    expect(payload).not.toContain("visible");
    expect(payload).not.toContain("signed");
    expect(payload).toContain("[REDACTED]");
  });
});
