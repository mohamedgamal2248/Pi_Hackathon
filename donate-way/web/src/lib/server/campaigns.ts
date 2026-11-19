import "server-only";
import { db, must } from "./db";

export const CATEGORIES = ["health", "education", "food", "water", "emergency", "orphans", "mosque", "other"] as const;
export const PUBLIC_STATUSES = ["active", "funded", "completed"];

type CampaignRow = {
  id: string;
  title: string;
  summary: string;
  story?: string;
  category: string;
  country: string;
  goal: number;
  cover_url: string | null;
  gallery?: string[];
  video_url?: string | null;
  urgent: boolean;
  deadline: string | null;
  status: string;
  created_at: string;
  organizer_uid: string;
};

async function statsFor(ids: string[]) {
  if (!ids.length) return new Map<string, { raised: number; donors: number; released: number }>();
  const rows = must(await db().from("dw_campaign_stats").select("*").in("campaign_id", ids)) as {
    campaign_id: string;
    raised: number;
    donors: number;
    released: number;
  }[];
  return new Map(rows.map((r) => [r.campaign_id, { raised: Number(r.raised), donors: Number(r.donors), released: Number(r.released) }]));
}

async function organizersFor(uids: string[]) {
  if (!uids.length) return new Map<string, { username: string; name: string; org: string | null }>();
  const users = must(await db().from("dw_users").select("pi_uid,username").in("pi_uid", uids)) as { pi_uid: string; username: string }[];
  const orgs = must(
    await db().from("dw_organizers").select("pi_uid,full_name,org_name").in("pi_uid", uids)
  ) as { pi_uid: string; full_name: string; org_name: string | null }[];
  const orgMap = new Map(orgs.map((o) => [o.pi_uid, o]));
  return new Map(
    users.map((u) => [u.pi_uid, { username: u.username, name: orgMap.get(u.pi_uid)?.full_name ?? u.username, org: orgMap.get(u.pi_uid)?.org_name ?? null }])
  );
}

function publicCampaign(c: CampaignRow, stats?: { raised: number; donors: number; released: number }, organizer?: { username: string; name: string; org: string | null }) {
  const { organizer_uid: _uid, ...rest } = c;
  void _uid;
  return {
    ...rest,
    goal: Number(c.goal),
    raised: stats?.raised ?? 0,
    donors: stats?.donors ?? 0,
    released: stats?.released ?? 0,
    organizer: organizer ?? null,
  };
}

export async function listCampaigns(opts: { category?: string; q?: string; sort?: string; organizerUid?: string; statuses?: string[] }) {
  let query = db()
    .from("dw_campaigns")
    .select("id,title,summary,category,country,goal,cover_url,urgent,deadline,status,created_at,organizer_uid")
    .in("status", opts.statuses ?? PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(100);
  if (opts.category && (CATEGORIES as readonly string[]).includes(opts.category)) query = query.eq("category", opts.category);
  if (opts.organizerUid) query = query.eq("organizer_uid", opts.organizerUid);
  if (opts.q) {
    const q = opts.q.replace(/[%,()]/g, " ").slice(0, 60);
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  const rows = must(await query) as CampaignRow[];
  const stats = await statsFor(rows.map((r) => r.id));
  const orgs = await organizersFor([...new Set(rows.map((r) => r.organizer_uid))]);
  const list = rows.map((r) => publicCampaign(r, stats.get(r.id), orgs.get(r.organizer_uid)));

  switch (opts.sort) {
    case "closest":
      list.sort((a, b) => b.raised / b.goal - a.raised / a.goal);
      break;
    case "most_funded":
      list.sort((a, b) => b.raised - a.raised);
      break;
    case "urgent":
      list.sort((a, b) => Number(b.urgent) - Number(a.urgent));
      break;
  }
  return list;
}

export async function getCampaign(id: string, viewerUid?: string) {
  const c = must(await db().from("dw_campaigns").select("*").eq("id", id).maybeSingle()) as CampaignRow | null;
  if (!c) return null;
  const isOwner = viewerUid === c.organizer_uid;
  if (!PUBLIC_STATUSES.includes(c.status) && !isOwner) return null;

  const [stats, orgs, updates, tranches, donations, follow] = await Promise.all([
    statsFor([id]),
    organizersFor([c.organizer_uid]),
    db().from("dw_updates").select("id,kind,title,body,amount_spent,media,created_at").eq("campaign_id", id).order("created_at", { ascending: false }),
    db().from("dw_tranches").select("id,amount,status,txid,note,created_at,paid_at,proof_update_id").eq("campaign_id", id).order("created_at"),
    db()
      .from("dw_donations")
      .select("amount,anonymous,message,completed_at,dw_users(username)")
      .eq("campaign_id", id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(30),
    viewerUid
      ? db().from("dw_follows").select("campaign_id").eq("campaign_id", id).eq("pi_uid", viewerUid).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const recentDonors = ((donations.data ?? []) as unknown as {
    amount: number;
    anonymous: boolean;
    message: string | null;
    completed_at: string;
    dw_users: { username: string } | null;
  }[]).map((d) => ({
    name: d.anonymous ? null : d.dw_users?.username ?? null,
    amount: Number(d.amount),
    message: d.message,
    at: d.completed_at,
  }));

  return {
    ...publicCampaign(c, stats.get(id), orgs.get(c.organizer_uid)),
    isOwner,
    following: !!follow.data,
    updates: updates.data ?? [],
    tranches: (tranches.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
    recentDonors,
  };
}

export async function platformStats() {
  const { data } = await db().from("dw_donations").select("amount,pi_uid,campaign_id").eq("status", "completed");
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const donors = new Set(rows.map((r) => r.pi_uid)).size;
  const { count: campaigns } = await db()
    .from("dw_campaigns")
    .select("id", { count: "exact", head: true })
    .in("status", PUBLIC_STATUSES);
  const { data: released } = await db().from("dw_tranches").select("amount").eq("status", "paid");
  return {
    total,
    donors,
    donations: rows.length,
    campaigns: campaigns ?? 0,
    released: (released ?? []).reduce((s, r) => s + Number(r.amount), 0),
  };
}

export async function leaderboard(limit = 20) {
  // Anonymous donations count toward the donor's total but the board never shows them by name.
  const { data } = await db()
    .from("dw_donations")
    .select("amount,pi_uid,anonymous,dw_users(username)")
    .eq("status", "completed")
    .eq("anonymous", false);
  const totals = new Map<string, { username: string; total: number; count: number }>();
  for (const row of (data ?? []) as unknown as { amount: number; pi_uid: string; dw_users: { username: string } | null }[]) {
    const t = totals.get(row.pi_uid) ?? { username: row.dw_users?.username ?? "?", total: 0, count: 0 };
    t.total += Number(row.amount);
    t.count += 1;
    totals.set(row.pi_uid, t);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}
