import { completeDonation } from "@/lib/server/donations";
import { handler, json, readJson, requireSession } from "@/lib/server/http";

export const POST = handler(async (request) => {
  const session = requireSession(request);
  const { paymentId, txid } = await readJson<{ paymentId: string; txid: string }>(request);
  return json(await completeDonation(paymentId, txid, session.uid));
});
