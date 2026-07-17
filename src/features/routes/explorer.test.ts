import { describe, expect, it } from "vitest";
import { explorerSearch, filterExplorerRoutes, parseExplorerFilters } from "./explorer";

const routes = [
  { id: "one", wall_id: "wall-a", grade: "6A", route_type: "boulder", colour: "Blue", setter_id: "setter-a", set_on: "2026-07-01", tags: ["technical"] },
  { id: "two", wall_id: "wall-b", grade: "6B", route_type: "sport", colour: "Red", setter_id: "setter-b", set_on: "2026-06-01", tags: ["powerful"] },
];

describe("route explorer URL filters", () => {
  it("parses only bounded filter values and defaults to the map", () => {
    expect(parseExplorerFilters({ grade: ["6A", "ignored"], view: "invalid" })).toMatchObject({ grade: "6A", view: "map" });
  });
  it("uses the same deterministic filtering for every presentation", () => {
    const filters = parseExplorerFilters({ wall: "wall-a", style: "technical", setSince: "2026-07-01" });
    expect(filterExplorerRoutes(routes, filters).map(({ id }) => id)).toEqual(["one"]);
  });
  it("preserves active filters when changing view", () => {
    const filters = parseExplorerFilters({ grade: "6A", wall: "wall-a" });
    expect(explorerSearch(filters, { view: "list" })).toBe("?wall=wall-a&grade=6A&view=list");
  });
});
