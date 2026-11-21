"use client";

import { Icon } from "@/components/Icon";
import { NeedBadge } from "@/components/CampaignCard";
import { useLang } from "@/lib/client/i18n";
import { nt, type NeedKey } from "@/lib/client/need-i18n";
import { explorerTx, pi, type NeedFund } from "@/lib/client/types";

// Public part of a verified-need fund: who/what, where the money is in its life, payouts and (for donors) the proof.
export function NeedFundPanel({ need }: { need: NeedFund }) {
  const { lang } = useLang();
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
            <div className="grid gap-2 sm:grid-cols-2">
              {need.proof.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage, must not go through the image cache
                <img key={p.id} src={p.url} alt={`${nt(lang, "fund_proof")} ${i + 1}`} loading="lazy" className="w-full rounded-xl bg-surface-2" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">{nt(lang, "fund_proof_donors")}</p>
          )}
        </div>
      )}
    </section>
  );
}
