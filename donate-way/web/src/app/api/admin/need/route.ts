import { handler, json, requireAdmin } from "@/lib/server/http";
import { adminQueue } from "@/lib/server/need";

// Review queue and payout list (private documents come as short-lived signed links).
export const GET = handler(async (request) => {
  await requireAdmin(request);
  return json({ requests: await adminQueue() });
});
