import { describe, expect, it } from "vitest";
import { calculateStatistics, localDateKey } from "./metrics";

describe("statistics definitions", () => {
  it("handles sparse data without inventing a success rate or best send", () => { expect(calculateStatistics([], [])).toMatchObject({ sessions: 0, climbs: 0, attempts: 0, successRate: null, bestSend: null, longestWeeklyStreak: 0 }); });
  it("counts send entries, summed attempts, flashes and comparable Font grades", () => { const result = calculateStatistics([{ sessionDate: "2026-01-31", outcome: "flash", attempts: 1, grade: "6A", gradeSystem: "font" }, { sessionDate: "2026-02-01", outcome: "project", attempts: 5, grade: "7A", gradeSystem: "font" }, { sessionDate: "2026-02-02", outcome: "redpoint", attempts: 3, grade: "6B", gradeSystem: "font" }], [{ id: "a", sessionDate: "2026-01-31" }]); expect(result).toMatchObject({ climbs: 2, attempts: 9, flashes: 1, successRate: 2 / 3, bestSend: "font 6B" }); expect(result.monthlyProgress).toEqual([{ month: "2026-01", count: 1 }, { month: "2026-02", count: 1 }]); });
  it("uses Monday-to-Sunday boundaries for consecutive-week streaks", () => { const sessions = ["2025-12-29", "2026-01-04", "2026-01-05", "2026-01-12", "2026-01-19"].map((sessionDate, index) => ({ id: String(index), sessionDate })); expect(calculateStatistics([], sessions).longestWeeklyStreak).toBe(4); });
  it("derives dates in the gym timezone at year and DST boundaries", () => { expect(localDateKey(new Date("2025-12-31T23:30:00Z"), "Pacific/Auckland")).toBe("2026-01-01"); expect(localDateKey(new Date("2026-03-29T00:30:00Z"), "Europe/London")).toBe("2026-03-29"); });
});
