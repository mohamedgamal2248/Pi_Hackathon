import { listCampaigns } from "@/lib/server/campaigns";
import { db } from "@/lib/server/db";
import { handler, isAdmin, json, requireSession } from "@/lib/server/http";
import { pointsBalance } from "@/lib/server/points";

export const GET = handler(async (request) => {
  const session = requireSession(request);
  const [donations, recurring, organizer, points, isAdminUser] = await Promise.all([
    db()
      .from("dw_donations")
      .select("amount,anonymous,campaign_id,txid,completed_at,dw_campaigns(title)")
      .eq("pi_uid", session.uid)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(100),
    db()
      .from("dw_recurring")
      .select("id,amount,next_due,active,campaign_id,dw_campaigns(title)")
      .eq("pi_uid", session.uid)
      .eq("active", true),
    db().from("dw_organizers").select("status,review_note").eq("pi_uid", session.uid).maybeSingle(),
    pointsBalance(session.uid),
    isAdmin(session.uid),
  ]);

  const list = (donations.data ?? []).map((d) => ({ ...d, amount: Number(d.amount) }));
  const total = list.reduce((s, d) => s + d.amount, 0);
  const myCampaigns =
    organizer.data?.status === "approved"
      ? await listCampaigns({ organizerUid: session.uid, statuses: ["pending", "active", "funded", "completed", "rejected", "paused"] })
      : [];

  return json({
    username: session.username,
    isAdmin: isAdminUser,
    total,
    count: list.length,
    campaignsHelped: new Set(list.map((d) => d.campaign_id).filter(Boolean)).size,
    points,
    donations: list,
    recurring: (recurring.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })),
    organizer: organizer.data,
    myCampaigns,
  });
});
