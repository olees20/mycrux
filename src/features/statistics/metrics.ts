export type StatAscent = Readonly<{ sessionDate: string; outcome: string; attempts: number; grade: string; gradeSystem: string }>;
export type StatSession = Readonly<{ id: string; sessionDate: string }>;

const sends = new Set(["flash", "onsight", "redpoint", "repeat"]);
const fontGrades = ["3", "4", "4+", "5", "5+", "6A", "6A+", "6B", "6B+", "6C", "6C+", "7A", "7A+", "7B", "7B+", "7C", "7C+", "8A", "8A+", "8B", "8B+", "8C", "8C+", "9A", "9A+", "9B", "9B+", "9C"];

function weekStart(value: string) { const date = new Date(`${value}T12:00:00Z`); const day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() - day + 1); return date.toISOString().slice(0, 10); }
function longestWeeklyStreak(dates: readonly string[]) { const weeks = [...new Set(dates.map(weekStart))].sort(); let longest = 0, current = 0, previous = ""; for (const week of weeks) { const consecutive = previous && (new Date(`${week}T00:00:00Z`).getTime() - new Date(`${previous}T00:00:00Z`).getTime()) === 7 * 86_400_000; current = consecutive ? current + 1 : 1; longest = Math.max(longest, current); previous = week; } return longest; }

export function localDateKey(instant: Date, timeZone: string) { const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant); const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""; return `${value("year")}-${value("month")}-${value("day")}`; }

export function calculateStatistics(ascents: readonly StatAscent[], sessions: readonly StatSession[]) {
  const successful = ascents.filter((item) => sends.has(item.outcome)); const gradeMap = new Map<string, number>(); const monthMap = new Map<string, number>();
  for (const item of successful) { const key = `${item.gradeSystem} ${item.grade}`; gradeMap.set(key, (gradeMap.get(key) ?? 0) + 1); const month = item.sessionDate.slice(0, 7); monthMap.set(month, (monthMap.get(month) ?? 0) + 1); }
  const comparable = successful.filter((item) => item.gradeSystem.toLowerCase() === "font" && fontGrades.includes(item.grade.toUpperCase())); comparable.sort((a, b) => fontGrades.indexOf(b.grade.toUpperCase()) - fontGrades.indexOf(a.grade.toUpperCase()));
  return {
    sessions: new Set(sessions.map(({ id }) => id)).size,
    climbs: successful.length,
    attempts: ascents.reduce((total, item) => total + item.attempts, 0),
    successRate: ascents.length ? successful.length / ascents.length : null,
    flashes: ascents.filter(({ outcome }) => outcome === "flash").length,
    longestWeeklyStreak: longestWeeklyStreak(sessions.map(({ sessionDate }) => sessionDate)),
    bestSend: comparable[0] ? `${comparable[0].gradeSystem} ${comparable[0].grade}` : null,
    gradeDistribution: [...gradeMap].sort(([a], [b]) => a.localeCompare(b)).map(([grade, count]) => ({ grade, count })),
    monthlyProgress: [...monthMap].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
  };
}
