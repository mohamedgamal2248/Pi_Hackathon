import { db } from "@/lib/server/db";
import { getFriendPage } from "@/lib/server/friend-pages";
import { handler, HttpError, json, uuid } from "@/lib/server/http";

export const GET = handler(async (_request, ctx: RouteContext<"/api/friend-pages/[id]">) => {
  const page = await getFriendPage(uuid((await ctx.params).id, "id"));
  if (!page) throw new HttpError(404, "not_found");
  const { data: u } = await db().from("dw_users").select("referral_code").eq("pi_uid", page.ownerUid).maybeSingle();
  const { ownerUid: _o, ...pub } = page;
  void _o;
  return json({ page: pub, ref: u?.referral_code ?? null });
});
