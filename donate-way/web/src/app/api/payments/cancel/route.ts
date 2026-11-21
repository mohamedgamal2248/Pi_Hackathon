import { cancelAny } from "@/lib/server/payments";
import { handler, json, rateLimit, readJson, requireSession } from "@/lib/server/http";

export const POST = handler(async (request) => {
  const session = requireSession(request);
  rateLimit(`pay:${session.uid}`, 30, 60_000);
  const { paymentId } = await readJson<{ paymentId: string }>(request);
  return json(await cancelAny(paymentId, session.uid));
});
