export type HoldBasedRouteStatus = "draft" | "published" | "retired" | "archived";
export type HoldBasedRouteType = "boulder" | "sport" | "top_rope" | "trad" | "training";

export type RouteHistorySummary = {
  version: number;
  changeKind: "create" | "edit" | "publish" | "retire" | "archive" | "duplicate" | "hold_change" | "wall_change";
  changedAt: string;
  holdCount: number;
  changedFields: string[];
  grade: string;
  setterName: string;
  wallName: string;
  setOn: string;
  dateRemoved: string;
  dateArchived: string;
};

export type HoldBasedRoute = {
  id: string;
  name: string;
  colour: string;
  gradeSystem: string;
  grade: string;
  routeType: HoldBasedRouteType;
  status: HoldBasedRouteStatus;
  setterId: string;
  setOn: string;
  retireOn: string;
  description: string;
  tags: string[];
  holdIds: string[];
  historyRevision: number;
  history: RouteHistorySummary[];
  duplicatedFromRouteId: string | null;
};

export type RouteDefinitionDraft = Omit<HoldBasedRoute, "id" | "historyRevision" | "history" | "duplicatedFromRouteId">;

export type RouteLayerFilters = {
  colour: string;
  grade: string;
  setterId: string;
  routeType: "" | HoldBasedRouteType;
  includeActive: boolean;
  includeArchived: boolean;
};

export const defaultRouteLayerFilters: RouteLayerFilters = { colour: "", grade: "", setterId: "", routeType: "", includeActive: true, includeArchived: false };

export function routeMatchesLayerFilters(route: HoldBasedRoute, filters: RouteLayerFilters) {
  const lifecycleMatches = route.status === "archived" ? filters.includeArchived : filters.includeActive;
  return lifecycleMatches
    && (!filters.colour || route.colour.toLocaleLowerCase() === filters.colour.toLocaleLowerCase())
    && (!filters.grade || route.grade === filters.grade)
    && (!filters.setterId || (filters.setterId === "__unassigned__" ? !route.setterId : route.setterId === filters.setterId))
    && (!filters.routeType || route.routeType === filters.routeType);
}

export function filterRouteLayers(routes: HoldBasedRoute[], filters: RouteLayerFilters) {
  return routes.filter((route) => routeMatchesLayerFilters(route, filters));
}

export type HoldRouteLayer = { colour: string; routeCount: number };

export function buildHoldRouteLayers(routes: HoldBasedRoute[]) {
  const layers = new Map<string, HoldRouteLayer>();
  for (const route of routes) {
    for (const holdId of route.holdIds) {
      const current = layers.get(holdId);
      if (current) current.routeCount += 1;
      else layers.set(holdId, { colour: displayRouteColour(route.colour), routeCount: 1 });
    }
  }
  return layers;
}

export function emptyRouteDefinition(defaults: { gradeSystem: string; grade: string; routeType: HoldBasedRouteType }, setterId = ""): RouteDefinitionDraft {
  return { name: "", colour: "#2563eb", gradeSystem: defaults.gradeSystem, grade: defaults.grade, routeType: defaults.routeType, status: "draft", setterId, setOn: new Date().toISOString().slice(0, 10), retireOn: "", description: "", tags: [], holdIds: [] };
}

export function displayRouteColour(colour: string) {
  return /^#[0-9a-fA-F]{6}$/.test(colour) ? colour : "#2563eb";
}
