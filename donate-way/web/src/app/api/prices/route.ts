import { handler, json } from "@/lib/server/http";
import { getPrices, NISAB_GOLD_GRAMS } from "@/lib/server/prices";

export const GET = handler(async () => {
  const p = await getPrices();
  return json({ ...p, nisabUsd: p.goldGramUsd * NISAB_GOLD_GRAMS, nisabPi: (p.goldGramUsd * NISAB_GOLD_GRAMS) / p.piUsd });
});
