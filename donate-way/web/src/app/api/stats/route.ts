import { latestProofs, leaderboard, platformStats, recentFeed } from "@/lib/server/campaigns";
import { handler, json } from "@/lib/server/http";
import { getPrices } from "@/lib/server/prices";

// Everything the home page needs in one request.
export const GET = handler(async () => {
  const [stats, feed, proofs, top, week, prices] = await Promise.all([
    platformStats(),
    recentFeed(12),
    latestProofs(6),
    leaderboard(10),
    leaderboard(5, 7),
    getPrices().catch(() => null),
  ]);
  return json({ stats, feed, proofs, leaderboard: top, leaderboardWeek: week, piUsd: prices?.piUsd ?? null });
});
