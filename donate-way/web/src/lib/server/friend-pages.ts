import "server-only";
import { db } from "./db";
import { pickTitle, usernames } from "./campaigns";

type Row = { id: string; owner_uid: string; campaign_id: string; goal: number; message: string | null; created_at: string; dw_campaigns: { title: string; title_en: string | null; status: string; cover_url: string | null } | null };
const COLS = "id,owner_uid,campaign_id,goal,message,created_at,dw_campaigns(title,title_en,status,cover_url)";

// Raised on a friend page = gifts to that campaign that came through the owner's invite link since the page was created.
async function raisedFor(r: Row) {
  const { data } = await db()
    .from("dw_donation_items")
    .select("amount,dw_donations!inner(status,referrer_uid,completed_at,pi_uid)")
    .eq("campaign_id", r.campaign_id)
    .eq("dw_donations.status", "completed")
    .eq("dw_donations.referrer_uid", r.owner_uid)
    .gte("dw_donations.completed_at", r.created_at);
  const rows = (data ?? []) as unknown as { amount: number; dw_donations: { pi_uid: string } }[];
  return { raised: rows.reduce((s, x) => s + Number(x.amount), 0), donors: new Set(rows.map((x) => x.dw_donations.pi_uid)).size };
}

async function shape(r: Row, names: Map<string, string>) {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    campaignTitle: pickTitle(r.dw_campaigns) ?? "",
    campaignStatus: r.dw_campaigns?.status ?? "",
    cover: r.dw_campaigns?.cover_url ?? null,
    owner: names.get(r.owner_uid) ?? "?",
    goal: Number(r.goal),
    message: r.message,
    createdAt: r.created_at,
    ...(await raisedFor(r)),
  };
}

export async function getFriendPage(id: string) {
  const { data } = await db().from("dw_friend_pages").select(COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Row;
  return { ...(await shape(r, await usernames([r.owner_uid]))), ownerUid: r.owner_uid };
}

export async function myFriendPages(uid: string) {
  const { data } = await db().from("dw_friend_pages").select(COLS).eq("owner_uid", uid).order("created_at", { ascending: false }).limit(20);
  const rows = (data ?? []) as unknown as Row[];
  const names = await usernames([uid]);
  return Promise.all(rows.map((r) => shape(r, names)));
}
