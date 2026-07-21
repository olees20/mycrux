import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberFaceDetail, MemberMapStructure } from "@/features/floorplan/member-map";

const { loadFace } = vi.hoisted(() => ({ loadFace: vi.fn<() => Promise<MemberFaceDetail>>() }));
vi.mock("@/features/floorplan/member-map-actions", () => ({ loadMemberFaceAction: loadFace }));

import { MemberGymMap } from "./member-gym-map";

const structures: MemberMapStructure[] = [{
  id: "10000000-0000-4000-8000-000000000001",
  name: "Main Wall",
  start: { x: 4, y: 4 },
  end: { x: 14, y: 4 },
  thicknessMetres: 0.3,
  faces: [{ id: "20000000-0000-4000-8000-000000000001", name: "North Face", widthMetres: 10, heightMetres: 4, angleDegrees: 15, routeCount: 1 }],
}];
const detail: Extract<MemberFaceDetail, { status: "success" }> = {
  status: "success",
  face: structures[0].faces[0],
  holds: [{ id: "hold-1", category: "jug", iconKey: "jug", position: { x: 2, y: 1 }, rotationDegrees: 0, scaleFactor: 1, colour: "#2563eb", label: "" }],
  routes: [{ id: "route-1", name: "Blue V5", colour: "#2563eb", grade: "V5", gradeSystem: "V Scale", discipline: "bouldering", setterName: "Alex", setOn: "2026-07-20", retireOn: "", description: "Technical finish", tags: ["technical"], holdIds: ["hold-1"], favourite: false, submittedFeedback: [] }],
  sessions: [],
};
const props = { gymSlug: "the-crux", gymName: "The Crux", configuration: { widthMetres: 30, heightMetres: 20, gridSizeMetres: 1, showGrid: true }, structures };

describe("MemberGymMap", () => {
  beforeEach(() => loadFace.mockResolvedValue(detail));

  it("lets a member explore a wall and route without exposing editing tools", async () => {
    render(<MemberGymMap {...props} role="member"/>);
    expect(screen.queryByRole("link", { name: /editing tools/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Main Wall, 10.0 metres/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Blue V5/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Blue V5/i }));
    expect(screen.getByRole("heading", { name: "Blue V5" })).toBeInTheDocument();
    expect(screen.getByText("Technical finish")).toBeInTheDocument();
    expect(screen.getByText("Log an ascent")).toBeInTheDocument();
    expect(screen.getByText("Favourite or leave feedback")).toBeInTheDocument();
  });

  it("shows staff a separate editing entry point", () => {
    render(<MemberGymMap {...props} role="route_setter"/>);
    expect(screen.getByRole("link", { name: "Open editing tools" })).toHaveAttribute("href", "/g/the-crux/staff/routes");
  });
});
