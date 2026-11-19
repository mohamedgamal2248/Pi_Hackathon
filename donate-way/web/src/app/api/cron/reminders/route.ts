import { db } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, HttpError, json } from "@/lib/server/http";
import { notify, type PiNotification } from "@/lib/server/pi";
import { dailyStreak, weekIndex } from "@/lib/server/streak";

const HIJRI_YEAR_DAYS = 354;
const DAY = 86_400_000;

// Daily (vercel.json): zakat hawl reminders, and on Thursdays a nudge to keep the weekly giving streak.
export const GET = handler(async (request) => {
  const secret = env.cronSecret();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "unauthorized");
  const out: PiNotification[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Hawl: one reminder 7 days before, one on the day.
  const { data: hawl } = await db().from("dw_users").select("pi_uid,hawl_start,hawl_reminded_at").not("hawl_start", "is", null);
  const reminded: string[] = [];
  for (const u of hawl ?? []) {
    const left = HIJRI_YEAR_DAYS - Math.floor((Date.now() - new Date(u.hawl_start).getTime()) / DAY);
    if (u.hawl_reminded_at === today) continue;
    if (left === 7 || left === 0) {
      out.push({
        user_uid: u.pi_uid,
        title: left === 0 ? "حولك اكتمل" : "فاضل أسبوع على حولك",
        body: left === 0 ? "عدّت سنة هجرية. افتح زكاتي وشوف زكاتك المحسوبة تلقائيًا." : "بعد أسبوع هتكمل سنة هجرية. جهّز زكاتك.",
        subroute: "/zakat",
      });
      reminded.push(u.pi_uid);
    }
  }
  if (reminded.length) await db().from("dw_users").update({ hawl_reminded_at: today }).in("pi_uid", reminded);

  // Streak nudge on Thursday (the week ends Friday): donors who gave last week but not yet this week.
  if (new Date().getUTCDay() === 4) {
    const { data } = await db()
      .from("dw_donations")
      .select("pi_uid,completed_at")
      .eq("status", "completed")
      .gte("completed_at", new Date(Date.now() - 14 * DAY).toISOString());
    const now = weekIndex(new Date());
    const thisWeek = new Set<string>();
    const lastWeek = new Set<string>();
    for (const d of data ?? []) {
      const w = weekIndex(d.completed_at);
      if (w === now) thisWeek.add(d.pi_uid);
      if (w === now - 1) lastWeek.add(d.pi_uid);
    }
    for (const uid of lastWeek) {
      if (!thisWeek.has(uid)) out.push({ user_uid: uid, title: "كمّل سلسلة عطائك", body: "أي تبرع ولو 0.1 π قبل الجمعة بيحافظ على سلسلتك.", subroute: "/" });
    }
  }

  // Daily streak at risk: donors with a streak of 3+ days who haven't given today.
  {
    const { data } = await db().from("dw_donations").select("pi_uid,completed_at").eq("status", "completed").gte("completed_at", new Date(Date.now() - 40 * DAY).toISOString());
    const byUser = new Map<string, string[]>();
    for (const d of data ?? []) byUser.set(d.pi_uid, [...(byUser.get(d.pi_uid) ?? []), d.completed_at]);
    for (const [uid, dates] of byUser) {
      const s = dailyStreak(dates);
      if (s.days >= 3 && !s.givenToday) out.push({ user_uid: uid, title: `سلسلتك ${s.days} يوم`, body: "تبرع بأي مبلغ النهاردة وكمّل سلسلة الخير.", subroute: "/" });
    }
  }

  await notify(out);
  return json({ sent: out.length });
});
