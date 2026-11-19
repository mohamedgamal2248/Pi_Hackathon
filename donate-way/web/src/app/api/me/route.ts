import { db } from "@/lib/server/db";
import { handler, isAdmin, json, requireSession } from "@/lib/server/http";
import { pointsBalance } from "@/lib/server/points";
import { givingStreak } from "@/lib/server/streak";

export const GET = handler(async (request) => {
  const session = requireSession(request);
  const [donations, user, points, admin, referrals] = await Promise.all([
    db()
      .from("dw_donations")
      .select("id,amount,campaign_share,anonymous,campaign_id,fund,is_zakat,gift,txid,completed_at,dw_campaigns(title),dw_donation_items(campaign_id)")
      .eq("pi_uid", session.uid)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(200),
    db().from("dw_users").select("referral_code,wallet_address,hawl_start").eq("pi_uid", session.uid).maybeSingle(),
    pointsBalance(session.uid),
    isAdmin(session.uid),
    db().from("dw_donations").select("amount").eq("referrer_uid", session.uid).eq("status", "completed"),
  ]);

  const list = ((donations.data ?? []) as unknown as {
    id: string;
    amount: number;
    campaign_share: number;
    campaign_id: string | null;
    fund: string | null;
    is_zakat: boolean;
    gift: { type: string; name: string } | null;
    txid: string | null;
    completed_at: string;
    dw_campaigns: { title: string } | null;
    dw_donation_items: { campaign_id: string | null }[];
  }[]).map((d) => ({ ...d, amount: Number(d.amount), campaign_share: Number(d.campaign_share ?? 0) }));

  const helped = new Set(list.flatMap((d) => d.dw_donation_items.map((i) => i.campaign_id)).filter(Boolean));
  const streak = givingStreak(list.map((d) => d.completed_at));
  const year = new Date().getFullYear();

  return json({
    username: session.username,
    isAdmin: admin,
    total: list.reduce((s, d) => s + d.amount, 0),
    thisYear: list.filter((d) => new Date(d.completed_at).getFullYear() === year).reduce((s, d) => s + d.amount, 0),
    count: list.length,
    campaignsHelped: helped.size,
    zakatPaid: list.filter((d) => d.is_zakat).reduce((s, d) => s + d.amount, 0),
    gifts: list.filter((d) => d.gift).length,
    points,
    streak,
    referralCode: user.data?.referral_code ?? null,
    referrals: { count: (referrals.data ?? []).length, total: (referrals.data ?? []).reduce((s, r) => s + Number(r.amount), 0) },
    hasWallet: !!user.data?.wallet_address,
    hawlStart: user.data?.hawl_start ?? null,
    donations: list.map(({ dw_donation_items: _items, ...d }) => {
      void _items;
      return d;
    }),
  });
});
