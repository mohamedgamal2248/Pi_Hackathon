import "server-only";
import { db } from "./db";

export type Match = { id: string; sponsor: string; multiplier: number; cap: number; ends_at: string; matched: number; remaining: number };

// A running match for a campaign: the sponsor adds `multiplier` x the donations made during the period, up to `cap`.
export async function activeMatch(campaignId: string): Promise<Match | null> {
  const now = new Date().toISOString();
  const { data } = await db().from("dw_matches").select("id,sponsor,multiplier,cap,starts_at,ends_at").eq("campaign_id", campaignId).lte("starts_at", now).gt("ends_at", now).order("ends_at").limit(1);
  const m = data?.[0] as { id: string; sponsor: string; multiplier: number; cap: number; starts_at: string; ends_at: string } | undefined;
  if (!m) return null;
  const { data: rows } = await db()
    .from("dw_donation_items")
    .select("amount,dw_donations!inner(status,completed_at)")
    .eq("campaign_id", campaignId)
    .eq("dw_donations.status", "completed")
    .gte("dw_donations.completed_at", m.starts_at);
  const given = (rows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);
  const matched = Math.min(Number(m.cap), given * Number(m.multiplier));
  return { id: m.id, sponsor: m.sponsor, multiplier: Number(m.multiplier), cap: Number(m.cap), ends_at: m.ends_at, matched, remaining: Math.max(0, Number(m.cap) - matched) };
}
