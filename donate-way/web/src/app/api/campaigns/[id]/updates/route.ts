import { db, must } from "@/lib/server/db";
import { campaignAudience } from "@/lib/server/donations";
import { handler, HttpError, httpsUrl, json, positiveAmount, readJson, requireAdmin, str, uuid } from "@/lib/server/http";
import { notify } from "@/lib/server/pi";

// Admin posts a campaign update or a proof of spend (receipts/photos). Donors and followers are notified.
export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/updates">) => {
  await requireAdmin(request);
  const id = uuid((await ctx.params).id, "id");
  const campaign = must(await db().from("dw_campaigns").select("id,title").eq("id", id).maybeSingle()) as { id: string; title: string } | null;
  if (!campaign) throw new HttpError(404, "campaign_not_found");

  const body = await readJson<Record<string, unknown>>(request);
  const kind = body.kind === "proof_of_spend" ? "proof_of_spend" : "update";
  const media = Array.isArray(body.media) ? body.media.slice(0, 10).map((u, i) => httpsUrl(u, `media_${i}`)).filter(Boolean) : [];
  if (kind === "proof_of_spend" && media.length === 0) throw new HttpError(400, "proof_needs_media");

  const update = must(
    await db()
      .from("dw_updates")
      .insert({
        campaign_id: id,
        kind,
        title: str(body.title, 120, "title"),
        body: str(body.body, 4000, "body"),
        amount_spent: kind === "proof_of_spend" ? positiveAmount(body.amount_spent, "amount_spent") : null,
        media,
      })
      .select("id")
      .single()
  ) as { id: string };

  await notify(
    (await campaignAudience(id)).map((user_uid) => ({
      user_uid,
      title: kind === "proof_of_spend" ? "تبرعك اتصرف، شوف الإيصال" : "تحديث جديد",
      body: `${campaign.title}: ${String(body.title).slice(0, 80)}`,
      subroute: `/campaigns/${id}?tab=proof`,
    }))
  );
  return json({ id: update.id }, 201);
});
