import { listCampaigns, platformStats } from "@/lib/server/campaigns";
import { db } from "@/lib/server/db";
import { handler, json, requireAdmin } from "@/lib/server/http";
import { givingStreak, weekIndex } from "@/lib/server/streak";

// Admin dashboard: every campaign (any status) and the money split.
export const GET = handler(async (request) => {
  await requireAdmin(request);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const day = 86_400_000;
  const since = (d: number) => new Date(Date.now() - d * day).toISOString();
  const [users, donations] = await Promise.all([
    db().from("dw_users").select("last_seen_at,created_at"),
    db().from("dw_donations").select("pi_uid,completed_at,referrer_uid").eq("status", "completed"),
  ]);
  const u = users.data ?? [];
  const count = (d: number, k: "last_seen_at" | "created_at") => u.filter((x) => x[k] >= since(d)).length;
  const byDonor = new Map<string, string[]>();
  for (const d of donations.data ?? []) byDonor.set(d.pi_uid, [...(byDonor.get(d.pi_uid) ?? []), d.completed_at]);
  const donorsTotal = byDonor.size;
  const returning = [...byDonor.values()].filter((ds) => new Set(ds.map((x) => weekIndex(x))).size >= 2).length;
  const engagement = {
    active1d: count(1, "last_seen_at"),
    active7d: count(7, "last_seen_at"),
    active30d: count(30, "last_seen_at"),
    new7d: count(7, "created_at"),
    returningDonors: returning,
    retention: donorsTotal ? returning / donorsTotal : 0,
    referralDonations: (donations.data ?? []).filter((d) => d.referrer_uid).length,
    activeStreaks: [...byDonor.values()].filter((ds) => givingStreak(ds).weeks >= 2).length,
  };

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
    engagement,
    campaigns,
  });
});
