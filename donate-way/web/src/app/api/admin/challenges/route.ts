import { db } from "@/lib/server/db";
import { listChallenges } from "@/lib/server/challenges";
import { handler, HttpError, json, positiveAmount, readJson, requireAdmin, str, uuid } from "@/lib/server/http";

export const GET = handler(async (request) => {
  await requireAdmin(request);
  return json({ challenges: await listChallenges() });
});

export const POST = handler(async (request) => {
  await requireAdmin(request);
  const b = await readJson<Record<string, unknown>>(request);
  const endsAt = str(b.ends_at, 40, "ends_at")!;
  const startsAt = str(b.starts_at, 40, "starts_at", true) ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(endsAt)) || Number.isNaN(Date.parse(startsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) throw new HttpError(400, "dates_invalid");
  const { data, error } = await db()
    .from("dw_challenges")
    .insert({
      title: str(b.title, 100, "title"),
      description: str(b.description, 300, "description", true),
      goal: positiveAmount(b.goal, "goal"),
      campaign_id: b.campaign_id ? uuid(b.campaign_id, "campaign_id") : null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return json({ id: data.id }, 201);
});

export const DELETE = handler(async (request) => {
  await requireAdmin(request);
  const id = uuid(new URL(request.url).searchParams.get("id"), "id");
  await db().from("dw_challenges").delete().eq("id", id);
  return json({ ok: true });
});
