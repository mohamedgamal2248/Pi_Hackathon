"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { nt, needError, type NeedKey } from "@/lib/client/need-i18n";
import type { NeedDoc, NeedPayout } from "@/lib/client/need-types";
import { ApiError, usePi } from "@/lib/client/pi";
import { explorerTx, pi as piFmt } from "@/lib/client/types";

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
};

function Card({ r, reload }: { r: AdminReq; reload: () => void }) {
  const { lang, t } = useLang();
  const { api } = usePi();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/need/${r.id}`, { method: "POST", body: JSON.stringify({ action, note }) });
      setNote("");
      setMsg(nt(lang, "a_done"));
      reload();
    } catch (e) {
      setMsg(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b>{nt(lang, `type_${r.caseType}` as NeedKey)}</b> · <span className="num">{piFmt(r.amount)}</span> · {nt(lang, `w_${r.windowDays}` as NeedKey)}
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">{nt(lang, `st_${r.status}` as NeedKey)}</span>
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
      {r.flagged && <p className="rounded-xl bg-danger/10 p-2 text-xs text-danger">{nt(lang, "a_flag")}</p>}
      <p className="whitespace-pre-line text-muted">{r.description}</p>

      {r.docs.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold">{nt(lang, "a_docs")}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {r.docs.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden rounded-xl bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                <img src={d.url} alt={d.kind} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute bottom-1 start-1 rounded bg-bg/80 px-1 text-[10px]">{d.kind}</span>
              </a>
            ))}
          </div>
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

      {["pending_review", "proof_submitted"].includes(r.status) && (
        <label className="block space-y-1">
          <span className="text-xs text-muted">{nt(lang, "a_note")}</span>
          <textarea className="input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {r.status === "pending_review" && (
          <>
            <button className="btn btn-primary" disabled={busy} onClick={() => act("approve")}>
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
        {r.status === "payout_due" && (
          <button className="btn btn-gold" disabled={busy} onClick={() => act("payout1", nt(lang, "a_confirm_payout"))}>
            {nt(lang, "a_payout1")}
          </button>
        )}
        {r.status === "proof_submitted" && (
          <>
            <button className="btn btn-gold" disabled={busy} onClick={() => act("settle_approve", nt(lang, "a_confirm_payout"))}>
              {nt(lang, "a_settle_ok")}
            </button>
            <button className="btn btn-ghost text-danger" disabled={busy} onClick={() => act("settle_reject")}>
              {nt(lang, "a_settle_no")}
            </button>
          </>
        )}
      </div>
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
