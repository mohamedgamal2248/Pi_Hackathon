import { db } from "@/lib/server/db";
import { handler, HttpError, json, readJson, requireSession } from "@/lib/server/http";
import { getPrices, NISAB_GOLD_GRAMS, ZAKAT_RATE } from "@/lib/server/prices";
import { walletBalances } from "@/lib/server/wallet";

const HIJRI_YEAR_DAYS = 354;

// Automatic zakat: reads the signed-in user's Pi wallet from the blockchain, prices it with OKX,
// compares it with the gold nisab (85 g), and reports the hawl (one hijri year) state.
export const GET = handler(async (request) => {
  const session = requireSession(request);
  const { data: user } = await db().from("dw_users").select("wallet_address,hawl_start").eq("pi_uid", session.uid).maybeSingle();
  if (!user?.wallet_address) throw new HttpError(409, "no_wallet");

  const [prices, wallet] = await Promise.all([getPrices(), walletBalances(user.wallet_address)]);

  const pi = wallet.assets.find((a) => a.native)?.balance ?? 0;
  const piUsdValue = pi * prices.piUsd;
  const totalUsd = piUsdValue; // Pi only: other tokens on the chain are not priced
  const nisabUsd = prices.goldGramUsd * NISAB_GOLD_GRAMS;
  const aboveNisab = totalUsd >= nisabUsd;
  const zakatUsd = aboveNisab ? totalUsd * ZAKAT_RATE : 0;

  let hawl: { start: string; daysLeft: number; complete: boolean } | null = null;
  if (user.hawl_start) {
    const elapsed = Math.floor((Date.now() - new Date(user.hawl_start).getTime()) / 86_400_000);
    hawl = { start: user.hawl_start, daysLeft: Math.max(0, HIJRI_YEAR_DAYS - elapsed), complete: elapsed >= HIJRI_YEAR_DAYS };
  }

  return json({
    address: `${user.wallet_address.slice(0, 4)}…${user.wallet_address.slice(-4)}`,
    walletExists: wallet.exists,
    pi,
    prices: { piUsd: prices.piUsd, goldGramUsd: prices.goldGramUsd, at: prices.at },
    totalUsd,
    goldGrams: totalUsd / prices.goldGramUsd,
    nisab: { grams: NISAB_GOLD_GRAMS, usd: nisabUsd, pi: nisabUsd / prices.piUsd },
    aboveNisab,
    zakat: { usd: zakatUsd, pi: zakatUsd / prices.piUsd },
    hawl,
  });
});

// Start (or reset) the hawl from today, or clear it after paying.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  const { action } = await readJson<{ action: "start" | "clear" }>(request);
  if (action !== "start" && action !== "clear") throw new HttpError(400, "action_invalid");
  await db()
    .from("dw_users")
    .update({ hawl_start: action === "start" ? new Date().toISOString().slice(0, 10) : null, hawl_reminded_at: null })
    .eq("pi_uid", session.uid);
  return json({ ok: true });
});
