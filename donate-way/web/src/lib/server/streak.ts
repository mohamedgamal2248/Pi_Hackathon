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

// Daily streak (Cairo time, UTC+2): consecutive days with a completed donation, ending today or yesterday.
const DAY = 86_400_000;
const dayIndex = (d: Date | string) => Math.floor((new Date(d).getTime() + 2 * 3_600_000) / DAY);

export function dailyStreak(dates: (string | null)[]): { days: number; best: number; givenToday: boolean } {
  const days = new Set(dates.filter(Boolean).map((d) => dayIndex(d!)));
  const today = dayIndex(new Date());
  const givenToday = days.has(today);
  let d = givenToday ? today : today - 1;
  let count = 0;
  while (days.has(d)) {
    count++;
    d--;
  }
  const sorted = [...days].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((x, i) => {
    run = i > 0 && x === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return { days: count, best, givenToday };
}
