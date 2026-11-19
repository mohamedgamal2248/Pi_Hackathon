import "server-only";

// Live prices from OKX's public market API (no key needed). Cached in memory for 60 s per instance.
export const TROY_OUNCE_GRAMS = 31.1034768;
export const NISAB_GOLD_GRAMS = 85;
export const ZAKAT_RATE = 0.025;

type Prices = { piUsd: number; goldOzUsd: number; goldGramUsd: number; at: string };

let cache: { value: Prices; expires: number } | null = null;

async function okxLast(instId: string): Promise<number> {
  const res = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`OKX ${instId} ${res.status}`);
  const json = (await res.json()) as { code: string; data?: { last: string }[] };
  const last = Number(json.data?.[0]?.last);
  if (json.code !== "0" || !Number.isFinite(last) || last <= 0) throw new Error(`OKX ${instId} bad data`);
  return last;
}

export async function getPrices(): Promise<Prices> {
  if (cache && cache.expires > Date.now()) return cache.value;
  try {
    // XAUT (Tether Gold) = 1 troy ounce of gold, priced in USDT.
    const [piUsd, goldOzUsd] = await Promise.all([okxLast("PI-USDT"), okxLast("XAUT-USDT")]);
    const value = { piUsd, goldOzUsd, goldGramUsd: goldOzUsd / TROY_OUNCE_GRAMS, at: new Date().toISOString() };
    cache = { value, expires: Date.now() + 60_000 };
    return value;
  } catch (err) {
    if (cache) return cache.value; // serve the last good prices if OKX is briefly unavailable
    throw err;
  }
}

// Other tokens in a wallet are priced only if OKX lists CODE-USDT.
export async function tryOkxUsd(code: string): Promise<number | null> {
  if (!/^[A-Z0-9]{2,12}$/.test(code)) return null;
  try {
    return await okxLast(`${code}-USDT`);
  } catch {
    return null;
  }
}
