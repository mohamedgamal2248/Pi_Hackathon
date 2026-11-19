import { latestProofs, platformStats } from "@/lib/server/campaigns";
import { db } from "@/lib/server/db";
import { handler, json } from "@/lib/server/http";
import { isTestnet } from "@/lib/server/network";
import { getPrices } from "@/lib/server/prices";
import { walletBalances, WALLET_RE } from "@/lib/server/wallet";

// Public transparency page: totals, the 95/5 split, money spent with proof, monthly breakdown,
// and the app wallet's live balance read from the Pi blockchain.
export const GET = handler(async () => {
  const appWallet = (isTestnet() ? process.env.APP_WALLET_ADDRESS_TESTNET : process.env.APP_WALLET_ADDRESS) ?? "";
  const [stats, proofs, prices, monthly, wallet] = await Promise.all([
    platformStats(),
    latestProofs(12),
    getPrices().catch(() => null),
    db().from("dw_donations").select("amount,completed_at").eq("status", "completed").gte("completed_at", new Date(Date.now() - 365 * 86_400_000).toISOString()),
    WALLET_RE.test(appWallet) ? walletBalances(appWallet).catch(() => null) : Promise.resolve(null),
  ]);

  const byMonth = new Map<string, number>();
  for (const d of monthly.data ?? []) {
    const key = String(d.completed_at).slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(d.amount));
  }

  return json({
    stats,
    proofs,
    piUsd: prices?.piUsd ?? null,
    months: [...byMonth.entries()].sort().map(([month, total]) => ({ month, total })),
    appWallet: WALLET_RE.test(appWallet)
      ? { address: appWallet, balance: wallet?.assets.find((a) => a.native)?.balance ?? null }
      : null,
  });
});
