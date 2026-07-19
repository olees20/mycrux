import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({ createFirstGymAction: vi.fn() }));
vi.mock("@/features/gyms/actions", () => actionMocks);

import { FirstGymForm } from "./first-gym-form";

describe("FirstGymForm", () => {
  afterEach(() => {
    cleanup();
    actionMocks.createFirstGymAction.mockReset();
    vi.unstubAllGlobals();
  });

  it("derives a URL slug and checks its availability", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, available: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FirstGymForm defaultEmail="owner@example.invalid" />);

    fireEvent.change(screen.getByLabelText(/Gym name/), { target: { value: "North Peak Centre" } });
    expect(screen.getByLabelText(/Gym URL/)).toHaveValue("north-peak-centre");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/onboarding/gym-slug?slug=north-peak-centre",
      expect.objectContaining({ cache: "no-store" }),
    ));
    expect(await screen.findByText("Gym address is available.")).toBeVisible();
  });

  it("marks optional contact fields and prevents submission while a slug is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, available: false }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<FirstGymForm />);

    expect(screen.getByLabelText("Contact email (optional)")).not.toBeRequired();
    expect(screen.getByLabelText("Website (optional)")).not.toBeRequired();
    fireEvent.change(screen.getByLabelText(/Gym URL/), { target: { value: "claimed-gym" } });
    await waitFor(() => expect(screen.getByText("That gym address is already in use.")).toBeVisible());
    expect(screen.getByRole("button", { name: "Create gym" })).toBeDisabled();
  });

  it("disables duplicate submissions and preserves values after a recoverable failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, available: true }) });
    vi.stubGlobal("fetch", fetchMock);
    let finish: ((value: { status: "error"; message: string }) => void) | undefined;
    actionMocks.createFirstGymAction.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<FirstGymForm />);

    fireEvent.change(screen.getByLabelText(/Gym name/), { target: { value: "Retry Wall" } });
    await screen.findByText("Gym address is available.");
    const submit = screen.getByRole("button", { name: "Create gym" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByRole("button", { name: "Creating your gym…" })).toBeDisabled());
    expect(actionMocks.createFirstGymAction).toHaveBeenCalledTimes(1);
    await act(async () => finish?.({ status: "error", message: "Try again." }));
    expect(screen.getByLabelText(/Gym name/)).toHaveValue("Retry Wall");
    expect(screen.getByLabelText(/Gym URL/)).toHaveValue("retry-wall");
  });
});
