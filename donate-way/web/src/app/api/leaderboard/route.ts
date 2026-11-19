import { leaderboard, topInviters } from "@/lib/server/campaigns";
import { handler, json } from "@/lib/server/http";

const mask = (u: string) => (u.length <= 3 ? `${u[0] ?? "?"}••` : `${u.slice(0, 2)}••${u.slice(-1)}`);
const masked = <T extends { username: string }>(xs: T[]) => xs.map((x) => ({ ...x, username: mask(x.username) }));

export const GET = handler(async () => {
  const [all, week, inviters] = await Promise.all([leaderboard(25), leaderboard(25, 7), topInviters(25)]);
  return json({ all: masked(all), week: masked(week), inviters: masked(inviters) });
});
