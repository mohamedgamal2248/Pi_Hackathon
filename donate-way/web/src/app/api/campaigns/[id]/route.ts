import { getCampaign } from "@/lib/server/campaigns";
import { handler, HttpError, json, uuid } from "@/lib/server/http";
import { readSession } from "@/lib/server/session";

export const GET = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]">) => {
  const id = uuid((await ctx.params).id, "id");
  const campaign = await getCampaign(id, readSession(request)?.uid);
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  return json({ campaign });
});
