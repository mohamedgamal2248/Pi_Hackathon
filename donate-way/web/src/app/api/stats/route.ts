import { leaderboard, platformStats } from "@/lib/server/campaigns";
import { handler, json } from "@/lib/server/http";

export const GET = handler(async () => {
  const [stats, top] = await Promise.all([platformStats(), leaderboard(10)]);
  return json({ stats, leaderboard: top });
});
