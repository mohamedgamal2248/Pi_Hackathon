import { campaignInput } from "@/lib/server/campaign-input";
import { db, must } from "@/lib/server/db";
import { handler, json, readJson, requireAdmin } from "@/lib/server/http";

// Only the admin creates campaigns.
export const POST = handler(async (request) => {
  const session = await requireAdmin(request);
  const body = await readJson<Record<string, unknown>>(request);
  const row = must(
    await db()
      .from("dw_campaigns")
      .insert({ ...campaignInput(body), organizer_uid: session.uid, approved_at: new Date().toISOString() })
      .select("id")
      .single()
  ) as { id: string };
  return json({ id: row.id }, 201);
});
