import "server-only";
import { db, must } from "./db";
import { HttpError } from "./http";
import { approvePayment, cancelPayment, completePayment, getPayment, notify, type PiPayment } from "./pi";
import { awardPoints } from "./points";

export const MIN_DONATION = 0.01;
export const MAX_DONATION = 100_000;

type DonationMetadata = {
  kind?: string;
  campaignId?: string | null;
  anonymous?: boolean;
  message?: string;
  recurringId?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readMetadata(payment: PiPayment): Required<DonationMetadata> {
  const m = (payment.metadata ?? {}) as DonationMetadata;
  if (m.kind !== "donation") throw new HttpError(400, "not_a_donation");
  const campaignId = m.campaignId ?? null;
  if (campaignId !== null && (typeof campaignId !== "string" || !UUID.test(campaignId))) {
    throw new HttpError(400, "campaign_invalid");
  }
  const recurringId = m.recurringId ?? null;
  if (recurringId !== null && (typeof recurringId !== "string" || !UUID.test(recurringId))) {
    throw new HttpError(400, "recurring_invalid");
  }
  return {
    kind: "donation",
    campaignId,
    anonymous: m.anonymous === true,
    message: typeof m.message === "string" ? m.message.trim().slice(0, 280) : "",
    recurringId,
  };
}

// Everything the client says is re-checked against the payment as Pi's servers see it.
async function loadOwnPayment(paymentId: string, uid: string) {
  if (typeof paymentId !== "string" || !paymentId || paymentId.length > 100) throw new HttpError(400, "payment_invalid");
  const payment = await getPayment(paymentId);
  if (payment.user_uid !== uid) throw new HttpError(403, "payment_not_yours");
  if (payment.direction !== "user_to_app") throw new HttpError(400, "payment_direction");
  return payment;
}

async function assertDonatable(campaignId: string | null) {
  if (!campaignId) return null;
  const campaign = must(
    await db().from("dw_campaigns").select("id,title,status,goal,organizer_uid,deadline").eq("id", campaignId).maybeSingle()
  ) as { id: string; title: string; status: string; goal: number; organizer_uid: string; deadline: string | null } | null;
  if (!campaign) throw new HttpError(404, "campaign_not_found");
  if (!["active", "funded"].includes(campaign.status)) throw new HttpError(409, "campaign_closed");
  if (campaign.deadline && new Date(campaign.deadline) < new Date()) throw new HttpError(409, "campaign_ended");
  return campaign;
}

async function upsertDonation(payment: PiPayment, uid: string, meta: Required<DonationMetadata>) {
  if (meta.recurringId) {
    const { data } = await db().from("dw_recurring").select("id").eq("id", meta.recurringId).eq("pi_uid", uid).maybeSingle();
    if (!data) meta.recurringId = null;
  }
  must(
    await db()
      .from("dw_donations")
      .upsert(
        {
          payment_id: payment.identifier,
          campaign_id: meta.campaignId,
          pi_uid: uid,
          amount: payment.amount,
          anonymous: meta.anonymous,
          message: meta.message || null,
          recurring_id: meta.recurringId,
        },
        { onConflict: "payment_id", ignoreDuplicates: true }
      )
  );
}

export async function approveDonation(paymentId: string, uid: string) {
  const payment = await loadOwnPayment(paymentId, uid);
  if (payment.status.cancelled || payment.status.user_cancelled) throw new HttpError(409, "payment_cancelled");
  if (payment.amount < MIN_DONATION || payment.amount > MAX_DONATION) throw new HttpError(400, "amount_out_of_range");
  const meta = readMetadata(payment);
  await assertDonatable(meta.campaignId);
  await upsertDonation(payment, uid, meta);
  if (!payment.status.developer_approved) await approvePayment(payment.identifier);
  return { ok: true };
}

export async function completeDonation(paymentId: string, txid: string, uid: string) {
  if (typeof txid !== "string" || !/^[0-9a-f]{64}$/i.test(txid)) throw new HttpError(400, "txid_invalid");
  const payment = await loadOwnPayment(paymentId, uid);
  const meta = readMetadata(payment);

  const existing = must(
    await db().from("dw_donations").select("id,status").eq("payment_id", payment.identifier).maybeSingle()
  ) as { id: string; status: string } | null;
  if (!existing) {
    // Approved by an earlier session that crashed before the row was written.
    await upsertDonation(payment, uid, meta);
  } else if (existing.status === "completed") {
    return summary(payment.identifier);
  }

  // Pi checks the blockchain transaction here. A non-200 answer throws, and we deliver nothing.
  if (!payment.status.developer_completed) await completePayment(payment.identifier, txid);

  must(
    await db()
      .from("dw_donations")
      .update({ status: "completed", txid, completed_at: new Date().toISOString() })
      .eq("payment_id", payment.identifier)
      .neq("status", "completed")
  );

  await afterCompleted(payment, uid, meta);
  return summary(payment.identifier);
}

async function afterCompleted(payment: PiPayment, uid: string, meta: Required<DonationMetadata>) {
  const { count } = await db()
    .from("dw_donations")
    .select("id", { count: "exact", head: true })
    .eq("pi_uid", uid)
    .eq("status", "completed");

  await awardPoints(uid, payment.amount * 10, "donation", payment.identifier);
  if (count === 1) await awardPoints(uid, 50, "first_donation", uid);
  if (meta.recurringId) {
    await awardPoints(uid, payment.amount * 2, "recurring_bonus", payment.identifier);
    const { data: rec } = await db().from("dw_recurring").select("next_due").eq("id", meta.recurringId).maybeSingle();
    if (rec) {
      const next = new Date(Math.max(Date.now(), new Date(rec.next_due).getTime()));
      next.setMonth(next.getMonth() + 1);
      await db().from("dw_recurring").update({ next_due: next.toISOString().slice(0, 10) }).eq("id", meta.recurringId);
    }
  }

  if (!meta.campaignId) return;
  const { data: campaign } = await db()
    .from("dw_campaigns")
    .select("id,title,goal,status,organizer_uid")
    .eq("id", meta.campaignId)
    .maybeSingle();
  const { data: stats } = await db().from("dw_campaign_stats").select("raised").eq("campaign_id", meta.campaignId).maybeSingle();
  if (campaign && stats && campaign.status === "active" && Number(stats.raised) >= Number(campaign.goal)) {
    await db().from("dw_campaigns").update({ status: "funded" }).eq("id", campaign.id).eq("status", "active");
    const { data: followers } = await db().from("dw_follows").select("pi_uid").eq("campaign_id", campaign.id);
    const uids = new Set([campaign.organizer_uid, ...(followers ?? []).map((f) => f.pi_uid)]);
    await notify(
      [...uids].map((user_uid) => ({
        user_uid,
        title: "🎉 اكتمل التمويل",
        body: `حملة "${campaign.title}" وصلت لهدفها. شكرًا لكل من ساهم!`,
        subroute: `/campaigns/${campaign.id}`,
      }))
    );
  }
}

async function summary(paymentId: string) {
  const { data } = await db()
    .from("dw_donations")
    .select("id,amount,campaign_id,txid,completed_at,dw_campaigns(title)")
    .eq("payment_id", paymentId)
    .maybeSingle();
  return { ok: true, donation: data };
}

export async function cancelDonation(paymentId: string, uid: string) {
  const payment = await loadOwnPayment(paymentId, uid);
  await db().from("dw_donations").update({ status: "cancelled" }).eq("payment_id", payment.identifier).eq("status", "approved");
  return { ok: true };
}

// Called with the payment the SDK found unfinished at sign-in.
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
