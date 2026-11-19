import { campaignInput } from "@/lib/server/campaign-input";
import { getCampaign } from "@/lib/server/campaigns";
import { db, must } from "@/lib/server/db";
import { handler, HttpError, json, readJson, requireAdmin, uuid } from "@/lib/server/http";

export const GET = handler(async (request, ctx: RouteContext<"/api/admin/campaigns/[id]">) => {
  await requireAdmin(request);
  const campaign = await getCampaign(uuid((await ctx.params).id, "id"), undefined, true);
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  return json({ campaign });
});

export const PATCH = handler(async (request, ctx: RouteContext<"/api/admin/campaigns/[id]">) => {
  await requireAdmin(request);
  const id = uuid((await ctx.params).id, "id");
  const changes = campaignInput(await readJson<Record<string, unknown>>(request), true);
  if (!Object.keys(changes).length) throw new HttpError(400, "nothing_to_update");
  must(await db().from("dw_campaigns").update(changes).eq("id", id));
  return json({ ok: true });
});
