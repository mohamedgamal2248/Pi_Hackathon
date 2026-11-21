import { handler, json, requireSession, uuid } from "@/lib/server/http";
import { acceptTerms } from "@/lib/server/need";

// The applicant ticked the box saying they read the fee terms (1 Pi, non-refundable, no guarantee of approval).
export const POST = handler(async (request, ctx: RouteContext<"/api/need/[id]/terms">) => {
  const session = requireSession(request);
  return json(await acceptTerms(uuid((await ctx.params).id, "id"), session.uid));
});
