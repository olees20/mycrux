import { describe, expect, it } from "vitest";
import { pageHref, parsePage } from "./pagination";

describe("pagination", () => {
  it("accepts bounded positive integer pages", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("999999")).toBe(1);
  });

  it("preserves filters while replacing page", () => {
    expect(pageHref("/items", { page: "4", q: "blue", tag: ["new", "gym"] }, 2)).toBe("/items?q=blue&tag=new&tag=gym&page=2");
  });
});
