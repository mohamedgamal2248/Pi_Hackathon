import "server-only";
import { db, must } from "./db";

export const CATEGORIES = ["health", "education", "food", "water", "emergency", "orphans", "mosque", "debts", "other"] as const;
export const PUBLIC_STATUSES = ["active", "funded", "completed"];

const LIST_COLS = "id,title,summary,category,country,goal,cover_url,urgent,zakat_eligible,deadline,status,created_at,impact_units";

type CampaignRow = {
  id: string;
  title: string;
  summary: string | null;
  story?: string;
  category: string;
  country: string;
  goal: number;
  cover_url: string | null;
  gallery?: string[];
  video_url?: string | null;
  urgent: boolean;
  zakat_eligible: boolean;
  deadline: string | null;
  status: string;
  created_at: string;
  impact_units: { amount: number; label: string }[];
  organizer_uid?: string;
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

function shape(c: CampaignRow, s?: { raised: number; donors: number; released: number }) {
  const { organizer_uid: _o, ...rest } = c;
  void _o;
  return { ...rest, goal: Number(c.goal), raised: s?.raised ?? 0, donors: s?.donors ?? 0, released: s?.released ?? 0 };
}

export async function listCampaigns(opts: { category?: string; q?: string; sort?: string; statuses?: string[]; zakat?: boolean; ids?: string[] }) {
  let query = db()
    .from("dw_campaigns")
    .select(LIST_COLS)
    .in("status", opts.statuses ?? PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(100);
  if (opts.category && (CATEGORIES as readonly string[]).includes(opts.category)) query = query.eq("category", opts.category);
  if (opts.zakat) query = query.eq("zakat_eligible", true);
  if (opts.ids) query = query.in("id", opts.ids);
  if (opts.q) {
    const q = opts.q.replace(/[%,()]/g, " ").slice(0, 60);
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  const rows = must(await query) as CampaignRow[];
  const stats = await statsFor(rows.map((r) => r.id));
  const list = rows.map((r) => shape(r, stats.get(r.id)));
  // Open campaigns before funded/completed ones.
  const rank = (s: string) => (s === "active" ? 0 : s === "funded" ? 1 : 2);
  switch (opts.sort) {
    case "closest":
      list.sort((a, b) => rank(a.status) - rank(b.status) || b.raised / b.goal - a.raised / a.goal);
      break;
    case "most_funded":
      list.sort((a, b) => b.raised - a.raised);
      break;
    default:
      list.sort((a, b) => rank(a.status) - rank(b.status) || Number(b.urgent) - Number(a.urgent));
  }
  return list;
}

export async function getCampaign(id: string, viewerUid?: string, includeHidden = false) {
  const c = must(await db().from("dw_campaigns").select("*").eq("id", id).maybeSingle()) as CampaignRow | null;
  if (!c) return null;
  if (!PUBLIC_STATUSES.includes(c.status) && !includeHidden) return null;

  const [stats, updates, items, follow] = await Promise.all([
    statsFor([id]),
    db().from("dw_updates").select("id,kind,title,body,amount_spent,media,created_at").eq("campaign_id", id).order("created_at", { ascending: false }),
    db()
      .from("dw_donation_items")
      .select("campaign_share,dw_donations!inner(anonymous,message,completed_at,status,dw_users(username))")
      .eq("campaign_id", id)
      .eq("dw_donations.status", "completed")
      .order("id", { ascending: false })
      .limit(40),
    viewerUid
      ? db().from("dw_follows").select("campaign_id").eq("campaign_id", id).eq("pi_uid", viewerUid).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const recentDonors = ((items.data ?? []) as unknown as {
    campaign_share: number;
    dw_donations: { anonymous: boolean; message: string | null; completed_at: string; dw_users: { username: string } | null };
  }[])
    .map((d) => ({
      name: d.dw_donations.anonymous ? null : d.dw_donations.dw_users?.username ?? null,
      amount: Number(d.campaign_share),
      message: d.dw_donations.message,
      at: d.dw_donations.completed_at,
    }))
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return {
    ...shape(c, stats.get(id)),
    following: !!follow.data,
    updates: (updates.data ?? []).map((u) => ({ ...u, amount_spent: u.amount_spent == null ? null : Number(u.amount_spent) })),
    recentDonors,
  };
}

const DAY = 86_400_000;

export async function platformStats() {
  const { data } = await db().from("dw_donations").select("amount,campaign_share,platform_fee,pi_uid,completed_at").eq("status", "completed");
  const rows = data ?? [];
  const since = Date.now() - DAY;
  const last24 = rows.filter((r) => r.completed_at && new Date(r.completed_at).getTime() >= since);
  const [{ count: campaigns }, { data: proofs }] = await Promise.all([
    db().from("dw_campaigns").select("id", { count: "exact", head: true }).in("status", PUBLIC_STATUSES),
    db().from("dw_updates").select("amount_spent").eq("kind", "proof_of_spend"),
  ]);
  const sum = (xs: { [k: string]: unknown }[], k: string) => xs.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  return {
    total: sum(rows, "amount"),
    toCampaigns: sum(rows, "campaign_share"),
    platformFees: sum(rows, "platform_fee"),
    donors: new Set(rows.map((r) => r.pi_uid)).size,
    donations: rows.length,
    campaigns: campaigns ?? 0,
    released: sum(proofs ?? [], "amount_spent"),
    last24h: { total: sum(last24, "amount"), donors: new Set(last24.map((r) => r.pi_uid)).size },
  };
}

// Latest donations for the live feed. Anonymous donors are shown without a name.
export async function recentFeed(limit = 12) {
  const { data } = await db()
    .from("dw_donations")
    .select("amount,anonymous,completed_at,gift,campaign_id,fund,dw_users(username),dw_campaigns(title)")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as {
    amount: number;
    anonymous: boolean;
    completed_at: string;
    gift: { type: string } | null;
    campaign_id: string | null;
    fund: string | null;
    dw_users: { username: string } | null;
    dw_campaigns: { title: string } | null;
  }[]).map((d) => ({
    name: d.anonymous ? null : d.dw_users?.username ?? null,
    amount: Number(d.amount),
    at: d.completed_at,
    gift: d.gift?.type ?? null,
    campaignId: d.campaign_id,
    target: d.dw_campaigns?.title ?? (d.fund === "zakat" ? "zakat" : d.fund === "general" ? "general" : "cart"),
  }));
}

export async function latestProofs(limit = 6) {
  const { data } = await db()
    .from("dw_updates")
    .select("id,title,body,amount_spent,media,created_at,campaign_id,dw_campaigns(title)")
    .eq("kind", "proof_of_spend")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as {
    id: string;
    title: string;
    body: string;
    amount_spent: number | null;
    media: string[];
    created_at: string;
    campaign_id: string;
    dw_campaigns: { title: string } | null;
  }[]).map((p) => ({ ...p, amount_spent: p.amount_spent == null ? null : Number(p.amount_spent), campaign: p.dw_campaigns?.title ?? "" }));
}

export async function leaderboard(limit = 10, sinceDays?: number) {
  let q = db().from("dw_donations").select("amount,pi_uid,dw_users(username)").eq("status", "completed").eq("anonymous", false);
  if (sinceDays) q = q.gte("completed_at", new Date(Date.now() - sinceDays * DAY).toISOString());
  const { data } = await q;
  const totals = new Map<string, { username: string; total: number; count: number }>();
  for (const row of (data ?? []) as unknown as { amount: number; pi_uid: string; dw_users: { username: string } | null }[]) {
    const t = totals.get(row.pi_uid) ?? { username: row.dw_users?.username ?? "?", total: 0, count: 0 };
    t.total += Number(row.amount);
    t.count += 1;
    totals.set(row.pi_uid, t);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}
