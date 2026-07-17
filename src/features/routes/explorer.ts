import { z } from "zod";

const value = z.preprocess((input) => Array.isArray(input) ? input[0] : input, z.string().trim().max(100).optional().default(""));
const explorerSchema = z.object({
  wall: value, grade: value, discipline: value, style: value, colour: value, setter: value,
  setSince: z.preprocess((input) => Array.isArray(input) ? input[0] : input, z.union([z.iso.date(), z.literal("")]).optional().default("")),
  view: z.preprocess((input) => Array.isArray(input) ? input[0] : input, z.enum(["map", "list"]).catch("map")),
});

export type ExplorerFilters = z.infer<typeof explorerSchema>;
export type ExplorerRoute = { wall_id: string; grade: string; route_type: string; colour: string; setter_id: string | null; set_on: string | null; tags: string[] };

export function parseExplorerFilters(input: Record<string, string | string[] | undefined>): ExplorerFilters {
  return explorerSchema.parse(input);
}

export function filterExplorerRoutes<T extends ExplorerRoute>(routes: T[], filters: ExplorerFilters) {
  return routes.filter((route) =>
    (!filters.wall || route.wall_id === filters.wall)
    && (!filters.grade || route.grade === filters.grade)
    && (!filters.discipline || route.route_type === filters.discipline)
    && (!filters.style || route.tags.includes(filters.style))
    && (!filters.colour || route.colour === filters.colour)
    && (!filters.setter || route.setter_id === filters.setter)
    && (!filters.setSince || Boolean(route.set_on && route.set_on >= filters.setSince)),
  );
}

export function explorerSearch(filters: ExplorerFilters, changes: Partial<ExplorerFilters> = {}) {
  const next = { ...filters, ...changes }; const params = new URLSearchParams();
  for (const [key, current] of Object.entries(next)) if (current && !(key === "view" && current === "map")) params.set(key, current);
  const query = params.toString(); return query ? `?${query}` : "";
}
