"use client";

import { useCallback, useEffect, useState } from "react";
import { DocViewer } from "@/components/DocViewer";
import { Icon } from "@/components/Icon";
import { Portal } from "@/components/Portal";
import { useLang } from "@/lib/client/i18n";
import { nt, needError, type NeedKey } from "@/lib/client/need-i18n";
import type { NeedDoc, NeedPayout } from "@/lib/client/need-types";
import { ApiError, usePi } from "@/lib/client/pi";
import { explorerTx, pi as piFmt } from "@/lib/client/types";

type Preview = { stage: number; total: number; amount: number; username: string; wallet: string | null; large: boolean };
type AdminReq = {
  id: string;
  applicant: string;
  walletVerified: boolean;
  verifiedVia: string | null;
  caseType: string;
  amount: number;
  windowDays: number;
  description: string;
  status: string;
  feeTxid: string | null;
  adminNote: string | null;
  campaignId: string | null;
  raised: number | null;
  docs: NeedDoc[];
  payouts: NeedPayout[];
  actions: { action: string; note: string | null; actor_uid: string; created_at: string }[];
  flagged: boolean;
  signals: { nearDuplicate: string[]; sharedWallet: number; similarTexts: number; earlierRequests: number; earlierRejected: number };
  vouches: string[];
  waitingDays: number;
  proofDueAt: string | null;
  overdue: boolean;
  preview: Preview | null;
  requiredChecks: string[];
};

const CANNED = ["unclear", "other_name", "amount", "expired", "no_stamp", "suspect"] as const;
const CHECK_LABEL: Record<string, NeedKey> = { identity: "chk_identity", amount: "chk_amount", date: "chk_date", stamp: "chk_stamp" };

// Second confirmation before real Pi leaves the app wallet: who, how much, which stage.
function PayoutDialog({ r, onClose, onConfirm, busy }: { r: AdminReq; onClose: () => void; onConfirm: (confirmName: string) => void; busy: boolean }) {
  const { lang } = useLang();
  const p = r.preview!;
  const [name, setName] = useState("");
  const ok = !p.large || name.trim().toLowerCase() === p.username.toLowerCase();
  return (
    <Portal>
      <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={nt(lang, "a_pay_title")}>
        <div className="card w-full max-w-md space-y-3 rounded-b-none p-5 sm:rounded-b-3xl">
          <h2 className="text-lg font-bold">{nt(lang, "a_pay_title")}</h2>
          <dl className="space-y-1.5 text-sm">
            {[
              [nt(lang, "a_pay_stage", { n: p.stage }), ""],
              [nt(lang, "a_pay_total"), piFmt(p.total)],
              [nt(lang, "a_pay_amount"), piFmt(p.amount)],
              [nt(lang, "a_pay_to"), `@${p.username}`],
              [nt(lang, "a_pay_wallet"), p.wallet ? `${p.wallet.slice(0, 6)}…${p.wallet.slice(-6)}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="num font-bold" dir="ltr">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          {p.large && (
            <label className="block space-y-1 text-sm">
              <span className="text-gold">{nt(lang, "a_pay_type_name", { name: p.username })}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" dir="ltr" />
            </label>
          )}
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {nt(lang, "a_cancel")}
            </button>
            <button className="btn btn-gold flex-1" disabled={!ok || busy} onClick={() => onConfirm(name)}>
              {nt(lang, "a_pay_go")}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Card({ r, reload }: { r: AdminReq; reload: () => void }) {
  const { lang, t } = useLang();
  const { api } = usePi();
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [issuer, setIssuer] = useState(false);
  const [issuerNote, setIssuerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pay, setPay] = useState(false);

  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/need/${r.id}`, { method: "POST", body: JSON.stringify({ action, note, ...extra }) });
      setNote("");
      setPay(false);
      setMsg(nt(lang, "a_done"));
      reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  const allChecked = r.requiredChecks.every((k) => checks[k]);
  const sg = r.signals;
  const warnings = [
    r.flagged && nt(lang, "a_flag"),
    sg.nearDuplicate.length > 0 && nt(lang, "sig_near"),
    sg.sharedWallet > 0 && nt(lang, "sig_shared_wallet", { n: sg.sharedWallet }),
    sg.similarTexts > 0 && nt(lang, "sig_similar", { n: sg.similarTexts }),
    sg.earlierRequests > 0 && nt(lang, "sig_earlier", { n: sg.earlierRequests, r: sg.earlierRejected }),
  ].filter(Boolean) as string[];
  const dateFmt = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });

  return (
    <article className="card space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b>{nt(lang, `type_${r.caseType}` as NeedKey)}</b> · <span className="num">{piFmt(r.amount)}</span> · {nt(lang, `w_${r.windowDays}` as NeedKey)}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {["pending_review", "needs_more_proof"].includes(r.status) && (
            <span className={`rounded-full px-2.5 py-1 ${r.waitingDays >= 2 ? "bg-danger/15 text-danger" : "bg-surface-2"}`}>{nt(lang, "a_waiting", { n: r.waitingDays })}</span>
          )}
          <span className="rounded-full bg-surface-2 px-2.5 py-1">{nt(lang, `st_${r.status}` as NeedKey)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span>
          {nt(lang, "a_applicant")}: <b>{r.applicant}</b>
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${r.walletVerified ? "bg-brand-soft text-brand" : "bg-gold-soft text-gold"}`}>
          <Icon name="shield" size={14} /> {r.walletVerified ? `${nt(lang, "a_wallet_ok")} (${r.verifiedVia === "payment" ? nt(lang, "a_via_payment") : nt(lang, "a_via_blockchain")})` : nt(lang, "a_wallet_no")}
        </span>
        {r.feeTxid && (
          <a href={explorerTx(r.feeTxid)} target="_blank" rel="noopener noreferrer" className="text-brand underline">
            {nt(lang, "a_fee_tx")}
          </a>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1 rounded-xl bg-danger/10 p-2.5 text-xs text-danger" role="alert">
          <b>{nt(lang, "a_signals")}</b>
          <ul className="list-disc ps-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {r.vouches.length > 0 && <p className="rounded-xl bg-brand-soft p-2.5 text-xs text-brand">{nt(lang, "a_vouches", { names: r.vouches.map((v) => `@${v}`).join("، ") })}</p>}

      <p className="whitespace-pre-line text-muted">{r.description}</p>

      {r.docs.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold">{nt(lang, "a_docs")}</h3>
          <DocViewer docs={r.docs.map((d) => ({ id: d.id, url: d.url, label: d.kind }))} />
        </div>
      )}

      {r.payouts.map((p) => (
        <div key={p.stage} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
          <span>
            {nt(lang, "stage", { n: p.stage })} · <b className="num">{piFmt(p.amount)}</b> · {p.status}
          </span>
          {p.txid && (
            <a href={explorerTx(p.txid)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline">
              {nt(lang, "tx")}
            </a>
          )}
        </div>
      ))}
      {r.raised != null && <p>{nt(lang, "raised_total", { amount: piFmt(r.raised) })}</p>}

      {r.status === "stage1_paid" && r.proofDueAt && (
        <p className={`rounded-xl p-2.5 text-xs ${r.overdue ? "bg-danger/10 text-danger" : "bg-surface-2"}`}>
          {r.overdue && <b>{nt(lang, "a_overdue")} · </b>}
          {nt(lang, "a_due", { date: dateFmt(r.proofDueAt) })}
        </p>
      )}

      {r.status === "pending_review" && (
        <fieldset className="space-y-2 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-bold">{nt(lang, "a_checks_title")}</legend>
          {r.requiredChecks.map((k) => (
            <label key={k} className="flex min-h-9 items-start gap-2.5">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" checked={!!checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} />
              <span>{nt(lang, CHECK_LABEL[k])}</span>
            </label>
          ))}
          <label className="flex min-h-9 items-start gap-2.5 text-muted">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]" checked={issuer} onChange={(e) => setIssuer(e.target.checked)} />
            <span>{nt(lang, "chk_issuer")}</span>
          </label>
          {issuer && <input className="input" maxLength={200} placeholder={nt(lang, "a_issuer_note")} value={issuerNote} onChange={(e) => setIssuerNote(e.target.value)} />}
        </fieldset>
      )}

      {["pending_review", "proof_submitted"].includes(r.status) && (
        <div className="space-y-1.5">
          <label className="block space-y-1">
            <span className="text-xs text-muted">{nt(lang, "a_note")}</span>
            <textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-1.5" aria-label={nt(lang, "a_canned")}>
            {CANNED.map((k) => (
              <button key={k} type="button" className="chip !min-h-8 text-xs" onClick={() => setNote(nt(lang, `canned_${k}` as NeedKey))}>
                {nt(lang, `canned_${k}` as NeedKey).split(".")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {r.status === "pending_review" && (
          <>
            <button className="btn btn-primary" disabled={busy || !allChecked} onClick={() => act("approve", { checklist: checks, issuerVerified: issuer, issuerNote })}>
              {nt(lang, "a_approve")}
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => act("more_proof")}>
              {nt(lang, "a_more")}
            </button>
            <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => act("reject")}>
              {nt(lang, "a_reject")}
            </button>
          </>
        )}
        {(r.status === "payout_due" || r.status === "proof_submitted") && r.preview && (
          <>
            <button className="btn btn-gold" disabled={busy} onClick={() => setPay(true)}>
              {r.status === "payout_due" ? nt(lang, "a_payout1") : nt(lang, "a_settle_ok")}
            </button>
            {r.status === "proof_submitted" && (
              <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => act("settle_reject")}>
                {nt(lang, "a_settle_no")}
              </button>
            )}
          </>
        )}
        {r.overdue && (
          <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => act("close_overdue", {}, nt(lang, "a_close_overdue") + "?")}>
            {nt(lang, "a_close_overdue")}
          </button>
        )}
      </div>

      {["pending_review", "needs_more_proof"].includes(r.status) && (
        <button
          className="text-xs text-danger underline"
          disabled={busy}
          onClick={() => {
            const reason = prompt(nt(lang, "a_block_reason"));
            if (reason) act("block", { note: reason });
          }}
        >
          {nt(lang, "a_block")}
        </button>
      )}

      {msg && (
        <p role="status" className="text-xs text-muted">
          {msg}
        </p>
      )}
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">{nt(lang, "a_log")}</summary>
        <ul className="mt-1 space-y-0.5">
          {r.actions.map((a, i) => (
            <li key={i}>
              {new Date(a.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")} · {a.action}
              {a.note ? ` · ${a.note}` : ""}
            </li>
          ))}
        </ul>
      </details>

      {pay && r.preview && (
        <PayoutDialog
          r={r}
          busy={busy}
          onClose={() => setPay(false)}
          onConfirm={(confirmName) => act(r.status === "payout_due" ? "payout1" : "settle_approve", { confirmName })}
        />
      )}
    </article>
  );
}

// Admin: review queue for verified-need requests, and the payout list.
export function NeedAdmin() {
  const { lang } = useLang();
  const { api } = usePi();
  const [reqs, setReqs] = useState<AdminReq[] | null>(null);
  const load = useCallback(() => {
    api<{ requests: AdminReq[] }>("/api/admin/need").then((r) => setReqs(r.requests)).catch(() => setReqs([]));
  }, [api]);
  useEffect(load, [load]);

  const review = (reqs ?? []).filter((r) => ["pending_review", "needs_more_proof"].includes(r.status));
  const pay = (reqs ?? []).filter((r) => ["payout_due", "stage1_paid", "proof_submitted"].includes(r.status));
  return (
    <section className="space-y-4" aria-label={nt(lang, "a_title")}>
      <h2 className="text-lg font-bold">{nt(lang, "a_title")}</h2>
      <div className="space-y-3">
        <h3 className="font-bold">
          {nt(lang, "a_queue")} ({review.length})
        </h3>
        {review.length === 0 && <p className="text-sm text-muted">{nt(lang, "a_empty")}</p>}
        {review.map((r) => (
          <Card key={r.id} r={r} reload={load} />
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="font-bold">
          {nt(lang, "a_payouts")} ({pay.length})
        </h3>
        {pay.length === 0 && <p className="text-sm text-muted">{nt(lang, "a_empty")}</p>}
        {pay.map((r) => (
          <Card key={r.id} r={r} reload={load} />
        ))}
      </div>
    </section>
  );
}
