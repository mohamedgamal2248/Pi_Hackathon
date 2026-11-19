import { db, must } from "@/lib/server/db";
import { handler, HttpError, httpsUrl, json, positiveAmount, readJson, requireSession, str, uuid } from "@/lib/server/http";
import { notify } from "@/lib/server/pi";

// Organizer posts a campaign update or a proof-of-spend (receipts/photos). Followers and donors get notified.
export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/updates">) => {
  const session = requireSession(request);
  const id = uuid((await ctx.params).id, "id");
  const campaign = must(
    await db().from("dw_campaigns").select("id,title,organizer_uid").eq("id", id).maybeSingle()
  ) as { id: string; title: string; organizer_uid: string } | null;
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  if (campaign.organizer_uid !== session.uid) throw new HttpError(403, "not_organizer");

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

  const [{ data: followers }, { data: donors }] = await Promise.all([
    db().from("dw_follows").select("pi_uid").eq("campaign_id", id),
    db().from("dw_donations").select("pi_uid").eq("campaign_id", id).eq("status", "completed"),
  ]);
  const uids = new Set([...(followers ?? []), ...(donors ?? [])].map((r) => r.pi_uid));
  uids.delete(session.uid);
  await notify(
    [...uids].map((user_uid) => ({
      user_uid,
      title: kind === "proof_of_spend" ? "🧾 إثبات صرف جديد" : "📢 تحديث جديد",
      body: `${campaign.title}: ${String(body.title).slice(0, 80)}`,
      subroute: `/campaigns/${id}`,
    }))
  );
  return json({ id: update.id }, 201);
});
