import { handler, json, rateLimit, requireSession, uuid } from "@/lib/server/http";
import { vouch } from "@/lib/server/need-extra";

export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/vouch">) => {
  const session = requireSession(request);
  rateLimit(`vouch:${session.uid}`, 20, 60_000);
  return json(await vouch(uuid((await ctx.params).id, "id"), session.uid, true));
});

export const DELETE = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/vouch">) => {
  const session = requireSession(request);
  return json(await vouch(uuid((await ctx.params).id, "id"), session.uid, false));
});
