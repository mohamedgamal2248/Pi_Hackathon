import { db } from "@/lib/server/db";
import { handler, HttpError, json, positiveAmount, readJson, requireAdmin, str, uuid } from "@/lib/server/http";

export const GET = handler(async (request) => {
  await requireAdmin(request);
  const { data } = await db().from("dw_matches").select("id,sponsor,multiplier,cap,ends_at,campaign_id,dw_campaigns(title)").order("ends_at", { ascending: false }).limit(20);
  return json({ matches: data ?? [] });
});

export const POST = handler(async (request) => {
  await requireAdmin(request);
  const b = await readJson<Record<string, unknown>>(request);
  const multiplier = positiveAmount(b.multiplier, "multiplier");
  if (multiplier > 2) throw new HttpError(400, "multiplier_invalid");
  const hours = positiveAmount(b.hours, "hours");
  const { error } = await db().from("dw_matches").insert({
    campaign_id: uuid(b.campaign_id, "campaign_id"),
    sponsor: str(b.sponsor, 60, "sponsor"),
    multiplier,
    cap: positiveAmount(b.cap, "cap"),
    ends_at: new Date(Date.now() + Math.min(hours, 24 * 60) * 3_600_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return json({ ok: true }, 201);
});

export const DELETE = handler(async (request) => {
  await requireAdmin(request);
  await db().from("dw_matches").delete().eq("id", uuid(new URL(request.url).searchParams.get("id"), "id"));
  return json({ ok: true });
});
