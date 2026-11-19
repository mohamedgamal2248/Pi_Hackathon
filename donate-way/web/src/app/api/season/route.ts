import { db } from "@/lib/server/db";
import { handler, json } from "@/lib/server/http";
import { currentSeason, seasonBadges, seasonProgress } from "@/lib/server/season";
import { readSession } from "@/lib/server/session";

export const GET = handler(async (request) => {
  const season = currentSeason();
  const progress = await seasonProgress(season);
  const session = readSession(request);
  let mine = null;
  if (session) {
    const { data } = await db().from("dw_donations").select("completed_at").eq("pi_uid", session.uid).eq("status", "completed").limit(1000);
    mine = seasonBadges((data ?? []).map((d) => d.completed_at as string).filter(Boolean));
  }
  return json({ season, progress, mine });
});
