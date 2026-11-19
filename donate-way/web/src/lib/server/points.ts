import "server-only";
import { db } from "./db";

// Token-ready ledger. Today every entry is GIVE_POINTS. When a Pi ecosystem token launches,
// add a new asset code here and a migration that converts balances; callers don't change.
export const POINTS_ASSET = "GIVE_POINTS";

export async function awardPoints(uid: string, amount: number, reason: string, ref: string) {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return;
  // unique(asset, reason, ref) makes retries idempotent
  const { error } = await db()
    .from("dw_ledger")
    .upsert({ pi_uid: uid, asset: POINTS_ASSET, amount: rounded, reason, ref }, { onConflict: "asset,reason,ref", ignoreDuplicates: true });
  if (error) console.warn("awardPoints failed", error.message);
}

export async function pointsBalance(uid: string): Promise<number> {
  const { data } = await db().from("dw_ledger").select("amount").eq("pi_uid", uid).eq("asset", POINTS_ASSET);
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}
