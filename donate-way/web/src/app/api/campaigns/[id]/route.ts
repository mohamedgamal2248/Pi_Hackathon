import { getCampaign } from "@/lib/server/campaigns";
import { handler, HttpError, isAdmin, json, uuid } from "@/lib/server/http";
import { readSession } from "@/lib/server/session";

export const GET = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]">) => {
  const id = uuid((await ctx.params).id, "id");
  const uid = readSession(request)?.uid;
  const campaign = await getCampaign(id, uid, false, uid ? await isAdmin(uid) : false);
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  return json({ campaign });
});
