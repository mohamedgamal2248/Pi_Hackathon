import { resolveIncomplete } from "@/lib/server/donations";
import { handler, json, readJson, requireSession } from "@/lib/server/http";

export const POST = handler(async (request) => {
  const session = requireSession(request);
  const { paymentId } = await readJson<{ paymentId: string }>(request);
  return json(await resolveIncomplete(paymentId, session.uid));
});
