"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { NeedDocs } from "@/components/NeedDocs";
import { NeedStepper } from "@/components/NeedStepper";
import { useLang } from "@/lib/client/i18n";
import { nt, needError, type NeedKey } from "@/lib/client/need-i18n";
import type { NeedConfig, NeedReq } from "@/lib/client/need-types";
import { ApiError, usePi } from "@/lib/client/pi";
import { explorerTx, pi as piFmt } from "@/lib/client/types";

const TONE: Record<string, string> = {
  rejected: "bg-surface-2 text-danger",
  withdrawn: "bg-surface-2 text-muted",
  closed: "bg-surface-2 text-muted",
  needs_more_proof: "bg-gold-soft text-gold",
  fundraising: "bg-brand-soft text-brand",
};

function RequestCard({ r, cfg, reload }: { r: NeedReq; cfg: NeedConfig | null; reload: () => void }) {
  const { lang, t } = useLang();
  const { api } = usePi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState("");
  const [posted, setPosted] = useState(false);

  async function postUpdate() {
    setBusy(true);
    setError(null);
    setPosted(false);
    try {
      await api(`/api/need/${r.id}/updates`, { method: "POST", body: JSON.stringify({ body: update }) });
      setUpdate("");
      setPosted(true);
    } catch (e) {
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, method = "POST") {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/need/${r.id}${path}`, { method });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  const canWithdraw = ["draft", "pending_review", "needs_more_proof"].includes(r.status);
  return (
    <article className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{nt(lang, `type_${r.caseType}` as NeedKey)}</h2>
          <p className="num text-sm text-muted">{piFmt(r.amount)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[r.status] ?? "bg-surface-2"}`}>{nt(lang, `st_${r.status}` as NeedKey)}</span>
      </div>
      <NeedStepper status={r.status} />
      <p className="line-clamp-3 text-sm text-muted">{r.description}</p>

      {r.adminNote && ["rejected", "needs_more_proof", "stage1_paid"].includes(r.status) && (
        <p className="rounded-2xl bg-gold-soft p-3 text-sm text-gold">
          <b>{nt(lang, "admin_said")}:</b> {r.adminNote}
        </p>
      )}

      {r.status === "draft" && (
        <Link href="/need/new" className="btn btn-primary w-full">
          {nt(lang, "resume")}
        </Link>
      )}

      {r.status === "needs_more_proof" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">{nt(lang, "more_proof_title")}</h3>
          <NeedDocs requestId={r.id} docs={r.docs} kind="extra" onChanged={reload} />
          <button className="btn btn-primary w-full" disabled={busy || !r.docs.some((d) => d.kind === "extra")} onClick={() => act("/resubmit")}>
            {nt(lang, "more_proof_btn")}
          </button>
        </div>
      )}

      {r.status === "stage1_paid" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">{nt(lang, "settle_title")}</h3>
          <p className="text-sm text-muted">{nt(lang, "settle_hint", { pct: 100 - (cfg?.stage1Pct ?? 70) })}</p>
          <NeedDocs requestId={r.id} docs={r.docs} kind="settlement" onChanged={reload} />
          <button className="btn btn-primary w-full" disabled={busy || !r.docs.some((d) => d.kind === "settlement")} onClick={() => act("/proof")}>
            {nt(lang, "settle_btn")}
          </button>
        </div>
      )}

      {r.campaignId && ["fundraising", "payout_due", "stage1_paid", "proof_submitted"].includes(r.status) && (
        <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <h3 className="text-sm font-bold">{nt(lang, "upd_title")}</h3>
          <textarea className="input" rows={2} maxLength={400} value={update} onChange={(e) => setUpdate(e.target.value)} aria-label={nt(lang, "upd_title")} />
          <p className="text-xs text-muted">{nt(lang, "upd_hint")}</p>
          <button className="btn btn-primary w-full" disabled={busy || update.trim().length < 10} onClick={postUpdate}>
            {nt(lang, "upd_send")}
          </button>
          {posted && (
            <p role="status" className="text-xs text-brand">
              {nt(lang, "upd_sent")}
            </p>
          )}
        </div>
      )}

      {r.campaignId && (
        <Link href={`/campaigns/${r.campaignId}`} className="btn btn-ghost w-full">
          <Icon name="link" size={18} /> {nt(lang, "open_fund")}
        </Link>
      )}

      {r.raised != null && r.raised > 0 && <p className="text-sm">{nt(lang, "raised_total", { amount: piFmt(r.raised) })}</p>}

      {r.payouts.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h3 className="font-bold">{nt(lang, "payouts")}</h3>
          {r.payouts.map((p) => (
            <div key={p.stage} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span>
                {nt(lang, "stage", { n: p.stage })} · <b className="num">{piFmt(p.amount)}</b>
              </span>
              {p.txid && (
                <a href={explorerTx(p.txid)} target="_blank" rel="noopener noreferrer" className="text-xs text-brand underline">
                  {nt(lang, "tx")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {canWithdraw && (
        <button
          className="text-xs text-muted underline"
          disabled={busy}
          onClick={() => {
            if (confirm(nt(lang, "withdraw_confirm"))) act("", "DELETE");
          }}
        >
          {nt(lang, "withdraw")}
        </button>
      )}
    </article>
  );
}

function Mine() {
  const { lang, t } = useLang();
  const { api, user, signIn, ready } = usePi();
  const sent = useSearchParams().get("sent") === "1";
  const [reqs, setReqs] = useState<NeedReq[] | null>(null);
  const [cfg, setCfg] = useState<NeedConfig | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ config: NeedConfig; requests: NeedReq[] }>("/api/need").catch(() => null);
    if (r) {
      setReqs(r.requests);
      setCfg(r.config);
    }
  }, [api]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once the SDK is ready and when the user changes
    if (ready) load();
  }, [ready, user, load]);

  if (!user)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
        <p className="text-muted">{nt(lang, "sign_in_needed")}</p>
        <button className="btn btn-primary w-full" onClick={() => signIn()}>
          {t("sign_in")}
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{nt(lang, "mine_title")}</h1>
        <Link href="/need/new" className="btn btn-primary">
          {nt(lang, "entry_cta")}
        </Link>
      </div>
      {sent && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm text-brand">
          <Icon name="check" size={18} /> {nt(lang, "sent_ok")}
        </p>
      )}
      {reqs === null && <div className="card h-40 animate-pulse" />}
      {reqs?.length === 0 && <p className="py-10 text-center text-muted">{nt(lang, "mine_empty")}</p>}
      {reqs?.map((r) => (
        <RequestCard key={r.id} r={r} cfg={cfg} reload={load} />
      ))}
    </div>
  );
}

export default function MinePage() {
  return (
    <Suspense fallback={<div className="card h-40 animate-pulse" />}>
      <Mine />
    </Suspense>
  );
}
