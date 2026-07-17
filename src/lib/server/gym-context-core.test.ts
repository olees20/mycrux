import { describe, expect, it } from "vitest";
import {
  chooseAccessibleGym,
  gymPath,
  slugLocator,
  type AccessibleGym,
} from "./gym-context-core";

const gyms: AccessibleGym[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    slug: "demo-crux",
    name: "Demo Crux",
    membershipId: "50000000-0000-4000-8000-000000000001",
    role: "member",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    slug: "north-wall",
    name: "North Wall",
    membershipId: "50000000-0000-4000-8000-000000000002",
    role: "owner",
  },
];

describe("gym context selection", () => {
  it("uses an authorised URL slug ahead of the remembered preference", () => {
    expect(chooseAccessibleGym(gyms, {
      slug: "north-wall",
      preferredGymId: gyms[0].id,
    })).toEqual(gyms[1]);
  });

  it("rejects a slug that is not in the server-derived accessible set", () => {
    expect(chooseAccessibleGym(gyms, { slug: "another-tenant" })).toBeNull();
  });

  it("uses the remembered gym and safely falls back when it is unavailable", () => {
    expect(chooseAccessibleGym(gyms, { preferredGymId: gyms[1].id })).toEqual(gyms[1]);
    expect(chooseAccessibleGym(gyms, { preferredGymId: "removed-membership" })).toEqual(gyms[0]);
  });

  it("applies staff roles before selecting either a URL or remembered gym", () => {
    expect(chooseAccessibleGym(gyms, { slug: "demo-crux", allowedRoles: ["owner"] })).toBeNull();
    expect(chooseAccessibleGym(gyms, { allowedRoles: ["owner"] })).toEqual(gyms[1]);
  });

  it("validates slugs and creates only local gym paths", () => {
    expect(slugLocator("North-Wall")).toEqual({ kind: "slug", value: "north-wall" });
    expect(() => slugLocator("../admin")).toThrow("A valid gym slug is required");
    expect(gymPath(gyms[0], "/app/routes")).toBe("/g/demo-crux/app/routes");
    expect(gymPath(gyms[0], "https://attacker.example")).toBe("/g/demo-crux/app");
  });
});
