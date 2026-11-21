import { pickTitle } from "@/lib/server/campaigns";
import { db } from "@/lib/server/db";
import { eraseApplicantData } from "@/lib/server/need";
import { handler, isAdmin, json, requireSession } from "@/lib/server/http";
import { pointsBalance } from "@/lib/server/points";
import { dailyStreak, givingStreak } from "@/lib/server/streak";

export const GET = handler(async (request) => {
  const session = requireSession(request);
  const [donations, user, points, admin, referrals] = await Promise.all([
    db()
      .from("dw_donations")
      .select("id,amount,campaign_share,anonymous,campaign_id,fund,is_zakat,gift,txid,completed_at,dw_campaigns(title,title_en),dw_donation_items(campaign_id)")
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
    dw_campaigns: { title: string; title_en: string | null } | null;
    dw_donation_items: { campaign_id: string | null }[];
  }[]).map((d) => ({ ...d, dw_campaigns: d.dw_campaigns ? { title: pickTitle(d.dw_campaigns) as string } : null, amount: Number(d.amount), campaign_share: Number(d.campaign_share ?? 0) }));

  const helped = new Set(list.flatMap((d) => d.dw_donation_items.map((i) => i.campaign_id)).filter(Boolean));
  const streak = givingStreak(list.map((d) => d.completed_at));
  const daily = dailyStreak(list.map((d) => d.completed_at));
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
    daily,
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

// "Delete my data": removes what identifies the account in Sanad. Donation records stay (they are on the
// public Pi blockchain and part of campaign totals) but are no longer linked to a name, wallet or invite link.
export const DELETE = handler(async (request) => {
  const session = requireSession(request);
  await eraseApplicantData(session.uid); // refuses while a need request is still open
  await db().from("dw_follows").delete().eq("pi_uid", session.uid);
  await db().from("dw_recurring").delete().eq("pi_uid", session.uid);
  await db().from("dw_friend_pages").delete().eq("owner_uid", session.uid);
  await db().from("dw_donations").update({ anonymous: true, message: null, referrer_uid: null }).eq("pi_uid", session.uid);
  await db().from("dw_users").update({ username: `deleted-${session.uid.slice(0, 6)}`, wallet_address: null, referral_code: null, hawl_start: null, is_admin: false }).eq("pi_uid", session.uid);
  return json({ ok: true });
});
