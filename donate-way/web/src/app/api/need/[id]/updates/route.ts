import { handler, json, rateLimit, readJson, requireSession, uuid } from "@/lib/server/http";
import { postUpdate } from "@/lib/server/need-extra";

// The applicant's short update for the donors of their fund.
export const POST = handler(async (request, ctx: RouteContext<"/api/need/[id]/updates">) => {
  const session = requireSession(request);
  rateLimit(`needupd:${session.uid}`, 10, 60_000);
  const { body } = await readJson<{ body?: string }>(request);
  return json(await postUpdate(uuid((await ctx.params).id, "id"), session.uid, body));
});
