import { describe, expect, it } from "vitest";
import type { Tables } from "@/lib/supabase/database.types";
import { ForbiddenError } from "./errors";
import { assertActiveMembership, validateGymId } from "./authorization-core";

const activeMembership: Tables<"gym_memberships"> = {
  id: "50000000-0000-4000-8000-000000000004",
  gym_id: "30000000-0000-4000-8000-000000000001",
  profile_id: "10000000-0000-4000-8000-000000000004",
  role: "member",
  staff_role_id: null,
  status: "active",
  joined_at: "2026-07-17T12:00:00.000Z",
  suspended_at: null,
  left_at: null,
  last_active_at: null,
  created_at: "2026-07-17T12:00:00.000Z",
  updated_at: "2026-07-17T12:00:00.000Z",
};

describe("authorization decisions", () => {
  it("accepts an active membership with an allowed role", () => {
    expect(() => assertActiveMembership(activeMembership, ["member"])).not.toThrow();
  });

  it("rejects missing and inactive memberships", () => {
    expect(() => assertActiveMembership(null)).toThrow(ForbiddenError);
    expect(() => assertActiveMembership({ ...activeMembership, status: "suspended" })).toThrow(
      "An active gym membership is required",
    );
  });

  it("rejects a role outside the allowed set", () => {
    expect(() => assertActiveMembership(activeMembership, ["owner", "staff"])).toThrow(
      "Your gym role does not permit this action",
    );
  });

  it("validates gym identifiers before a query is issued", () => {
    expect(validateGymId(activeMembership.gym_id)).toBe(activeMembership.gym_id);
    expect(() => validateGymId("not-a-uuid")).toThrow("A valid gym ID is required");
  });
});
