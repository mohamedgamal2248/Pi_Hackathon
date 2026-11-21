import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "./env";
import { sendToUser } from "./a2u";
import { db, must } from "./db";
import { HttpError } from "./http";
import { sniffImage } from "./image";
import { isTestnet } from "./network";
import { approvePayment, cancelPayment, completePayment, getPayment, notify, type PiPayment } from "./pi";
import { isWalletVerified as isWalletVerifiedUid, verifyWallet, walletGate } from "./verify";
import { WALLET_RE } from "./wallet";

// Verified-need funds. State machine (compare-and-set on every change, so a request can only move forward):
//   draft -> fee_pending -> pending_review -> needs_more_proof <-> pending_review
//   pending_review -> rejected | fundraising -> payout_due -> stage1_paid -> proof_submitted -> closed
//   draft / pending_review / needs_more_proof -> withdrawn
// Money: 1 Pi application fee (non-refundable). Donations go to the app wallet. When the fundraising window ends,
// everything collected is paid to the applicant: 70% at once, 30% after the applicant proves the payment. No refunds.

export const NEED_FEE = 1;
export const CASE_TYPES = ["treatment", "hospital_bill", "study_fees"] as const;
export type CaseType = (typeof CASE_TYPES)[number];
export const WINDOWS = [1, 7, 30] as const;
export const STAGE1_SHARE = 0.7;
export const MAX_DOCS = 8;
export const PROOF_DAYS = 14; // days the applicant has to prove the settlement after the first payout
export const REQUIRED_CHECKS = ["identity", "amount", "date", "stamp"] as const;
const LARGE_PAYOUT = () => Number(process.env.NEED_LARGE_PAYOUT) || 500; // payouts at or above this need the admin to type the applicant's name
const MAX_BYTES = 4 * 1024 * 1024;
const BUCKET = "sanad-private";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-type ceiling in Pi (placeholders; override with NEED_MAX_TREATMENT, NEED_MAX_HOSPITAL_BILL, NEED_MAX_STUDY_FEES).
const DEFAULT_MAX: Record<CaseType, number> = { treatment: 3000, hospital_bill: 3000, study_fees: 1500 };
export const maxAmount = (t: CaseType) => Number(process.env[`NEED_MAX_${t.toUpperCase()}`]) || DEFAULT_MAX[t];

const TITLES: Record<CaseType, { ar: string; en: string; category: "health" | "education" }> = {
  treatment: { ar: "مساعدة في تكاليف علاج", en: "Help with treatment costs", category: "health" },
  hospital_bill: { ar: "مساعدة في سداد فاتورة مستشفى", en: "Help paying a hospital bill", category: "health" },
  study_fees: { ar: "مساعدة في مصاريف دراسة", en: "Help with study fees", category: "education" },
};

export type NeedStatus =
  | "draft" | "fee_pending" | "pending_review" | "needs_more_proof" | "rejected" | "fundraising"
  | "payout_due" | "stage1_paid" | "proof_submitted" | "closed" | "withdrawn";

type NeedRow = {
  id: string;
  applicant_uid: string;
  case_type: CaseType;
  amount: number;
  window_days: number;
  description: string;
  status: NeedStatus;
  terms_accepted_at: string | null;
  fee_payment_id: string | null;
  fee_txid: string | null;
  fee_paid_at: string | null;
  admin_note: string | null;
  campaign_id: string | null;
  raised_final: number | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  ends_at: string | null;
  proof_due_at: string | null;
};

// Verified-need funds are always on in the Testnet staging app. On Mainnet they stay off until
// NEED_FUNDS_MAINNET=1 is set (and the payout wallet seed is configured).
export const needEnabled = () => isTestnet() || process.env.NEED_FUNDS_MAINNET === "1";
function assertNeedEnabled() {
  if (!needEnabled()) throw new HttpError(404, "need_disabled");
}

const now = () => new Date().toISOString();
const round7 = (n: number) => Math.round(n * 1e7) / 1e7;

export async function log(requestId: string, actor: string, action: string, note?: string | null) {
  await db().from("dw_need_actions").insert({ request_id: requestId, actor_uid: actor, action, note: note ?? null });
}

// Everyone who can review: the configured admin accounts plus users flagged is_admin.
export async function adminUids(): Promise<string[]> {
  const configured = isTestnet() ? (process.env.ADMIN_PI_UIDS_TESTNET ?? "").split(",").map((x) => x.trim()).filter(Boolean) : env.adminUids();
  const ids = new Set(configured);
  const { data } = await db().from("dw_users").select("pi_uid").eq("is_admin", true);
  for (const u of data ?? []) ids.add(u.pi_uid as string);
  return [...ids];
}
export async function notifyAdmins(title: string, body: string) {
  const uids = await adminUids();
  if (uids.length) await notify(uids.map((user_uid) => ({ user_uid, title, body, subroute: "/admin" })));
}

// Perceptual hash (difference hash, 64 bits): the same paper photographed again lands within a few bits.
async function dhash(bytes: Uint8Array): Promise<string | null> {
  try {
    const { data } = await sharp(bytes).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
    let hex = "";
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch {
    return null;
  }
}
function hamming(a: string, b: string): number {
  // 4 bits per hex digit; count differing bits without BigInt literals (older TS target).
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

export async function usernames(uids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const ids = [...new Set(uids.filter((u): u is string => !!u))];
  if (!ids.length) return new Map();
  const { data } = await db().from("dw_users").select("pi_uid,username").in("pi_uid", ids);
  return new Map((data ?? []).map((u) => [u.pi_uid as string, u.username as string]));
}

async function load(id: string): Promise<NeedRow> {
  assertNeedEnabled();
  if (!UUID.test(id)) throw new HttpError(400, "id_invalid");
  const row = must(await db().from("dw_need_requests").select("*").eq("id", id).maybeSingle()) as NeedRow | null;
  if (!row) throw new HttpError(404, "request_not_found");
  return { ...row, amount: Number(row.amount), raised_final: row.raised_final == null ? null : Number(row.raised_final) };
}

export async function loadOwn(id: string, uid: string): Promise<NeedRow> {
  const row = await load(id);
  if (row.applicant_uid !== uid) throw new HttpError(403, "not_your_request");
  return row;
}

// Moves a request from one of `from` to `to`; fails when somebody else moved it first.
async function move(id: string, from: NeedStatus[], to: NeedStatus, patch: Record<string, unknown> = {}): Promise<NeedRow> {
  const { data, error } = await db()
    .from("dw_need_requests")
    .update({ ...patch, status: to, updated_at: now() })
    .eq("id", id)
    .in("status", from)
    .select("*");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new HttpError(409, "wrong_state");
  return data[0] as NeedRow;
}

// ------------------------------------------------------------------ applicant

export type DraftInput = { caseType?: unknown; amount?: unknown; windowDays?: unknown; description?: unknown };

function parseInput(body: DraftInput, partial: boolean) {
  const out: { case_type?: CaseType; amount?: number; window_days?: number; description?: string } = {};
  if (!partial || body.caseType !== undefined) {
    if (!CASE_TYPES.includes(body.caseType as CaseType)) throw new HttpError(400, "case_type_invalid");
    out.case_type = body.caseType as CaseType;
  }
  if (!partial || body.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isFinite(a) || a <= 0) throw new HttpError(400, "amount_invalid");
    out.amount = round7(a);
  }
  if (!partial || body.windowDays !== undefined) {
    const w = Number(body.windowDays);
    if (!(WINDOWS as readonly number[]).includes(w)) throw new HttpError(400, "window_invalid");
    out.window_days = w;
  }
  if (!partial || body.description !== undefined) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    if (d.length < 20) throw new HttpError(400, "description_too_short");
    if (d.length > 800) throw new HttpError(400, "description_too_long");
    out.description = d;
  }
  return out;
}

function checkAmount(type: CaseType, amount: number) {
  if (amount > maxAmount(type)) throw new HttpError(400, "amount_above_max");
}

// Blocked accounts/wallets and applicants rejected twice in the last 30 days cannot open a new request.
async function assertAllowedApplicant(uid: string) {
  const { data: u } = await db().from("dw_users").select("wallet_address").eq("pi_uid", uid).maybeSingle();
  const byUid = await db().from("dw_need_blocklist").select("id").eq("kind", "uid").eq("value", uid).limit(1);
  const byWallet = u?.wallet_address ? await db().from("dw_need_blocklist").select("id").eq("kind", "wallet").eq("value", u.wallet_address).limit(1) : { data: [] };
  if (byUid.data?.length || byWallet.data?.length) throw new HttpError(403, "applicant_blocked");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await db().from("dw_need_requests").select("id", { count: "exact", head: true }).eq("applicant_uid", uid).eq("status", "rejected").gte("updated_at", since);
  if ((count ?? 0) >= 2) throw new HttpError(403, "too_many_rejections");
}

export async function createDraft(uid: string, body: DraftInput) {
  assertNeedEnabled();
  await assertAllowedApplicant(uid);
  if ((await walletGate(uid)) !== "ok") throw new HttpError(403, "wallet_not_verified");
  const input = parseInput(body, false);
  checkAmount(input.case_type!, input.amount!);
  const { data, error } = await db().from("dw_need_requests").insert({ applicant_uid: uid, ...input }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "active_request_exists");
    throw new Error(error.message);
  }
  await log(data.id, uid, "draft_created");
  return { id: data.id as string };
}

export async function updateDraft(id: string, uid: string, body: DraftInput) {
  const row = await loadOwn(id, uid);
  if (row.status !== "draft") throw new HttpError(409, "wrong_state");
  const input = parseInput(body, true);
  checkAmount(input.case_type ?? row.case_type, input.amount ?? row.amount);
  // Changing the terms-relevant fields means the applicant must tick the terms again.
  await move(id, ["draft"], "draft", { ...input, terms_accepted_at: null });
  return { ok: true };
}

export async function acceptTerms(id: string, uid: string) {
  await loadOwn(id, uid);
  await move(id, ["draft"], "draft", { terms_accepted_at: now() });
  await log(id, uid, "terms_accepted", "1 Pi non-refundable fee");
  return { ok: true };
}

export async function withdraw(id: string, uid: string) {
  await loadOwn(id, uid);
  await move(id, ["draft", "pending_review", "needs_more_proof"], "withdrawn");
  await log(id, uid, "withdrawn", "Fee is non-refundable");
  return { ok: true };
}

// ------------------------------------------------------------------ documents (private bucket)

const KIND_BY_STATUS: Partial<Record<NeedStatus, "proof" | "extra" | "settlement">> = {
  draft: "proof",
  needs_more_proof: "extra",
  stage1_paid: "settlement",
};

export async function addDocument(id: string, uid: string, bytes: Uint8Array) {
  const row = await loadOwn(id, uid);
  const kind = KIND_BY_STATUS[row.status];
  if (!kind) throw new HttpError(409, "wrong_state");
  if (bytes.length > MAX_BYTES) throw new HttpError(413, "file_too_large");
  const img = sniffImage(bytes);
  if (!img) throw new HttpError(415, "images_only");

  const { count } = await db().from("dw_need_documents").select("id", { count: "exact", head: true }).eq("request_id", id);
  if ((count ?? 0) >= MAX_DOCS) throw new HttpError(409, "too_many_documents");

  // The same paper must not be used twice: not on this request, and not on any other request.
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const { data: same } = await db().from("dw_need_documents").select("id,request_id").eq("sha256", sha256).limit(1);
  if (same?.length) {
    const other = same[0].request_id as string;
    await log(id, uid, "duplicate_blocked", other === id ? "same file twice on this request" : `same file as request ${other}`);
    throw new HttpError(409, "document_duplicate");
  }

  // Near-duplicates (the same paper photographed again) are accepted but flagged for the admin.
  const phash = await dhash(bytes);
  if (phash) {
    const { data: others } = await db().from("dw_need_documents").select("request_id,phash").not("phash", "is", null).neq("request_id", id).limit(5000);
    const near = (others ?? []).map((o) => ({ request: o.request_id as string, d: hamming(phash, o.phash as string) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d <= 10) await log(id, uid, "near_duplicate", `looks like a document of request ${near.request} (distance ${near.d})`);
  }

  const path = `${isTestnet() ? "staging/" : ""}need/${id}/${randomUUID()}.${img.ext}`;
  const up = await db().storage.from(BUCKET).upload(path, bytes, { contentType: img.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  must(await db().from("dw_need_documents").insert({ request_id: id, kind, path, sha256, phash, mime: img.type, size: bytes.length, uploaded_by: uid }).select("id").single());
  await log(id, uid, `document_${kind}`);
  return { ok: true, kind };
}

export async function removeDocument(id: string, uid: string, docId: string) {
  const row = await loadOwn(id, uid);
  if (!UUID.test(docId)) throw new HttpError(400, "id_invalid");
  const kind = KIND_BY_STATUS[row.status];
  if (!kind) throw new HttpError(409, "wrong_state");
  const { data: doc } = await db().from("dw_need_documents").select("id,path,kind").eq("id", docId).eq("request_id", id).maybeSingle();
  if (!doc || doc.kind !== kind) throw new HttpError(404, "document_not_found");
  await db().storage.from(BUCKET).remove([doc.path]);
  await db().from("dw_need_documents").delete().eq("id", docId);
  await log(id, uid, "document_removed");
  return { ok: true };
}

type DocView = { id: string; kind: string; url: string; created_at: string };

// Short-lived signed links: only the owner and admins are ever given these.
async function docsWithUrls(requestId: string, kinds?: string[]): Promise<DocView[]> {
  let q = db().from("dw_need_documents").select("id,kind,path,created_at").eq("request_id", requestId).order("created_at");
  if (kinds) q = q.in("kind", kinds);
  const docs = (must(await q) ?? []) as { id: string; kind: string; path: string; created_at: string }[];
  const out: DocView[] = [];
  for (const d of docs) {
    const { data } = await db().storage.from(BUCKET).createSignedUrl(d.path, 300);
    if (data?.signedUrl) out.push({ id: d.id, kind: d.kind, url: data.signedUrl, created_at: d.created_at });
  }
  return out;
}

// ------------------------------------------------------------------ the 1 Pi fee (server-verified)

// Every check runs on the payment as Pi's servers report it. The client callback is never trusted.
async function checkedFee(paymentId: string, uid: string): Promise<{ payment: PiPayment; request: NeedRow }> {
  if (typeof paymentId !== "string" || !paymentId || paymentId.length > 100) throw new HttpError(400, "payment_invalid");
  const payment = await getPayment(paymentId);
  if (payment.user_uid !== uid) throw new HttpError(403, "payment_not_yours");
  if (payment.direction !== "user_to_app") throw new HttpError(400, "payment_direction");
  const meta = (payment.metadata ?? {}) as { kind?: string; requestId?: string };
  if (meta.kind !== "need_fee" || typeof meta.requestId !== "string" || !UUID.test(meta.requestId)) throw new HttpError(400, "not_a_need_fee");
  if (payment.memo !== `need_fee:${meta.requestId}`) throw new HttpError(400, "fee_memo_mismatch");
  if (Math.abs(payment.amount - NEED_FEE) > 1e-9) throw new HttpError(400, "fee_amount_mismatch");
  const request = await loadOwn(meta.requestId, uid);
  // A payment id can belong to one request only.
  const { data: used } = await db().from("dw_need_requests").select("id").eq("fee_payment_id", payment.identifier).neq("id", request.id).limit(1);
  if (used?.length) throw new HttpError(409, "payment_already_used");
  return { payment, request };
}

export async function approveFee(paymentId: string, uid: string) {
  const { payment, request } = await checkedFee(paymentId, uid);
  if (payment.status.cancelled || payment.status.user_cancelled) throw new HttpError(409, "payment_cancelled");
  if (!["draft", "fee_pending"].includes(request.status)) throw new HttpError(409, "wrong_state");
  if (!request.terms_accepted_at) throw new HttpError(409, "terms_not_accepted");
  const { count } = await db().from("dw_need_documents").select("id", { count: "exact", head: true }).eq("request_id", request.id).eq("kind", "proof");
  if (!count) throw new HttpError(409, "proof_required");
  if (request.fee_payment_id && request.fee_payment_id !== payment.identifier) throw new HttpError(409, "fee_in_progress");
  await move(request.id, ["draft", "fee_pending"], "fee_pending", { fee_payment_id: payment.identifier });
  if (!payment.status.developer_approved) await approvePayment(payment.identifier);
  return { ok: true };
}

export async function completeFee(paymentId: string, txid: string, uid: string) {
  if (typeof txid !== "string" || !/^[0-9a-f]{64}$/i.test(txid)) throw new HttpError(400, "txid_invalid");
  const { payment, request } = await checkedFee(paymentId, uid);
  if (request.fee_payment_id !== payment.identifier) throw new HttpError(409, "fee_not_approved");
  if (request.fee_paid_at) return { ok: true, requestId: request.id };
  // Pi verifies the blockchain transaction here; a non-200 answer throws and nothing is recorded as paid.
  if (!payment.status.developer_completed) await completePayment(payment.identifier, txid);
  await move(request.id, ["fee_pending"], "pending_review", { fee_txid: txid, fee_paid_at: now(), submitted_at: now() });
  // The payment came from a wallet that exists on the chain: that verifies the user when sign-in could not.
  if (WALLET_RE.test(payment.from_address ?? "")) {
    await db().from("dw_users").update({ wallet_address: payment.from_address }).eq("pi_uid", uid).is("wallet_address", null);
    await verifyWallet(uid, payment.from_address, "payment");
  }
  await log(request.id, uid, "fee_paid", `txid ${txid}`);
  await notify([{ user_uid: uid, title: "استلمنا طلبك", body: "دفعت رسوم التأكيد وطلبك دخل المراجعة. هنبلغك بالقرار.", subroute: "/need/mine" }]);
  await notifyAdmins("طلب احتياج جديد", "وصل طلب جديد للمراجعة.");
  return { ok: true, requestId: request.id };
}

export async function cancelFee(paymentId: string, uid: string) {
  const payment = await getPayment(paymentId);
  if (payment.user_uid !== uid) throw new HttpError(403, "payment_not_yours");
  // The draft stays; the applicant can retry the payment on the same draft.
  await db().from("dw_need_requests").update({ status: "draft", fee_payment_id: null, updated_at: now() }).eq("fee_payment_id", payment.identifier).eq("status", "fee_pending").eq("applicant_uid", uid);
  return { ok: true };
}

export async function resolveIncompleteFee(paymentId: string, uid: string) {
  const payment = await getPayment(paymentId);
  if (payment.user_uid !== uid) throw new HttpError(403, "payment_not_yours");
  if (payment.status.developer_completed) return { ok: true, state: "already_completed" };
  if (payment.transaction?.txid) {
    await completeFee(payment.identifier, payment.transaction.txid, uid);
    return { ok: true, state: "completed" };
  }
  await cancelPayment(payment.identifier).catch(() => undefined);
  await cancelFee(payment.identifier, uid);
  return { ok: true, state: "cancelled" };
}

// ------------------------------------------------------------------ more proof, my requests

export async function resubmit(id: string, uid: string) {
  const row = await loadOwn(id, uid);
  if (row.status !== "needs_more_proof") throw new HttpError(409, "wrong_state");
  const { data: asked } = await db().from("dw_need_actions").select("created_at").eq("request_id", id).eq("action", "more_proof_requested").order("created_at", { ascending: false }).limit(1);
  const since = asked?.[0]?.created_at ?? row.submitted_at ?? row.created_at;
  const { count } = await db().from("dw_need_documents").select("id", { count: "exact", head: true }).eq("request_id", id).eq("kind", "extra").gte("created_at", since);
  if (!count) throw new HttpError(409, "extra_proof_required");
  await move(id, ["needs_more_proof"], "pending_review"); // the 1 Pi fee is NOT charged again
  await log(id, uid, "resubmitted");
  await notifyAdmins("مستندات إضافية", "صاحب طلب أرسل المستندات اللي طلبتها.");
  return { ok: true };
}

export async function submitSettlementProof(id: string, uid: string) {
  const row = await loadOwn(id, uid);
  if (row.status !== "stage1_paid") throw new HttpError(409, "wrong_state");
  const { count } = await db().from("dw_need_documents").select("id", { count: "exact", head: true }).eq("request_id", id).eq("kind", "settlement");
  if (!count) throw new HttpError(409, "settlement_proof_required");
  await move(id, ["stage1_paid"], "proof_submitted");
  await log(id, uid, "settlement_submitted");
  await notifyAdmins("إثبات سداد", "وصل إثبات سداد للمراجعة.");
  return { ok: true };
}

type Payout = { stage: number; amount: number; txid: string | null; status: string; completed_at: string | null };
export async function payoutsOf(id: string): Promise<Payout[]> {
  const { data } = await db().from("dw_need_payouts").select("stage,amount,txid,status,completed_at").eq("request_id", id).order("stage");
  return (data ?? []).map((p) => ({ ...(p as Payout), amount: Number(p.amount) }));
}

export async function myRequests(uid: string) {
  if (!needEnabled()) return [];
  await syncNeedStatuses();
  const rows = (must(await db().from("dw_need_requests").select("*").eq("applicant_uid", uid).order("created_at", { ascending: false })) ?? []) as NeedRow[];
  const out = [];
  for (const r of rows) {
    const live = ["draft", "needs_more_proof", "stage1_paid", "proof_submitted"].includes(r.status);
    out.push({
      id: r.id,
      caseType: r.case_type,
      amount: Number(r.amount),
      windowDays: r.window_days,
      description: r.description,
      status: r.status,
      termsAccepted: !!r.terms_accepted_at,
      adminNote: r.admin_note,
      campaignId: r.campaign_id,
      endsAt: r.ends_at,
      createdAt: r.created_at,
      raised: r.raised_final,
      docs: live ? await docsWithUrls(r.id) : [],
      payouts: await payoutsOf(r.id),
    });
  }
  return out;
}

// ------------------------------------------------------------------ admin

const words = (t: string) => new Set(t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3));
function similar(a: string, b: string) {
  const x = words(a);
  const y = words(b);
  if (x.size < 5 || y.size < 5) return 0;
  let inter = 0;
  x.forEach((w) => y.has(w) && inter++);
  return inter / (x.size + y.size - inter);
}

// What the admin must see before paying: stage, amounts and exactly who receives them.
async function payoutPreview(r: NeedRow, username: string, wallet: string | null) {
  if (!["payout_due", "proof_submitted"].includes(r.status) || !r.campaign_id) return null;
  const total = await shareTotal(r.campaign_id);
  if (r.status === "payout_due") return { stage: 1, total, amount: round7(total * STAGE1_SHARE), username, wallet, large: round7(total * STAGE1_SHARE) >= LARGE_PAYOUT() };
  const first = (await db().from("dw_need_payouts").select("amount").eq("request_id", r.id).eq("stage", 1).maybeSingle()).data;
  const amount = round7(total - Number(first?.amount ?? 0));
  return { stage: 2, total, amount, username, wallet, large: amount >= LARGE_PAYOUT() };
}

export async function adminQueue() {
  if (!needEnabled()) return [];
  await syncNeedStatuses();
  const rows = (must(
    await db().from("dw_need_requests").select("*").in("status", ["pending_review", "needs_more_proof", "payout_due", "stage1_paid", "proof_submitted"]).order("submitted_at", { ascending: true })
  ) ?? []) as NeedRow[];
  const names = await usernames(rows.map((r) => r.applicant_uid));
  const { data: allReqs } = await db().from("dw_need_requests").select("id,applicant_uid,description,status").order("created_at", { ascending: false }).limit(300);
  const out = [];
  for (const r of rows) {
    const [{ data: user }, { data: acts }, { data: vouchRows }] = await Promise.all([
      db().from("dw_users").select("wallet_address,wallet_verified_at,wallet_verified_via").eq("pi_uid", r.applicant_uid).maybeSingle(),
      db().from("dw_need_actions").select("action,note,actor_uid,created_at").eq("request_id", r.id).order("created_at"),
      db().from("dw_need_vouches").select("voucher_uid").eq("request_id", r.id),
    ]);
    const vouchers = await usernames((vouchRows ?? []).map((v) => v.voucher_uid as string));
    // Warning signals: shared wallet, similar text in other requests, earlier requests of the same person.
    let sharedWallet = 0;
    if (user?.wallet_address) {
      const { count } = await db().from("dw_users").select("pi_uid", { count: "exact", head: true }).eq("wallet_address", user.wallet_address).neq("pi_uid", r.applicant_uid);
      sharedWallet = count ?? 0;
    }
    const others = (allReqs ?? []).filter((o) => o.id !== r.id);
    const similarTexts = others.filter((o) => similar(r.description, o.description as string) >= 0.7).length;
    const mine = others.filter((o) => o.applicant_uid === r.applicant_uid);
    const waitingSince = r.status === "pending_review" ? r.submitted_at : r.updated_at;
    out.push({
      id: r.id,
      applicant: names.get(r.applicant_uid) ?? "?",
      walletVerified: !!user?.wallet_verified_at,
      verifiedVia: user?.wallet_verified_via ?? null,
      caseType: r.case_type,
      amount: Number(r.amount),
      windowDays: r.window_days,
      description: r.description,
      status: r.status,
      feeTxid: r.fee_txid,
      feePaymentId: r.fee_payment_id,
      adminNote: r.admin_note,
      campaignId: r.campaign_id,
      raised: r.raised_final,
      docs: await docsWithUrls(r.id),
      payouts: await payoutsOf(r.id),
      actions: acts ?? [],
      flagged: (acts ?? []).some((a) => a.action === "duplicate_blocked"),
      signals: {
        nearDuplicate: (acts ?? []).filter((a) => a.action === "near_duplicate").map((a) => a.note as string),
        sharedWallet,
        similarTexts,
        earlierRequests: mine.length,
        earlierRejected: mine.filter((o) => o.status === "rejected").length,
      },
      vouches: [...vouchers.values()],
      waitingSince,
      waitingDays: waitingSince ? Math.floor((Date.now() - new Date(waitingSince).getTime()) / 86_400_000) : 0,
      proofDueAt: r.proof_due_at,
      overdue: r.status === "stage1_paid" && !!r.proof_due_at && new Date(r.proof_due_at) < new Date(),
      preview: await payoutPreview(r, names.get(r.applicant_uid) ?? "?", user?.wallet_address ?? null),
      requiredChecks: REQUIRED_CHECKS,
    });
  }
  return out;
}

export async function decide(id: string, adminUid: string, decision: unknown, noteRaw: unknown, extra: { checklist?: unknown; issuerVerified?: unknown; issuerNote?: unknown } = {}) {
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) : "";
  const row = await load(id);

  if (decision === "reject" || decision === "more_proof") {
    if (!note) throw new HttpError(400, "note_required");
    if (decision === "reject") {
      await move(id, ["pending_review"], "rejected", { admin_note: note });
      await log(id, adminUid, "rejected", note);
      await notify([{ user_uid: row.applicant_uid, title: "تم رفض الطلب", body: `السبب: ${note}`.slice(0, 200), subroute: "/need/mine" }]);
    } else {
      await move(id, ["pending_review"], "needs_more_proof", { admin_note: note });
      await log(id, adminUid, "more_proof_requested", note);
      await notify([{ user_uid: row.applicant_uid, title: "مطلوب مستندات إضافية", body: note.slice(0, 200), subroute: "/need/mine" }]);
    }
    return { ok: true };
  }

  if (decision === "approve") {
    // The admin must tick every required check; the ticks are stored in the audit log.
    const list = (extra.checklist ?? {}) as Record<string, unknown>;
    if (!REQUIRED_CHECKS.every((k) => list[k] === true)) throw new HttpError(400, "checklist_incomplete");
    const issuer = extra.issuerVerified === true ? `issuer verified${typeof extra.issuerNote === "string" && extra.issuerNote.trim() ? `: ${extra.issuerNote.trim().slice(0, 200)}` : ""}` : "issuer not verified";
    const moved = await move(id, ["pending_review"], "fundraising", { admin_note: note || null, approved_at: now(), ends_at: new Date(Date.now() + row.window_days * 86_400_000).toISOString() });
    try {
      const { data: u } = await db().from("dw_users").select("username").eq("pi_uid", row.applicant_uid).maybeSingle();
      const who = u?.username ?? "";
      const t = TITLES[row.case_type];
      const story = `${row.description}\n\nالحالة دي اتراجعت مستنداتها الورقية بواسطة فريق سند، وصاحبها رائد حقيقي موثّق. أي مبلغ بيتجمع بيتحوّل له بعد انتهاء مدة الجمع، ومفيش استرجاع للتبرعات.`;
      const campaign = must(
        await db()
          .from("dw_campaigns")
          .insert({
            organizer_uid: row.applicant_uid,
            title: `${t.ar} — ${who}`,
            title_en: `${t.en} — ${who}`,
            summary: row.description.slice(0, 280),
            story,
            story_en: `${row.description}\n\nThe paper proof of this case was reviewed by the Sanad team and the applicant is a real verified Pioneer. Whatever is collected is paid to the applicant when the fundraising window ends. Donations are not refunded.`,
            category: t.category,
            country: "مصر",
            goal: row.amount,
            deadline: moved.ends_at,
            status: "active",
            approved_at: now(),
            kind: "need",
            need_id: id,
          })
          .select("id")
          .single()
      ) as { id: string };
      await db().from("dw_need_requests").update({ campaign_id: campaign.id }).eq("id", id);
      await log(id, adminUid, "approved", `checks ${REQUIRED_CHECKS.join("+")} ok; ${issuer}${note ? `; ${note}` : ""}`);
      await notify([{ user_uid: row.applicant_uid, title: "تمت الموافقة", body: "طلبك اتقبل وصندوق التبرع اتفتح.", subroute: `/campaigns/${campaign.id}` }]);
      return { ok: true, campaignId: campaign.id };
    } catch (err) {
      await db().from("dw_need_requests").update({ status: "pending_review", ends_at: null, approved_at: null }).eq("id", id).eq("status", "fundraising").is("campaign_id", null);
      throw err;
    }
  }
  throw new HttpError(400, "decision_invalid");
}

// ------------------------------------------------------------------ fundraising end and payouts

async function shareTotal(campaignId: string): Promise<number> {
  const { data } = await db()
    .from("dw_donation_items")
    .select("campaign_share,dw_donations!inner(status)")
    .eq("campaign_id", campaignId)
    .eq("dw_donations.status", "completed");
  return round7(((data ?? []) as unknown as { campaign_share: number }[]).reduce((s, r) => s + Number(r.campaign_share), 0));
}

// Fundraising ends when the window passes or the goal is reached. Safe to call often.
export async function syncNeedStatuses() {
  const { data } = await db().from("dw_need_requests").select("id,campaign_id,ends_at,applicant_uid").eq("status", "fundraising");
  for (const r of (data ?? []) as { id: string; campaign_id: string | null; ends_at: string | null; applicant_uid: string }[]) {
    if (!r.campaign_id) continue;
    const { data: c } = await db().from("dw_campaigns").select("status").eq("id", r.campaign_id).maybeSingle();
    const over = (r.ends_at && new Date(r.ends_at) <= new Date()) || (c && c.status !== "active");
    if (!over) continue;
    await db().from("dw_campaigns").update({ status: "completed" }).eq("id", r.campaign_id).in("status", ["active", "funded"]);
    const raised = await shareTotal(r.campaign_id);
    try {
      if (raised > 0) {
        await move(r.id, ["fundraising"], "payout_due", { raised_final: raised });
        await log(r.id, "system", "fundraising_ended", `raised ${raised}`);
        await notify([{ user_uid: r.applicant_uid, title: "انتهت مدة الجمع", body: `اتجمع ${raised} π. هيتحوّل لك ٧٠٪ قريب والباقي بعد إثبات السداد.`, subroute: "/need/mine" }]);
      } else {
        await move(r.id, ["fundraising"], "closed", { raised_final: 0, admin_note: "انتهت المدة بدون تبرعات" });
        await log(r.id, "system", "closed_no_funds");
      }
    } catch (err) {
      if (!(err instanceof HttpError)) throw err; // someone else moved it first
    }
  }
}

// Pays a stage to the applicant (A2U). Resumable: each Pi id is stored as soon as it exists.
export async function payout(id: string, stage: 1 | 2, adminUid: string, confirmName?: unknown) {
  const row = await load(id);
  if (stage === 1 && row.status !== "payout_due") throw new HttpError(409, "wrong_state");
  if (stage === 2 && row.status !== "proof_submitted") throw new HttpError(409, "wrong_state");
  if (!row.campaign_id) throw new HttpError(409, "no_campaign");

  let rec = (await db().from("dw_need_payouts").select("*").eq("request_id", id).eq("stage", stage).maybeSingle()).data as
    | { id: string; amount: number; status: string; a2u_payment_id: string | null; txid: string | null }
    | null;
  if (!rec) {
    const total = await shareTotal(row.campaign_id);
    let amount: number;
    if (stage === 1) {
      amount = round7(total * STAGE1_SHARE);
      await db().from("dw_need_requests").update({ raised_final: total }).eq("id", id);
    } else {
      const first = (await db().from("dw_need_payouts").select("amount,status").eq("request_id", id).eq("stage", 1).maybeSingle()).data;
      if (!first || first.status !== "completed") throw new HttpError(409, "stage1_not_paid");
      amount = round7(total - Number(first.amount)); // includes anything that landed after stage 1
    }
    if (amount <= 0) throw new HttpError(409, "nothing_to_pay");
    const ins = await db().from("dw_need_payouts").insert({ request_id: id, stage, amount, admin_uid: adminUid }).select("*").single();
    if (ins.error) throw new HttpError(409, "payout_in_progress");
    rec = ins.data;
  }
  if (rec!.status === "completed") throw new HttpError(409, "already_paid");
  // Large payouts: the admin must type the applicant's username as a second confirmation.
  if (Number(rec!.amount) >= LARGE_PAYOUT()) {
    const who = (await usernames([row.applicant_uid])).get(row.applicant_uid) ?? "";
    if (typeof confirmName !== "string" || confirmName.trim().toLowerCase() !== who.toLowerCase()) throw new HttpError(409, "confirm_name_required");
  }

  const result = await sendToUser(
    { uid: row.applicant_uid, amount: Number(rec!.amount), memo: `Sanad need fund ${id.slice(0, 8)} stage ${stage}`, metadata: { kind: "need_payout", requestId: id, stage } },
    { paymentId: rec!.a2u_payment_id, txid: rec!.txid },
    async (s) => {
      await db().from("dw_need_payouts").update({ ...(s.paymentId ? { a2u_payment_id: s.paymentId } : {}), ...(s.txid ? { txid: s.txid } : {}), status: "submitted" }).eq("id", rec!.id);
    }
  );
  await db().from("dw_need_payouts").update({ status: "completed", completed_at: now(), a2u_payment_id: result.paymentId, txid: result.txid }).eq("id", rec!.id);
  await log(id, adminUid, `payout_stage_${stage}`, `${rec!.amount} π, txid ${result.txid}`);
  if (stage === 1) {
    await move(id, ["payout_due"], "stage1_paid", { proof_due_at: new Date(Date.now() + PROOF_DAYS * 86_400_000).toISOString() });
    await notify([{ user_uid: row.applicant_uid, title: "وصلتك المرحلة الأولى", body: `اتحوّل لك ${rec!.amount} π. ارفع إثبات السداد علشان ياخد الباقي.`, subroute: "/need/mine" }]);
  } else {
    await move(id, ["proof_submitted"], "closed");
    await notify([{ user_uid: row.applicant_uid, title: "اكتملت الحالة", body: `اتحوّل لك ${rec!.amount} π (المرحلة التانية). شكرًا.`, subroute: "/need/mine" }]);
  }
  return { ok: true, txid: result.txid, amount: Number(rec!.amount) };
}

export async function reviewSettlement(id: string, adminUid: string, approve: boolean, noteRaw: unknown, confirmName?: unknown) {
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) : "";
  const row = await load(id);
  if (row.status !== "proof_submitted") throw new HttpError(409, "wrong_state");
  if (!approve) {
    if (!note) throw new HttpError(400, "note_required");
    await move(id, ["proof_submitted"], "stage1_paid", { admin_note: note });
    await log(id, adminUid, "settlement_rejected", note);
    await notify([{ user_uid: row.applicant_uid, title: "الإثبات محتاج تعديل", body: note.slice(0, 200), subroute: "/need/mine" }]);
    return { ok: true };
  }
  await log(id, adminUid, "settlement_approved", note || null);
  return payout(id, 2, adminUid, confirmName);
}

// The applicant did not prove the settlement within PROOF_DAYS: the remaining share stays with Sanad's general fund
// (the terms say so) and the case is closed.
export async function closeOverdue(id: string, adminUid: string, noteRaw: unknown) {
  const row = await load(id);
  if (row.status !== "stage1_paid" || !row.proof_due_at || new Date(row.proof_due_at) > new Date()) throw new HttpError(409, "not_overdue");
  const total = row.campaign_id ? await shareTotal(row.campaign_id) : 0;
  const first = (await db().from("dw_need_payouts").select("amount").eq("request_id", id).eq("stage", 1).maybeSingle()).data;
  const kept = round7(total - Number(first?.amount ?? 0));
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 300) : "";
  await move(id, ["stage1_paid"], "closed", { admin_note: `لم يُرفع إثبات السداد في المهلة. ${kept} π بقيت في الصندوق العام.${note ? ` ${note}` : ""}` });
  await log(id, adminUid, "proof_overdue_closed", `kept ${kept} π in the general fund${note ? `; ${note}` : ""}`);
  await notify([{ user_uid: row.applicant_uid, title: "اتقفلت الحالة", body: "انتهت مهلة إثبات السداد، فاتقفلت الحالة.", subroute: "/need/mine" }]);
  return { ok: true, kept };
}

// Blocks the applicant's account and wallet from opening new requests.
export async function blockApplicant(id: string, adminUid: string, reasonRaw: unknown) {
  const row = await load(id);
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim().slice(0, 300) : "";
  if (!reason) throw new HttpError(400, "note_required");
  const { data: u } = await db().from("dw_users").select("wallet_address").eq("pi_uid", row.applicant_uid).maybeSingle();
  await db().from("dw_need_blocklist").upsert({ kind: "uid", value: row.applicant_uid, reason, created_by: adminUid }, { onConflict: "kind,value" });
  if (u?.wallet_address) await db().from("dw_need_blocklist").upsert({ kind: "wallet", value: u.wallet_address, reason, created_by: adminUid }, { onConflict: "kind,value" });
  await log(id, adminUid, "applicant_blocked", reason);
  return { ok: true };
}

// ------------------------------------------------------------------ data deletion

// "Delete my data": refused while a request still holds money or is under review; otherwise the private
// documents are erased from storage and the request text is blanked. Payment records stay (they are on-chain).
export async function eraseApplicantData(uid: string) {
  await db().from("dw_need_vouches").delete().eq("voucher_uid", uid);
  const open = ["fee_pending", "pending_review", "needs_more_proof", "fundraising", "payout_due", "stage1_paid", "proof_submitted"];
  const { data: reqs } = await db().from("dw_need_requests").select("id,status").eq("applicant_uid", uid);
  if ((reqs ?? []).some((r) => open.includes(r.status))) throw new HttpError(409, "active_need_request");
  for (const r of reqs ?? []) {
    const { data: docs } = await db().from("dw_need_documents").select("path").eq("request_id", r.id);
    if (docs?.length) await db().storage.from(BUCKET).remove(docs.map((d) => d.path));
    await db().from("dw_need_documents").delete().eq("request_id", r.id);
    await db().from("dw_need_requests").update({ description: "[deleted]", admin_note: null }).eq("id", r.id);
  }
}

// ------------------------------------------------------------------ public fund page

// What the public fund page adds for a need campaign. Documents of the request never appear here;
// the settlement proof is shown only to the fund's donors, the applicant and admins.
export async function needFundInfo(campaignId: string, viewerUid: string | undefined, viewerIsAdmin: boolean) {
  const { data: r } = await db().from("dw_need_requests").select("*").eq("campaign_id", campaignId).maybeSingle();
  if (!r) return null;
  const row = r as NeedRow;
  const names = await usernames([row.applicant_uid]);
  const isOwner = viewerUid === row.applicant_uid;
  let donor = false;
  if (viewerUid && !isOwner && !viewerIsAdmin) {
    const { data } = await db()
      .from("dw_donation_items")
      .select("id,dw_donations!inner(pi_uid,status)")
      .eq("campaign_id", campaignId)
      .eq("dw_donations.pi_uid", viewerUid)
      .eq("dw_donations.status", "completed")
      .limit(1);
    donor = !!data?.length;
  }
  const canSeeProof = isOwner || viewerIsAdmin || donor;
  const { data: vrows } = await db().from("dw_need_vouches").select("voucher_uid").eq("request_id", row.id).order("created_at");
  const vnames = await usernames((vrows ?? []).map((v) => v.voucher_uid as string));
  let canVouch = false;
  if (viewerUid && !isOwner && ["fundraising", "payout_due", "stage1_paid", "proof_submitted"].includes(row.status)) {
    canVouch = isTestnet() || (await isWalletVerifiedUid(viewerUid));
  }
  return {
    status: row.status,
    caseType: row.case_type,
    vouches: { count: vrows?.length ?? 0, names: (vrows ?? []).slice(0, 5).map((v) => vnames.get(v.voucher_uid as string) ?? "?"), mine: !!viewerUid && (vrows ?? []).some((v) => v.voucher_uid === viewerUid), canVouch },
    applicant: names.get(row.applicant_uid) ?? "",
    endsAt: row.ends_at,
    isOwner,
    payouts: (await payoutsOf(row.id)).filter((p) => p.status === "completed"),
    stage1Pct: Math.round(STAGE1_SHARE * 100),
    proofVisible: canSeeProof,
    proofReady: ["proof_submitted", "closed"].includes(row.status),
    proof: canSeeProof && ["proof_submitted", "closed"].includes(row.status) ? await docsWithUrls(row.id, ["settlement"]) : [],
  };
}

