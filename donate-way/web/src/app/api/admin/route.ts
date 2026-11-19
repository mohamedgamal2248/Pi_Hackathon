import { listCampaigns, platformStats } from "@/lib/server/campaigns";
import { db } from "@/lib/server/db";
import { handler, json, requireAdmin } from "@/lib/server/http";

// Admin dashboard: every campaign (any status) and the money split.
export const GET = handler(async (request) => {
  await requireAdmin(request);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [stats, campaigns, todayRows, funds] = await Promise.all([
    platformStats(),
    listCampaigns({ statuses: ["draft", "active", "funded", "completed", "paused"] }),
    db().from("dw_donations").select("amount").eq("status", "completed").gte("completed_at", today.toISOString()),
    db().from("dw_donation_items").select("fund,campaign_share,dw_donations!inner(status)").not("fund", "is", null).eq("dw_donations.status", "completed"),
  ]);
  const fundTotals = { general: 0, zakat: 0 };
  for (const f of (funds.data ?? []) as unknown as { fund: "general" | "zakat"; campaign_share: number }[]) fundTotals[f.fund] += Number(f.campaign_share);
  return json({
    stats,
    today: (todayRows.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    funds: fundTotals,
    campaigns,
  });
});
