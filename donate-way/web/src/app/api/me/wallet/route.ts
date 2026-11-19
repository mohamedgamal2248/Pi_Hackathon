import { db } from "@/lib/server/db";
import { handler, HttpError, json, rateLimit, readJson, requireSession } from "@/lib/server/http";
import { WALLET_RE } from "@/lib/server/wallet";

// Stores the user's public wallet address. Used only to read public balances for the zakat calculator.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  rateLimit(`wallet:${session.uid}`, 10, 60_000);
  const { address } = await readJson<{ address?: string }>(request);
  if (typeof address !== "string" || !WALLET_RE.test(address.trim())) throw new HttpError(400, "address_invalid");
  await db().from("dw_users").update({ wallet_address: address.trim() }).eq("pi_uid", session.uid);
  return json({ ok: true });
});
