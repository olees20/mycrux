import { describe, expect, it, vi } from "vitest";

const write = vi.hoisted(() => vi.fn());
vi.mock("./logger", () => ({ logger: { write } }));

import { createErrorReporter } from "./error-reporting";

describe("error reporting adapter", () => {
  it("does not replace the original failure when a provider is unavailable", async () => {
    const reporter = createErrorReporter({ capture: vi.fn().mockRejectedValue(new Error("provider unavailable")) });
    await expect(reporter.capture({ event: "test_failure", error: new Error("original") })).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ event: "error_reporting_adapter_failed" }));
  });
});
