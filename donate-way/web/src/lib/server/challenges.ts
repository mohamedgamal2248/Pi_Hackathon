import "server-only";
import { pickTitle } from "./campaigns";
import { db } from "./db";

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  goal: number;
  campaign_id: string | null;
  campaign_title: string | null;
  starts_at: string;
  ends_at: string;
  raised: number;
  participants: number;
};

type Raw = { id: string; title: string; description: string | null; goal: number; campaign_id: string | null; starts_at: string; ends_at: string; dw_campaigns: { title: string; title_en: string | null } | null };

async function withProgress(c: Raw): Promise<Challenge> {
  let q = db()
    .from("dw_donation_items")
    .select("amount,dw_donations!inner(status,completed_at,pi_uid)")
    .eq("dw_donations.status", "completed")
    .gte("dw_donations.completed_at", c.starts_at)
    .lte("dw_donations.completed_at", c.ends_at);
  if (c.campaign_id) q = q.eq("campaign_id", c.campaign_id);
  const { data } = await q;
  const rows = (data ?? []) as unknown as { amount: number; dw_donations: { pi_uid: string } }[];
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    goal: Number(c.goal),
    campaign_id: c.campaign_id,
    campaign_title: pickTitle(c.dw_campaigns),
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    raised: rows.reduce((s, r) => s + Number(r.amount), 0),
    participants: new Set(rows.map((r) => r.dw_donations.pi_uid)).size,
  };
}

const COLS = "id,title,description,goal,campaign_id,starts_at,ends_at,dw_campaigns(title,title_en)";

// The running challenge that ends first (or null).
export async function activeChallenge(): Promise<Challenge | null> {
  const now = new Date().toISOString();
  const { data } = await db().from("dw_challenges").select(COLS).lte("starts_at", now).gt("ends_at", now).order("ends_at", { ascending: true }).limit(1);
  const row = (data as unknown as Raw[] | null)?.[0];
  return row ? withProgress(row) : null;
}

export async function listChallenges(): Promise<Challenge[]> {
  const { data } = await db().from("dw_challenges").select(COLS).order("ends_at", { ascending: false }).limit(20);
  return Promise.all(((data ?? []) as unknown as Raw[]).map(withProgress));
}
