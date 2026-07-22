import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberGymExperience } from "./member-gym-experience";

vi.mock("next/dynamic", () => ({ default: () => () => <div>3D renderer</div> }));

const props = {
  gymSlug: "the-crux",
  gymName: "The Crux",
  role: "member" as const,
  configuration: { widthMetres: 30, heightMetres: 20, gridSizeMetres: 1, showGrid: true },
  structures: [{ id:"structure-1",name:"Main wall",start:{x:0,y:0},end:{x:10,y:0},thicknessMetres:0.2,faces:[{id:"face-1",name:"North face",widthMetres:10,heightMetres:4,angleDegrees:15,routeCount:3}] }],
};

describe("MemberGymExperience", () => {
  beforeEach(() => vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null));

  it("offers a useful accessible wall list when WebGL is unavailable", async () => {
    render(<MemberGymExperience {...props}/>);
    await waitFor(()=>expect(screen.getByRole("heading",{name:"Explore climbing walls"})).toBeInTheDocument());
    expect(screen.getByRole("heading",{name:"Main wall"})).toBeInTheDocument();
    expect(screen.getByText("North face · 15° · 3 routes")).toBeInTheDocument();
    expect(screen.queryByRole("link",{name:/editing tools/i})).not.toBeInTheDocument();
  });
});
