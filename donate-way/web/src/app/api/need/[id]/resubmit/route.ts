import { handler, json, requireSession, uuid } from "@/lib/server/http";
import { resubmit } from "@/lib/server/need";

// After the admin asked for more proof: send the request back to review. No new fee.
export const POST = handler(async (request, ctx: RouteContext<"/api/need/[id]/resubmit">) => {
  const session = requireSession(request);
  return json(await resubmit(uuid((await ctx.params).id, "id"), session.uid));
});
