import "server-only";
import PiNetwork from "pi-backend";
import { db, must } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
import { notify } from "./pi";

// App-to-user payout of a tranche to the campaign organizer.
// The A2U payment id is stored before the blockchain submit, so a retry never pays twice.
export async function payTranche(trancheId: string) {
  const tranche = must(
    await db()
      .from("dw_tranches")
      .select("id,amount,status,a2u_payment_id,txid,campaign_id,dw_campaigns(title,organizer_uid)")
      .eq("id", trancheId)
      .maybeSingle()
  ) as unknown as {
    id: string;
    amount: number;
    status: string;
    a2u_payment_id: string | null;
    txid: string | null;
    campaign_id: string;
    dw_campaigns: { title: string; organizer_uid: string };
  } | null;
  if (!tranche) throw new HttpError(404, "tranche_not_found");
  if (tranche.status === "paid") return { ok: true, txid: tranche.txid };
  if (!["requested", "approved"].includes(tranche.status)) throw new HttpError(409, "tranche_not_payable");

  const pi = new PiNetwork(env.piApiKey(), env.piWalletSeed());
  let paymentId = tranche.a2u_payment_id;
  if (!paymentId) {
    paymentId = await pi.createPayment({
      amount: Number(tranche.amount),
      memo: `Sanad: ${tranche.dw_campaigns.title}`.slice(0, 120),
      metadata: { kind: "tranche", trancheId: tranche.id, campaignId: tranche.campaign_id },
      uid: tranche.dw_campaigns.organizer_uid,
    });
    must(await db().from("dw_tranches").update({ status: "approved", a2u_payment_id: paymentId }).eq("id", tranche.id));
  }

  const payment = await pi.getPayment(paymentId);
  const txid = payment.transaction?.txid ?? (await pi.submitPayment(paymentId));
  if (!payment.status.developer_completed) await pi.completePayment(paymentId, txid);

  must(await db().from("dw_tranches").update({ status: "paid", txid, paid_at: new Date().toISOString() }).eq("id", tranche.id));
  await notify([
    {
      user_uid: tranche.dw_campaigns.organizer_uid,
      title: "💸 تم تحويل دفعة",
      body: `${Number(tranche.amount)} π لحملة ${tranche.dw_campaigns.title}. ارفع إثبات الصرف عشان تطلب الدفعة الجاية.`,
      subroute: `/campaigns/${tranche.campaign_id}`,
    },
  ]);
  return { ok: true, txid };
}
