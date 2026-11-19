import "server-only";

// Reads balances from the public Pi Mainnet blockchain API (Horizon).
const HORIZON = "https://api.mainnet.minepi.com";
export const WALLET_RE = /^G[A-Z2-7]{55}$/;

export type WalletAsset = { code: string; issuer: string | null; balance: number; native: boolean };

export async function walletBalances(address: string): Promise<{ exists: boolean; assets: WalletAsset[] }> {
  if (!WALLET_RE.test(address)) throw new Error("bad_address");
  const res = await fetch(`${HORIZON}/accounts/${address}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return { exists: false, assets: [] };
  if (!res.ok) throw new Error(`horizon ${res.status}`);
  const json = (await res.json()) as {
    balances: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }[];
  };
  return {
    exists: true,
    assets: json.balances
      .filter((b) => !b.asset_type.startsWith("liquidity_pool"))
      .map((b) => ({
        native: b.asset_type === "native",
        code: b.asset_type === "native" ? "PI" : b.asset_code ?? "?",
        issuer: b.asset_issuer ?? null,
        balance: Number(b.balance),
      })),
  };
}
