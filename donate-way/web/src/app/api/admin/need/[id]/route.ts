import { handler, HttpError, json, rateLimit, readJson, requireAdmin, uuid } from "@/lib/server/http";
import { decide, payout, reviewSettlement } from "@/lib/server/need";

// One endpoint for every admin action on a request; each is logged with the admin id, a time and a note.
export const POST = handler(async (request, ctx: RouteContext<"/api/admin/need/[id]">) => {
  const session = await requireAdmin(request);
  rateLimit(`needadmin:${session.uid}`, 30, 60_000);
  const id = uuid((await ctx.params).id, "id");
  const { action, note } = await readJson<{ action?: string; note?: string }>(request);
  switch (action) {
    case "approve":
    case "reject":
    case "more_proof":
      return json(await decide(id, session.uid, action === "more_proof" ? "more_proof" : action, note));
    case "payout1":
      return json(await payout(id, 1, session.uid));
    case "settle_approve":
      return json(await reviewSettlement(id, session.uid, true, note));
    case "settle_reject":
      return json(await reviewSettlement(id, session.uid, false, note));
    default:
      throw new HttpError(400, "action_invalid");
  }
});
