import "server-only";
import { db } from "./db";

// Seasons: every Friday ("Jumu'ah of giving") and the whole month of Ramadan. Calendar math uses Cairo time
// (UTC+2) and the Umm al-Qura hijri calendar from Intl; no external service.
const DAY = 86_400_000;
const OFFSET = 2 * 3_600_000;
export const FRIDAY_GOAL = 100;
export const RAMADAN_GOAL = 5000;

const hijriFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "Africa/Cairo", month: "numeric", day: "numeric", year: "numeric" });
export function hijri(d: Date): { y: number; m: number; d: number } {
  const p = Object.fromEntries(hijriFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: parseInt(p.relatedYear ?? p.year, 10), m: parseInt(p.month, 10), d: parseInt(p.day, 10) };
}
export const cairoDayStart = (d: Date) => new Date(Math.floor((d.getTime() + OFFSET) / DAY) * DAY - OFFSET);
export const isFriday = (d: Date) => new Date(d.getTime() + OFFSET).getUTCDay() === 5;

export type Season = {
  kind: "ramadan" | "friday" | null;
  startsAt: string | null;
  endsAt: string | null;
  ramadanDay: number | null;
  lastTen: boolean;
  goal: number;
  daysToFriday: number;
  daysToRamadan: number | null;
};

export function currentSeason(now = new Date()): Season {
  const today = cairoDayStart(now);
  const h = hijri(now);
  const base = { daysToFriday: (5 - new Date(now.getTime() + OFFSET).getUTCDay() + 7) % 7, lastTen: false, ramadanDay: null as number | null };
  let daysToRamadan: number | null = null;
  if (h.m !== 9) {
    for (let i = 1; i <= 400; i++) {
      const x = hijri(new Date(today.getTime() + i * DAY + 12 * 3_600_000));
      if (x.m === 9) {
        daysToRamadan = i;
        break;
      }
    }
  }
  if (h.m === 9) {
    const start = new Date(today.getTime() - (h.d - 1) * DAY);
    let len = 29;
    if (hijri(new Date(start.getTime() + 29 * DAY + 12 * 3_600_000)).m === 9) len = 30;
    return { ...base, kind: "ramadan", startsAt: start.toISOString(), endsAt: new Date(start.getTime() + len * DAY).toISOString(), ramadanDay: h.d, lastTen: h.d >= 21, goal: RAMADAN_GOAL, daysToRamadan: 0 };
  }
  if (isFriday(now)) return { ...base, kind: "friday", startsAt: today.toISOString(), endsAt: new Date(today.getTime() + DAY).toISOString(), goal: FRIDAY_GOAL, daysToRamadan };
  return { ...base, kind: null, startsAt: null, endsAt: null, goal: 0, daysToRamadan };
}

export async function seasonProgress(s: Season) {
  if (!s.kind || !s.startsAt || !s.endsAt) return { raised: 0, donors: 0 };
  const { data } = await db()
    .from("dw_donation_items")
    .select("amount,dw_donations!inner(status,completed_at,pi_uid)")
    .eq("dw_donations.status", "completed")
    .gte("dw_donations.completed_at", s.startsAt)
    .lt("dw_donations.completed_at", s.endsAt);
  const rows = (data ?? []) as unknown as { amount: number; dw_donations: { pi_uid: string } }[];
  return { raised: rows.reduce((a, r) => a + Number(r.amount), 0), donors: new Set(rows.map((r) => r.dw_donations.pi_uid)).size };
}

// Seasonal counters for one donor, from their completed donation dates.
export function seasonBadges(dates: string[], now = new Date()) {
  const cur = hijri(now);
  let fridays = 0;
  let ramadanDays = 0;
  let lastTen = false;
  const fridaySet = new Set<number>();
  const ramadanSet = new Set<number>();
  for (const iso of dates) {
    const d = new Date(iso);
    const dayIdx = Math.floor((d.getTime() + OFFSET) / DAY);
    if (isFriday(d)) fridaySet.add(dayIdx);
    const h = hijri(d);
    if (h.m === 9 && h.y === cur.y) {
      ramadanSet.add(dayIdx);
      if (h.d >= 21) lastTen = true;
    }
  }
  fridays = fridaySet.size;
  ramadanDays = ramadanSet.size;
  return { fridays, ramadanDays, lastTen };
}
