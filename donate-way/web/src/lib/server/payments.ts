import "server-only";
import { approveDonation, cancelDonation, completeDonation, resolveIncomplete } from "./donations";
import { approveFee, cancelFee, completeFee, resolveIncompleteFee } from "./need";
import { getPayment } from "./pi";

// One set of Pi payment callbacks serves two kinds of payments: donations and the 1 Pi need-request fee.
// The kind is read from the payment as Pi reports it (the client cannot pick a different handler).
async function isFee(paymentId: unknown): Promise<boolean> {
  if (typeof paymentId !== "string" || !paymentId || paymentId.length > 100) return false;
  const payment = await getPayment(paymentId);
  return (payment.metadata as { kind?: string } | undefined)?.kind === "need_fee";
}

export async function approveAny(paymentId: string, uid: string) {
  return (await isFee(paymentId)) ? approveFee(paymentId, uid) : approveDonation(paymentId, uid);
}
export async function completeAny(paymentId: string, txid: string, uid: string) {
  return (await isFee(paymentId)) ? completeFee(paymentId, txid, uid) : completeDonation(paymentId, txid, uid);
}
export async function cancelAny(paymentId: string, uid: string) {
  return (await isFee(paymentId)) ? cancelFee(paymentId, uid) : cancelDonation(paymentId, uid);
}
export async function incompleteAny(paymentId: string, uid: string) {
  return (await isFee(paymentId)) ? resolveIncompleteFee(paymentId, uid) : resolveIncomplete(paymentId, uid);
}
