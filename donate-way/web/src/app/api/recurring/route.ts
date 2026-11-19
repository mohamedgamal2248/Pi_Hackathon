import { db, must } from "@/lib/server/db";
import { handler, HttpError, json, positiveAmount, readJson, requireSession, uuid } from "@/lib/server/http";

// Monthly giving pledge. The first payment happens right away from the client (with recurringId in
// the payment metadata); afterwards the daily cron reminds the donor through the Pi Notification Center.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  const body = await readJson<{ amount: number; campaignId?: string | null }>(request);
  const amount = positiveAmount(body.amount);
  if (amount > 10_000) throw new HttpError(400, "amount_out_of_range");
  const campaignId = body.campaignId ? uuid(body.campaignId, "campaignId") : null;

  const { count } = await db()
    .from("dw_recurring")
    .select("id", { count: "exact", head: true })
    .eq("pi_uid", session.uid)
    .eq("active", true);
  if ((count ?? 0) >= 10) throw new HttpError(409, "too_many_pledges");

  const row = must(
    await db()
      .from("dw_recurring")
      .insert({ pi_uid: session.uid, campaign_id: campaignId, amount, next_due: new Date().toISOString().slice(0, 10) })
      .select("id")
      .single()
  ) as { id: string };
  return json({ id: row.id }, 201);
});

export const DELETE = handler(async (request) => {
  const session = requireSession(request);
  const id = uuid(new URL(request.url).searchParams.get("id"), "id");
  await db().from("dw_recurring").update({ active: false }).eq("id", id).eq("pi_uid", session.uid);
  return json({ ok: true });
});
