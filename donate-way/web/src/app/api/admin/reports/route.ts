import { db } from "@/lib/server/db";
import { handler, HttpError, json, readJson, requireAdmin, uuid } from "@/lib/server/http";

export const GET = handler(async (request) => {
  await requireAdmin(request);
  const { data } = await db()
    .from("dw_reports")
    .select("id,reason,status,created_at,campaign_id,dw_campaigns(title)")
    .order("created_at", { ascending: false })
    .limit(50);
  return json({ reports: data ?? [] });
});

export const PATCH = handler(async (request) => {
  await requireAdmin(request);
  const { id, status } = await readJson<{ id: string; status: string }>(request);
  if (status !== "open" && status !== "resolved") throw new HttpError(400, "status_invalid");
  await db().from("dw_reports").update({ status }).eq("id", uuid(id, "id"));
  return json({ ok: true });
});
