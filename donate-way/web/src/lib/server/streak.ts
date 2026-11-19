import "server-only";

// Weekly giving streak: consecutive weeks (Sat–Fri, the Arab week) with at least one completed donation,
// ending this week or last week (so it doesn't break before the user had a chance to give this week).
const WEEK = 7 * 86_400_000;
// 2000-01-01 was a Saturday; weeks are counted from there.
const EPOCH = Date.UTC(2000, 0, 1);

export const weekIndex = (d: Date | string) => Math.floor((new Date(d).getTime() - EPOCH) / WEEK);

export function givingStreak(dates: (string | null)[]): { weeks: number; givenThisWeek: boolean } {
  const weeks = new Set(dates.filter(Boolean).map((d) => weekIndex(d!)));
  const now = weekIndex(new Date());
  const givenThisWeek = weeks.has(now);
  let w = givenThisWeek ? now : now - 1;
  let count = 0;
  while (weeks.has(w)) {
    count++;
    w--;
  }
  return { weeks: count, givenThisWeek };
}
