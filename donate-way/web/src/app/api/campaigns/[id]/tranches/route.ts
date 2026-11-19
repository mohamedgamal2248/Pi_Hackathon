import { db, must } from "@/lib/server/db";
import { handler, HttpError, json, positiveAmount, readJson, requireSession, str, uuid } from "@/lib/server/http";

// Organizer asks for the next release of funds. Every release after the first needs a
// proof-of-spend update posted since the previous release.
export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/tranches">) => {
  const session = requireSession(request);
  const id = uuid((await ctx.params).id, "id");
  const campaign = must(
    await db().from("dw_campaigns").select("id,organizer_uid,status").eq("id", id).maybeSingle()
  ) as { id: string; organizer_uid: string; status: string } | null;
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  if (campaign.organizer_uid !== session.uid) throw new HttpError(403, "not_organizer");

  const body = await readJson<{ amount: number; proofUpdateId?: string; note?: string }>(request);
  const amount = positiveAmount(body.amount);

  const [{ data: stats }, { data: tranches }] = await Promise.all([
    db().from("dw_campaign_stats").select("raised,released").eq("campaign_id", id).maybeSingle(),
    db().from("dw_tranches").select("amount,status,paid_at").eq("campaign_id", id).in("status", ["requested", "approved", "paid"]),
  ]);
  const committed = (tranches ?? []).reduce((s, t) => s + Number(t.amount), 0);
  if (amount > Number(stats?.raised ?? 0) - committed + 1e-9) throw new HttpError(400, "amount_exceeds_available");
  if ((tranches ?? []).some((t) => t.status !== "paid")) throw new HttpError(409, "pending_request_exists");

  let proofUpdateId: string | null = null;
  const lastPaid = (tranches ?? []).filter((t) => t.paid_at).sort((a, b) => b.paid_at!.localeCompare(a.paid_at!))[0];
  if (lastPaid) {
    proofUpdateId = uuid(body.proofUpdateId, "proofUpdateId");
    const { data: proof } = await db()
      .from("dw_updates")
      .select("id,created_at")
      .eq("id", proofUpdateId)
      .eq("campaign_id", id)
      .eq("kind", "proof_of_spend")
      .maybeSingle();
    if (!proof || proof.created_at < lastPaid.paid_at!) throw new HttpError(400, "proof_of_spend_required");
  }

  const row = must(
    await db()
      .from("dw_tranches")
      .insert({ campaign_id: id, amount, proof_update_id: proofUpdateId, note: str(body.note, 500, "note", true) })
      .select("id")
      .single()
  ) as { id: string };
  return json({ id: row.id }, 201);
});
