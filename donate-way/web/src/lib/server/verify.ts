import "server-only";
import { db } from "./db";
import { isTestnet } from "./network";
import { accountExists, WALLET_RE } from "./wallet";

// "Verified Pioneer" here means: the user's wallet exists on the blockchain of the network this app runs on
// (Mainnet accounts only exist for migrated, KYC-passed Pioneers). The address must come from Pi itself
// (the /me response) or from a payment Pi reports, never from what the browser typed.
// When Pi gives no address, the first completed payment verifies the user (see need.ts completeFee).
export type WalletCheck = "verified" | "missing" | "unknown";

export async function verifyWallet(uid: string, address: string | null | undefined, via: "blockchain" | "payment" = "blockchain"): Promise<WalletCheck> {
  if (!address || !WALLET_RE.test(address)) return "unknown";
  const exists = await accountExists(address);
  if (exists === null) return "unknown";
  if (!exists) return "missing";
  await db()
    .from("dw_users")
    .update({ wallet_verified_at: new Date().toISOString(), wallet_verified_via: via })
    .eq("pi_uid", uid)
    .is("wallet_verified_at", null);
  return "verified";
}

export async function isWalletVerified(uid: string): Promise<boolean> {
  const { data } = await db().from("dw_users").select("wallet_verified_at").eq("pi_uid", uid).maybeSingle();
  return !!data?.wallet_verified_at;
}

// Gate for opening a need request. On Mainnet a wallet that Pi gave us but the chain doesn't know blocks the request;
// when no wallet is known yet the fee payment is what verifies the user. Staging never blocks (testers).
export async function walletGate(uid: string): Promise<"ok" | "wallet_not_verified"> {
  if (isTestnet()) return "ok";
  const { data } = await db().from("dw_users").select("wallet_address,wallet_verified_at").eq("pi_uid", uid).maybeSingle();
  if (data?.wallet_verified_at) return "ok";
  if (!data?.wallet_address) return "ok";
  const exists = await accountExists(data.wallet_address);
  return exists === false ? "wallet_not_verified" : "ok";
}
