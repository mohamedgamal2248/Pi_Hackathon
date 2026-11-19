import "server-only";
import { db, must } from "./db";
import { HttpError } from "./http";
import { approvePayment, cancelPayment, completePayment, getPayment, notify, type PiPayment } from "./pi";
import { awardPoints } from "./points";
import { split } from "./split";

export const MIN_DONATION = 0.01;
export const MAX_DONATION = 100_000;
const MAX_ITEMS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Payment metadata written by the client (lib/client/pi.tsx). Everything is re-validated here
// against the payment as Pi's servers report it; the client is never trusted.
type RawMeta = {
  kind?: string;
  items?: { campaignId?: string | null; fund?: string | null; amount?: number }[];
  anonymous?: boolean;
  message?: string;
  gift?: { type?: string; name?: string; note?: string } | null;
  ref?: string | null;
  zakat?: boolean;
};

type Item = { campaignId: string | null; fund: "general" | "zakat" | null; amount: number };
type Meta = {
  items: Item[];
  anonymous: boolean;
  message: string | null;
  gift: { type: "gift" | "memorial"; name: string; note: string | null } | null;
  ref: string | null;
  zakat: boolean;
};

function readMetadata(payment: PiPayment): Meta {
  const m = (payment.metadata ?? {}) as RawMeta;
  if (m.kind !== "donation") throw new HttpError(400, "not_a_donation");
  if (!Array.isArray(m.items) || m.items.length === 0 || m.items.length > MAX_ITEMS) throw new HttpError(400, "items_invalid");

  const items: Item[] = m.items.map((it) => {
    const amount = Number(it.amount);
    if (!Number.isFinite(amount) || amount < MIN_DONATION) throw new HttpError(400, "item_amount_invalid");
    if (it.campaignId) {
      if (typeof it.campaignId !== "string" || !UUID.test(it.campaignId)) throw new HttpError(400, "campaign_invalid");
      return { campaignId: it.campaignId, fund: null, amount };
    }
    if (it.fund !== "general" && it.fund !== "zakat") throw new HttpError(400, "fund_invalid");
    return { campaignId: null, fund: it.fund, amount };
  });
  const total = items.reduce((s, it) => s + it.amount, 0);
  if (Math.abs(total - payment.amount) > 1e-6) throw new HttpError(400, "items_do_not_match_amount");

  let gift: Meta["gift"] = null;
  if (m.gift && (m.gift.type === "gift" || m.gift.type === "memorial")) {
    const name = String(m.gift.name ?? "").trim().slice(0, 60);
    if (name) gift = { type: m.gift.type, name, note: m.gift.note ? String(m.gift.note).trim().slice(0, 200) : null };
  }
  return {
    items,
    anonymous: m.anonymous === true,
    message: typeof m.message === "string" && m.message.trim() ? m.message.trim().slice(0, 280) : null,
    gift,
    ref: typeof m.ref === "string" && /^[a-z0-9]{6,12}$/.test(m.ref) ? m.ref : null,
    zakat: m.zakat === true,
  };
}

async function loadOwnPayment(paymentId: string, uid: string) {
  if (typeof paymentId !== "string" || !paymentId || paymentId.length > 100) throw new HttpError(400, "payment_invalid");
  const payment = await getPayment(paymentId);
  if (payment.user_uid !== uid) throw new HttpError(403, "payment_not_yours");
  if (payment.direction !== "user_to_app") throw new HttpError(400, "payment_direction");
  return payment;
}

async function assertDonatable(meta: Meta) {
  const ids = [...new Set(meta.items.map((i) => i.campaignId).filter(Boolean))] as string[];
  if (!ids.length) return;
  const rows = must(
    await db().from("dw_campaigns").select("id,status,deadline,zakat_eligible").in("id", ids)
  ) as { id: string; status: string; deadline: string | null; zakat_eligible: boolean }[];
  for (const id of ids) {
    const c = rows.find((r) => r.id === id);
    if (!c) throw new HttpError(404, "campaign_not_found");
    if (!["active", "funded"].includes(c.status)) throw new HttpError(409, "campaign_closed");
    if (c.deadline && new Date(c.deadline) < new Date()) throw new HttpError(409, "campaign_ended");
    if (meta.zakat && !c.zakat_eligible) throw new HttpError(400, "campaign_not_zakat_eligible");
  }
}

async function referrerFor(code: string | null, uid: string): Promise<string | null> {
  if (!code) return null;
  const { data } = await db().from("dw_users").select("pi_uid").eq("referral_code", code).maybeSingle();
  return data && data.pi_uid !== uid ? data.pi_uid : null;
}

async function recordDonation(payment: PiPayment, uid: string, meta: Meta) {
  const existing = must(
    await db().from("dw_donations").select("id,status").eq("payment_id", payment.identifier).maybeSingle()
  ) as { id: string; status: string } | null;
  if (existing) return existing;

  const total = split(payment.amount);
  const single = meta.items.length === 1 ? meta.items[0] : null;
  const row = must(
    await db()
      .from("dw_donations")
      .insert({
        payment_id: payment.identifier,
        campaign_id: single?.campaignId ?? null,
        fund: single?.fund ?? null,
        pi_uid: uid,
        amount: total.amount,
        campaign_share: total.campaignShare,
        platform_fee: total.platformFee,
        anonymous: meta.anonymous,
        message: meta.message,
        gift: meta.gift,
        is_zakat: meta.zakat,
        referrer_uid: await referrerFor(meta.ref, uid),
      })
      .select("id,status")
      .single()
  ) as { id: string; status: string };

  must(
    await db()
      .from("dw_donation_items")
      .insert(
        meta.items.map((it) => {
          const s = split(it.amount);
          return { donation_id: row.id, campaign_id: it.campaignId, fund: it.fund, amount: s.amount, campaign_share: s.campaignShare, platform_fee: s.platformFee };
        })
      )
  );
  return row;
}

export async function approveDonation(paymentId: string, uid: string) {
  const payment = await loadOwnPayment(paymentId, uid);
  if (payment.status.cancelled || payment.status.user_cancelled) throw new HttpError(409, "payment_cancelled");
  if (payment.amount < MIN_DONATION || payment.amount > MAX_DONATION) throw new HttpError(400, "amount_out_of_range");
  const meta = readMetadata(payment);
  await assertDonatable(meta);
  await recordDonation(payment, uid, meta);
  if (!payment.status.developer_approved) await approvePayment(payment.identifier);
  return { ok: true };
}

export async function completeDonation(paymentId: string, txid: string, uid: string) {
  if (typeof txid !== "string" || !/^[0-9a-f]{64}$/i.test(txid)) throw new HttpError(400, "txid_invalid");
  const payment = await loadOwnPayment(paymentId, uid);
  const meta = readMetadata(payment);
  const row = await recordDonation(payment, uid, meta);
  if (row.status === "completed") return summary(row.id);

  // Pi verifies the blockchain transaction here; a non-200 answer throws and nothing is recorded as paid.
  if (!payment.status.developer_completed) await completePayment(payment.identifier, txid);

  const { data: updated } = await db()
    .from("dw_donations")
    .update({ status: "completed", txid, completed_at: new Date().toISOString() })
    .eq("id", row.id)
    .neq("status", "completed")
    .select("id,referrer_uid");
  if (updated?.length) await afterCompleted(payment, uid, meta, row.id, updated[0].referrer_uid);
  if (/^G[A-Z2-7]{55}$/.test(payment.from_address ?? ""))
    await db().from("dw_users").update({ wallet_address: payment.from_address }).eq("pi_uid", uid).is("wallet_address", null);
  return summary(row.id);
}

async function afterCompleted(payment: PiPayment, uid: string, meta: Meta, donationId: string, referrer: string | null) {
  const { count } = await db()
    .from("dw_donations")
    .select("id", { count: "exact", head: true })
    .eq("pi_uid", uid)
    .eq("status", "completed");
  await awardPoints(uid, payment.amount * 10, "donation", donationId);
  if (count === 1) await awardPoints(uid, 50, "first_donation", uid);
  if (meta.gift) await awardPoints(uid, 20, "gift", donationId);

  // Ambassador ("سفير الخير"): the person whose link brought this donation earns points.
  if (referrer) {
    await awardPoints(referrer, payment.amount * 3, "referral", donationId);
    if (count === 1) await awardPoints(referrer, 100, "referral_first", uid); // bonus when the invited friend gives for the first time
    await db().from("dw_users").update({ referred_by: referrer }).eq("pi_uid", uid).is("referred_by", null);
    await notify([
      { user_uid: referrer, title: "سفير الخير", body: `حد اتبرع بـ ${payment.amount} π من رابطك. شكرًا إنك بتنشر الخير!`, subroute: "/me" },
    ]);
  }

  // Campaigns that just reached their goal: mark funded and tell followers + donors.
  const ids = [...new Set(meta.items.map((i) => i.campaignId).filter(Boolean))] as string[];
  for (const id of ids) {
    const [{ data: c }, { data: s }] = await Promise.all([
      db().from("dw_campaigns").select("id,title,goal,status").eq("id", id).maybeSingle(),
      db().from("dw_campaign_stats_v2").select("raised").eq("campaign_id", id).maybeSingle(),
    ]);
    if (!c || !s || c.status !== "active" || Number(s.raised) < Number(c.goal)) continue;
    await db().from("dw_campaigns").update({ status: "funded" }).eq("id", id).eq("status", "active");
    await notify(
      (await campaignAudience(id)).map((user_uid) => ({
        user_uid,
        title: "اكتمل التمويل",
        body: `حملة "${c.title}" وصلت لهدفها. شكرًا لكل اللي ساهم!`,
        subroute: `/campaigns/${id}`,
      }))
    );
  }
}

// Everyone who donated to or follows a campaign.
export async function campaignAudience(campaignId: string): Promise<string[]> {
  const [{ data: followers }, { data: items }] = await Promise.all([
    db().from("dw_follows").select("pi_uid").eq("campaign_id", campaignId),
    db().from("dw_donation_items").select("dw_donations!inner(pi_uid,status)").eq("campaign_id", campaignId).eq("dw_donations.status", "completed"),
  ]);
  const uids = new Set<string>((followers ?? []).map((f) => f.pi_uid));
  for (const it of (items ?? []) as unknown as { dw_donations: { pi_uid: string } }[]) uids.add(it.dw_donations.pi_uid);
  return [...uids];
}

async function summary(donationId: string) {
  return { ok: true, donationId };
}

export async function cancelDonation(paymentId: string, uid: string) {
  const payment = await loadOwnPayment(paymentId, uid);
  await db().from("dw_donations").update({ status: "cancelled" }).eq("payment_id", payment.identifier).eq("status", "approved");
  return { ok: true };
}

// The SDK reports a payment left unfinished by an earlier session: finish it if paid, else cancel it.
export async function resolveIncomplete(paymentId: string, uid: string) {
  const payment = await loadOwnPayment(paymentId, uid);
  if (payment.status.developer_completed) return { ok: true, state: "already_completed" };
  if (payment.transaction?.txid) {
    await completeDonation(payment.identifier, payment.transaction.txid, uid);
    return { ok: true, state: "completed" };
  }
  await cancelPayment(payment.identifier).catch(() => undefined);
  await db().from("dw_donations").update({ status: "cancelled" }).eq("payment_id", payment.identifier).eq("status", "approved");
  return { ok: true, state: "cancelled" };
}
