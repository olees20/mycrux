import { describe, expect, it } from "vitest";
import { buildHoldRouteLayers, defaultRouteLayerFilters, displayRouteColour, emptyRouteDefinition, filterRouteLayers, type HoldBasedRoute } from "./definitions";

const route = (values: Partial<HoldBasedRoute>): HoldBasedRoute => ({ id: "route", name: "Route", colour: "#2563eb", gradeSystem: "font", grade: "6A", routeType: "boulder", status: "published", setterId: "setter-a", setOn: "", retireOn: "", description: "", tags: [], holdIds: ["hold-a"], historyRevision: 1, history: [], duplicatedFromRouteId: null, ...values });

describe("hold-based route definitions", () => {
  it("starts as a draft with no selected holds", () => {
    const route = emptyRouteDefinition({ gradeSystem: "font", grade: "6A", routeType: "boulder" }, "setter");
    expect(route).toMatchObject({ status: "draft", setterId: "setter", holdIds: [], grade: "6A" });
  });

  it("uses a safe visual fallback for legacy named colours", () => {
    expect(displayRouteColour("#aabbcc")).toBe("#aabbcc");
    expect(displayRouteColour("Purple")).toBe("#2563eb");
  });

  it("filters route layers by visual and lifecycle fields", () => {
    const routes = [route({ id: "active", grade: "6B" }), route({ id: "archived", grade: "6B", status: "archived" }), route({ id: "other", grade: "7A", routeType: "sport" })];
    expect(filterRouteLayers(routes, { ...defaultRouteLayerFilters, grade: "6B" }).map(({ id }) => id)).toEqual(["active"]);
    expect(filterRouteLayers(routes, { ...defaultRouteLayerFilters, includeActive: false, includeArchived: true }).map(({ id }) => id)).toEqual(["archived"]);
  });

  it("collapses hundreds of route memberships into one state per physical hold", () => {
    const routes = Array.from({ length: 500 }, (_, index) => route({ id: `route-${index}`, holdIds: ["shared", `hold-${index}`] }));
    const layers = buildHoldRouteLayers(routes);
    expect(layers.size).toBe(501);
    expect(layers.get("shared")?.routeCount).toBe(500);
  });
});
