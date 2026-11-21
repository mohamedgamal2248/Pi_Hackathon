import { handler, json, rateLimit, readJson, requireSession, uuid } from "@/lib/server/http";
import { updateDraft, withdraw } from "@/lib/server/need";

export const PATCH = handler(async (request, ctx: RouteContext<"/api/need/[id]">) => {
  const session = requireSession(request);
  rateLimit(`need:${session.uid}`, 30, 60_000);
  return json(await updateDraft(uuid((await ctx.params).id, "id"), session.uid, await readJson(request)));
});

export const DELETE = handler(async (request, ctx: RouteContext<"/api/need/[id]">) => {
  const session = requireSession(request);
  return json(await withdraw(uuid((await ctx.params).id, "id"), session.uid));
});
