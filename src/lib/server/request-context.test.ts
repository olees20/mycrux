import { describe, expect, it } from "vitest";
import { correlationIdFromRequest } from "./request-context";

describe("request correlation", () => {
  it("preserves a valid upstream identifier", () => {
    expect(correlationIdFromRequest(new Request("https://crux.test", { headers: { "x-request-id": "edge:request-42" } }))).toBe("edge:request-42");
  });

  it("replaces unsafe identifiers", () => {
    const value = correlationIdFromRequest(new Request("https://crux.test", { headers: { "x-request-id": "bad id secret" } }));
    expect(value).toMatch(/^[0-9a-f-]{36}$/);
  });
});
