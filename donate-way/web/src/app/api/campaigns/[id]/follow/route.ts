import { db } from "@/lib/server/db";
import { handler, json, readJson, requireSession, uuid } from "@/lib/server/http";

export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/follow">) => {
  const session = requireSession(request);
  const id = uuid((await ctx.params).id, "id");
  const { follow } = await readJson<{ follow: boolean }>(request);
  if (follow) {
    await db().from("dw_follows").upsert({ pi_uid: session.uid, campaign_id: id }, { onConflict: "pi_uid,campaign_id", ignoreDuplicates: true });
  } else {
    await db().from("dw_follows").delete().eq("pi_uid", session.uid).eq("campaign_id", id);
  }
  return json({ following: !!follow });
});
