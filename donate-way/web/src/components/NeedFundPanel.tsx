"use client";

import { DocViewer } from "@/components/DocViewer";
import { Icon } from "@/components/Icon";
import { NeedBadge } from "@/components/CampaignCard";
import { useState } from "react";
import { useLang } from "@/lib/client/i18n";
import { ApiError, usePi } from "@/lib/client/pi";
import { nt, needError, type NeedKey } from "@/lib/client/need-i18n";
import { explorerTx, pi, type NeedFund } from "@/lib/client/types";

// Public part of a verified-need fund: who/what, where the money is in its life, payouts and (for donors) the proof.
export function NeedFundPanel({ need, campaignId, onChanged }: { need: NeedFund; campaignId: string; onChanged: () => void }) {
  const { lang, t } = useLang();
  const { api, user, signIn } = usePi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVouch() {
    if (!user && !(await signIn())) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/campaigns/${campaignId}/vouch`, { method: need.vouches.mine ? "DELETE" : "POST" });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? needError(lang, e.message, t("error_generic")) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }
  const date = need.endsAt ? new Date(need.endsAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const stageKey = `fund_stage_${need.status}` as NeedKey;
  const stageText = need.status === "fundraising" ? nt(lang, "fund_stage_fundraising", { date }) : nt(lang, stageKey);
  return (
    <section className="card space-y-3 border-brand/40 p-5" aria-label={nt(lang, "badge")}>
      <div className="flex flex-wrap items-center gap-2">
        <NeedBadge />
        <span className="text-sm text-muted">{nt(lang, `type_${need.caseType}` as NeedKey)}</span>
      </div>
      <p className="text-sm">{nt(lang, "badge_long")}</p>
      <p className="text-sm text-muted">{nt(lang, "fund_by", { name: need.applicant })}</p>
      <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
        <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-brand" /> {stageText}
      </p>
      {need.status === "fundraising" && <p className="text-xs text-muted">{nt(lang, "fund_rule", { pct: need.stage1Pct })}</p>}

      <div className="space-y-1.5 rounded-2xl border border-line p-3 text-sm">
        <p className="flex items-center gap-2 font-bold">
          <Icon name="shield" size={18} className="text-brand" />
          {need.vouches.count > 0 ? nt(lang, "vouch_count", { n: need.vouches.count }) : nt(lang, "vouch_none")}
        </p>
        {need.vouches.names.length > 0 && <p className="text-xs text-muted">{nt(lang, "vouch_names", { names: need.vouches.names.map((n) => `@${n}`).join("، ") })}</p>}
        {need.vouches.canVouch && (
          <>
            <p className="text-xs text-muted">{nt(lang, "vouch_note")}</p>
            <button className="btn btn-ghost w-full" disabled={busy} onClick={toggleVouch}>
              {need.vouches.mine ? nt(lang, "vouch_undo") : nt(lang, "vouch_btn")}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      {need.payouts.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h3 className="font-bold">{nt(lang, "fund_payouts")}</h3>
          {need.payouts.map((p) => (
            <div key={p.stage} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span>
                {nt(lang, "stage", { n: p.stage })} · <b className="num">{pi(p.amount)}</b>
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

      {need.proofReady && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">{nt(lang, "fund_proof")}</h3>
          {need.proofVisible && need.proof.length > 0 ? (
            <DocViewer docs={need.proof.map((p) => ({ id: p.id, url: p.url }))} />
          ) : (
            <p className="text-xs text-muted">{nt(lang, "fund_proof_donors")}</p>
          )}
        </div>
      )}
    </section>
  );
}
