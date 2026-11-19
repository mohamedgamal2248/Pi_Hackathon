import { completeDonation } from "@/lib/server/donations";
import { handler, json, rateLimit, readJson, requireSession } from "@/lib/server/http";

export const POST = handler(async (request) => {
  const session = requireSession(request);
  rateLimit(`pay:${session.uid}`, 30, 60_000);
  const { paymentId, txid } = await readJson<{ paymentId: string; txid: string }>(request);
  return json(await completeDonation(paymentId, txid, session.uid));
});
