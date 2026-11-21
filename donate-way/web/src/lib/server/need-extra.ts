import "server-only";
import { db, must } from "./db";
import { campaignAudience } from "./donations";
import { HttpError } from "./http";
import { isTestnet } from "./network";
import { loadOwn, log, needEnabled, notifyAdmins, payoutsOf, syncNeedStatuses, usernames } from "./need";
import { notify } from "./pi";
import { isWalletVerified } from "./verify";

const LIVE = ["fundraising", "payout_due", "stage1_paid", "proof_submitted"];

// The applicant posts a short update on their own fund; it shows on the campaign page and donors are notified.
export async function postUpdate(requestId: string, uid: string, bodyRaw: unknown) {
  const row = await loadOwn(requestId, uid);
  if (!row.campaign_id || !LIVE.includes(row.status)) throw new HttpError(409, "wrong_state");
  const body = typeof bodyRaw === "string" ? bodyRaw.trim() : "";
  if (body.length < 10) throw new HttpError(400, "update_too_short");
  if (body.length > 400) throw new HttpError(400, "update_too_long");
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db().from("dw_updates").select("id", { count: "exact", head: true }).eq("campaign_id", row.campaign_id).eq("kind", "update").gte("created_at", since);
  if ((count ?? 0) >= 1) throw new HttpError(429, "update_limit");
  must(await db().from("dw_updates").insert({ campaign_id: row.campaign_id, kind: "update", title: "تحديث من صاحب الحالة", body }).select("id").single());
  await log(requestId, uid, "update_posted");
  const audience = (await campaignAudience(row.campaign_id)).filter((u) => u !== uid);
  await notify(audience.map((user_uid) => ({ user_uid, title: "تحديث على حالة دعمتها", body: body.slice(0, 120), subroute: `/campaigns/${row.campaign_id}` })));
  return { ok: true };
}

// A verified Pioneer vouches for a case (one vouch each). Shown as a badge; the admin sees who vouched.
export async function vouch(campaignId: string, uid: string, on: boolean) {
  if (!needEnabled()) throw new HttpError(404, "need_disabled");
  const { data: req } = await db().from("dw_need_requests").select("id,applicant_uid,status").eq("campaign_id", campaignId).maybeSingle();
  if (!req) throw new HttpError(404, "request_not_found");
  if (req.applicant_uid === uid) throw new HttpError(403, "cannot_vouch_self");
  if (!LIVE.includes(req.status)) throw new HttpError(409, "wrong_state");
  if (on) {
    if (!isTestnet() && !(await isWalletVerified(uid))) throw new HttpError(403, "not_verified");
    const { error } = await db().from("dw_need_vouches").insert({ request_id: req.id, voucher_uid: uid });
    if (error && error.code !== "23505") throw new Error(error.message);
    await log(req.id, uid, "vouched");
  } else {
    await db().from("dw_need_vouches").delete().eq("request_id", req.id).eq("voucher_uid", uid);
  }
  const { count } = await db().from("dw_need_vouches").select("request_id", { count: "exact", head: true }).eq("request_id", req.id);
  return { ok: true, count: count ?? 0 };
}

// Public outcomes: every fund with what was collected and what was paid out (no documents, ever).
export async function needResults() {
  if (!needEnabled()) return { funds: [], totals: { funds: 0, raised: 0, paidOut: 0 } };
  await syncNeedStatuses();
  const { data } = await db()
    .from("dw_need_requests")
    .select("id,applicant_uid,case_type,status,campaign_id,approved_at,ends_at,amount")
    .in("status", LIVE.concat("closed"))
    .not("campaign_id", "is", null)
    .order("approved_at", { ascending: false })
    .limit(80);
  const rows = (data ?? []) as { id: string; applicant_uid: string; case_type: string; status: string; campaign_id: string; approved_at: string; ends_at: string; amount: number }[];
  const names = await usernames(rows.map((r) => r.applicant_uid));
  const ids = rows.map((r) => r.campaign_id);
  const { data: stats } = ids.length ? await db().from("dw_campaign_stats_v2").select("campaign_id,raised,donors").in("campaign_id", ids) : { data: [] };
  const sm = new Map((stats ?? []).map((s) => [s.campaign_id as string, { raised: Number(s.raised), donors: Number(s.donors) }]));
  const funds = [];
  for (const r of rows) {
    const payouts = (await payoutsOf(r.id)).filter((p) => p.status === "completed");
    funds.push({
      campaignId: r.campaign_id,
      applicant: names.get(r.applicant_uid) ?? "",
      caseType: r.case_type,
      status: r.status,
      goal: Number(r.amount),
      raised: sm.get(r.campaign_id)?.raised ?? 0,
      donors: sm.get(r.campaign_id)?.donors ?? 0,
      endsAt: r.ends_at,
      payouts: payouts.map((p) => ({ stage: p.stage, amount: p.amount, txid: p.txid })),
    });
  }
  return {
    funds,
    totals: {
      funds: funds.length,
      raised: funds.reduce((s, f) => s + f.raised, 0),
      paidOut: funds.reduce((s, f) => s + f.payouts.reduce((a, p) => a + p.amount, 0), 0),
    },
  };
}

// Daily cron: remind applicants about their proof deadline and admins about requests waiting too long.
export async function needReminders() {
  const DAY = 86_400_000;
  const done = async (id: string, action: string) => {
    const { count } = await db().from("dw_need_actions").select("id", { count: "exact", head: true }).eq("request_id", id).eq("action", action);
    return (count ?? 0) > 0;
  };
  const { data: stage1 } = await db().from("dw_need_requests").select("id,applicant_uid,proof_due_at").eq("status", "stage1_paid").not("proof_due_at", "is", null);
  for (const r of stage1 ?? []) {
    const left = Math.ceil((new Date(r.proof_due_at as string).getTime() - Date.now()) / DAY);
    for (const t of [7, 2, 0]) {
      if (left > t) continue;
      const action = `reminder_proof_${t}`;
      if (await done(r.id, action)) continue;
      await log(r.id, "system", action);
      if (t === 0) await notifyAdmins("إثبات سداد متأخر", "في حالة عدّت مهلة إثبات السداد بتاعتها.");
      await notify([{ user_uid: r.applicant_uid, title: t === 0 ? "انتهت مهلة إثبات السداد" : "افتكر ترفع إثبات السداد", body: t === 0 ? "ارفع الإثبات حالًا وإلا هتتقفل الحالة." : `فاضل ${Math.max(left, 0)} يوم على مهلة إثبات السداد.`, subroute: "/need/mine" }]);
    }
  }
  const { data: more } = await db().from("dw_need_requests").select("id,applicant_uid,updated_at").eq("status", "needs_more_proof");
  for (const r of more ?? []) {
    if (Date.now() - new Date(r.updated_at as string).getTime() < 3 * DAY || (await done(r.id, "reminder_more_proof"))) continue;
    await log(r.id, "system", "reminder_more_proof");
    await notify([{ user_uid: r.applicant_uid, title: "مستنداتك لسه ناقصة", body: "ارفع المستندات اللي طلبناها علشان نكمّل مراجعة طلبك.", subroute: "/need/mine" }]);
  }
  const { data: waiting } = await db().from("dw_need_requests").select("id,submitted_at").eq("status", "pending_review");
  for (const r of waiting ?? []) {
    if (!r.submitted_at || Date.now() - new Date(r.submitted_at).getTime() < 2 * DAY || (await done(r.id, "reminder_review"))) continue;
    await log(r.id, "system", "reminder_review");
    await notifyAdmins("طلب مستني مراجعة", "في طلب مستني مراجعتك من أكتر من يومين.");
  }
}
