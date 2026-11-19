import { db } from "@/lib/server/db";
import { usernames } from "@/lib/server/campaigns";
import { handler, HttpError, json, uuid } from "@/lib/server/http";

// Public receipt / gift card for one completed donation. Never exposes the donor's Pi uid,
// and hides the donor's name when the donation was anonymous.
export const GET = handler(async (_request, ctx: RouteContext<"/api/donations/[id]">) => {
  const id = uuid((await ctx.params).id, "id");
  const { data, error } = await db()
    .from("dw_donations")
    .select("id,amount,campaign_share,platform_fee,anonymous,message,gift,is_zakat,txid,completed_at,status,pi_uid,dw_donation_items(amount,campaign_share,fund,campaign_id,dw_campaigns(title,cover_url))")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("receipt query", error.message);
  const d = data as unknown as {
    id: string;
    amount: number;
    campaign_share: number;
    platform_fee: number;
    anonymous: boolean;
    message: string | null;
    gift: { type: string; name: string; note: string | null } | null;
    is_zakat: boolean;
    txid: string | null;
    completed_at: string;
    status: string;
    pi_uid: string;
    dw_donation_items: { amount: number; campaign_share: number; fund: string | null; campaign_id: string | null; dw_campaigns: { title: string; cover_url: string | null } | null }[];
  } | null;
  const donor = d && !d.anonymous ? (await usernames([d.pi_uid])).get(d.pi_uid) ?? null : null;
  if (!d || d.status !== "completed") throw new HttpError(404, "not_found");
  return json({
    donation: {
      id: d.id,
      amount: Number(d.amount),
      campaignShare: Number(d.campaign_share),
      platformFee: Number(d.platform_fee),
      donor: donor,
      message: d.message,
      gift: d.gift,
      isZakat: d.is_zakat,
      txid: d.txid,
      at: d.completed_at,
      items: d.dw_donation_items.map((i) => ({
        amount: Number(i.amount),
        share: Number(i.campaign_share),
        campaignId: i.campaign_id,
        title: i.dw_campaigns?.title ?? null,
        cover: i.dw_campaigns?.cover_url ?? null,
        fund: i.fund,
      })),
    },
  });
});
