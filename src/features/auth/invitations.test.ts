import { describe, expect, it } from "vitest";
import { invitationFailureMessage, invitationStatusMessage } from "./invitations";

describe("invitation lifecycle messages", () => {
  it.each([
    [{ code: "22023", message: "Invitation is invalid" }, "invalid"],
    [{ code: "P0001", message: "Invitation has expired" }, "expired"],
    [{ code: "P0001", message: "Invitation has been revoked" }, "revoked"],
    [{ code: "23505", message: "Invitation has already been used" }, "already been used"],
    [{ code: "42501", message: "Invitation belongs to another email address" }, "different email address"],
  ])("maps database failures without collapsing their states", (error, expected) => {
    expect(invitationFailureMessage(error)).toContain(expected);
  });

  it("describes a valid gym invitation", () => {
    expect(invitationStatusMessage("valid", "North Wall")).toBe("This invitation is ready for North Wall.");
  });
});
