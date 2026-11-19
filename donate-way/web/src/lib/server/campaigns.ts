import "server-only";
import { db, must } from "./db";
import { activeMatch } from "./matching";
import { wantsEnglish } from "./network";

export const CATEGORIES = ["health", "education", "food", "water", "emergency", "orphans", "mosque", "debts", "other"] as const;
export const PUBLIC_STATUSES = ["active", "funded", "completed"];

const LIST_COLS = "id,title,title_en,summary,summary_en,category,country,goal,cover_url,urgent,zakat_eligible,deadline,status,created_at,impact_units";

type CampaignRow = {
  id: string;
  title: string;
  title_en?: string | null;
  summary: string | null;
  summary_en?: string | null;
  story?: string;
  story_en?: string | null;
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
  impact_units: { amount: number; label: string; label_en?: string }[];
  organizer_uid?: string;
};

async function statsFor(ids: string[]) {
  if (!ids.length) return new Map<string, { raised: number; donors: number; released: number }>();
  const rows = must(await db().from("dw_campaign_stats_v2").select("*").in("campaign_id", ids)) as {
    campaign_id: string;
    raised: number;
    donors: number;
    released: number;
  }[];
  return new Map(rows.map((r) => [r.campaign_id, { raised: Number(r.raised), donors: Number(r.donors), released: Number(r.released) }]));
}

// English text when the browser asked for English and it exists, else the Arabic original.
export const pick = (ar: string, en?: string | null) => (wantsEnglish() && en && en.trim() ? en : ar);
export const pickTitle = (c: { title: string; title_en?: string | null } | null | undefined) => (c ? pick(c.title, c.title_en) : null);

function shape(c: CampaignRow, s?: { raised: number; donors: number; released: number }, raw = false) {
  const { organizer_uid: _o, ...rest } = c;
  void _o;
  if (!raw) {
    rest.title = pick(c.title, c.title_en);
    rest.summary = c.summary == null ? null : pick(c.summary, c.summary_en);
    if (c.story != null) rest.story = pick(c.story, c.story_en);
    rest.impact_units = (c.impact_units ?? []).map((u) => ({ amount: u.amount, label: pick(u.label, u.label_en) }));
    delete rest.title_en;
    delete rest.summary_en;
    delete rest.story_en;
  }
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
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,title_en.ilike.%${q}%`);
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
      .select("amount,dw_donations!inner(anonymous,message,completed_at,status,pi_uid)")
      .eq("campaign_id", id)
      .eq("dw_donations.status", "completed")
      .order("id", { ascending: false })
      .limit(40),
    viewerUid
      ? db().from("dw_follows").select("campaign_id").eq("campaign_id", id).eq("pi_uid", viewerUid).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const names = await usernames(((items.data ?? []) as unknown as { dw_donations: { pi_uid: string } }[]).map((d) => d.dw_donations.pi_uid));
  const recentDonors = ((items.data ?? []) as unknown as {
    amount: number;
    dw_donations: { anonymous: boolean; message: string | null; completed_at: string; pi_uid: string };
  }[])
    .map((d) => ({
      name: d.dw_donations.anonymous ? null : names.get(d.dw_donations.pi_uid) ?? null,
      amount: Number(d.amount),
      message: d.dw_donations.message,
      at: d.dw_donations.completed_at,
    }))
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return {
    ...shape(c, stats.get(id), includeHidden),
    following: !!follow.data,
    match: await activeMatch(id),
    updates: (updates.data ?? []).map((u) => ({ ...u, amount_spent: u.amount_spent == null ? null : Number(u.amount_spent) })),
    recentDonors,
  };
}

const DAY = 86_400_000;

// Usernames by Pi uid (separate query: donations have two foreign keys to users, which makes embeds ambiguous).
export async function usernames(uids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = [...new Set(uids.filter((u): u is string => !!u))];
  if (!ids.length) return new Map();
  const { data } = await db().from("dw_users").select("pi_uid,username").in("pi_uid", ids);
  return new Map((data ?? []).map((u) => [u.pi_uid as string, u.username as string]));
}

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
    .select("amount,anonymous,completed_at,gift,campaign_id,fund,pi_uid,dw_campaigns(title,title_en)")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as {
    amount: number;
    anonymous: boolean;
    completed_at: string;
    gift: { type: string } | null;
    campaign_id: string | null;
    fund: string | null;
    pi_uid: string;
    dw_campaigns: { title: string; title_en: string | null } | null;
  }[];
  const names = await usernames(rows.map((r) => r.pi_uid));
  return rows.map((d) => ({
    name: d.anonymous ? null : names.get(d.pi_uid) ?? null,
    amount: Number(d.amount),
    at: d.completed_at,
    gift: d.gift?.type ?? null,
    campaignId: d.campaign_id,
    target: pickTitle(d.dw_campaigns) ?? (d.fund === "zakat" ? "zakat" : d.fund === "general" ? "general" : "cart"),
  }));
}

export async function latestProofs(limit = 6) {
  const { data } = await db()
    .from("dw_updates")
    .select("id,title,body,amount_spent,media,created_at,campaign_id,dw_campaigns(title,title_en)")
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
    dw_campaigns: { title: string; title_en: string | null } | null;
  }[]).map((p) => ({ ...p, amount_spent: p.amount_spent == null ? null : Number(p.amount_spent), campaign: pickTitle(p.dw_campaigns) ?? "" }));
}

export async function leaderboard(limit = 10, sinceDays?: number) {
  let q = db().from("dw_donations").select("amount,pi_uid").eq("status", "completed").eq("anonymous", false);
  if (sinceDays) q = q.gte("completed_at", new Date(Date.now() - sinceDays * DAY).toISOString());
  const { data } = await q;
  const rows = (data ?? []) as unknown as { amount: number; pi_uid: string }[];
  const names = await usernames(rows.map((r) => r.pi_uid));
  const totals = new Map<string, { username: string; total: number; count: number }>();
  for (const row of rows) {
    const t = totals.get(row.pi_uid) ?? { username: names.get(row.pi_uid) ?? "?", total: 0, count: 0 };
    t.total += Number(row.amount);
    t.count += 1;
    totals.set(row.pi_uid, t);
  }
  return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

// Ambassadors: people whose invite links brought the most completed donations.
export async function topInviters(limit = 10) {
  const { data } = await db().from("dw_donations").select("amount,referrer_uid").eq("status", "completed").not("referrer_uid", "is", null);
  const rows = (data ?? []) as unknown as { amount: number; referrer_uid: string }[];
  const names = await usernames(rows.map((r) => r.referrer_uid));
  const totals = new Map<string, { username: string; total: number; count: number }>();
  for (const row of rows) {
    const t = totals.get(row.referrer_uid) ?? { username: names.get(row.referrer_uid) ?? "?", total: 0, count: 0 };
    t.total += Number(row.amount);
    t.count += 1;
    totals.set(row.referrer_uid, t);
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, limit);
}
