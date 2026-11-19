import { db } from "@/lib/server/db";
import { myFriendPages } from "@/lib/server/friend-pages";
import { handler, HttpError, json, positiveAmount, rateLimit, readJson, requireSession, str, uuid } from "@/lib/server/http";

export const GET = handler(async (request) => json({ pages: await myFriendPages(requireSession(request).uid) }));

// A signed-in user starts a personal fundraising page for an open campaign.
export const POST = handler(async (request) => {
  const session = requireSession(request);
  rateLimit(`friendpage:${session.uid}`, 10, 3_600_000);
  const b = await readJson<Record<string, unknown>>(request);
  const campaignId = uuid(b.campaign_id, "campaign_id");
  const goal = positiveAmount(b.goal, "goal");
  if (goal > 100_000) throw new HttpError(400, "goal_too_large");
  const { data: c } = await db().from("dw_campaigns").select("status").eq("id", campaignId).maybeSingle();
  if (!c || c.status !== "active") throw new HttpError(409, "campaign_closed");
  const { data, error } = await db().from("dw_friend_pages").insert({ owner_uid: session.uid, campaign_id: campaignId, goal, message: str(b.message, 200, "message", true) }).select("id").single();
  if (error) throw new Error(error.message);
  return json({ id: data.id }, 201);
});
