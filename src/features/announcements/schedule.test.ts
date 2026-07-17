import { describe,expect,it } from "vitest";
import { isoToZonedInput,zonedDateTimeToIso } from "./schedule";

describe("announcement scheduling",()=>{
  it("stores a gym-local summer time as the correct instant",()=>{
    expect(zonedDateTimeToIso("2026-07-17T09:30","Europe/London")).toBe("2026-07-17T08:30:00.000Z");
    expect(isoToZonedInput("2026-07-17T08:30:00.000Z","Europe/London")).toBe("2026-07-17T09:30");
  });
  it("rejects a daylight-saving gap",()=>expect(()=>zonedDateTimeToIso("2026-03-29T01:30","Europe/London")).toThrow("does not exist"));
});
