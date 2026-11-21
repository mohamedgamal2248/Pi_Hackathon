import { handler, json, requireSession, uuid } from "@/lib/server/http";
import { submitSettlementProof } from "@/lib/server/need";

// After the first payout: the applicant sends the proof that the bill/fees were paid (the 30% stage).
export const POST = handler(async (request, ctx: RouteContext<"/api/need/[id]/proof">) => {
  const session = requireSession(request);
  return json(await submitSettlementProof(uuid((await ctx.params).id, "id"), session.uid));
});
