import { db } from "@/lib/server/db";
import { handler, json, rateLimit, readJson, requireSession, str, uuid } from "@/lib/server/http";
import { notify } from "@/lib/server/pi";

// A signed-in user flags a campaign. One report per user per campaign; admins are notified.
export const POST = handler(async (request, ctx: RouteContext<"/api/campaigns/[id]/report">) => {
  const session = requireSession(request);
  rateLimit(`report:${session.uid}`, 5, 3_600_000);
  const id = uuid((await ctx.params).id, "id");
  const { reason } = await readJson<{ reason?: unknown }>(request);
  const text = str(reason, 300, "reason");
  const { data: c } = await db().from("dw_campaigns").select("title").eq("id", id).maybeSingle();
  if (!c) return json({ error: "not_found" }, 404);
  const { error } = await db().from("dw_reports").upsert({ campaign_id: id, pi_uid: session.uid, reason: text }, { onConflict: "campaign_id,pi_uid", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  const { data: admins } = await db().from("dw_users").select("pi_uid").eq("is_admin", true);
  await notify((admins ?? []).map((a) => ({ user_uid: a.pi_uid, title: "بلاغ على حملة", body: `${c.title}: ${text}`.slice(0, 120), subroute: "/admin" })));
  return json({ ok: true });
});
