"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Progress } from "@/components/CampaignCard";
import { useLang } from "@/lib/client/i18n";
import { nt, type NeedKey } from "@/lib/client/need-i18n";
import { usePi } from "@/lib/client/pi";
import { explorerTx, pi as piFmt } from "@/lib/client/types";

type Fund = {
  campaignId: string;
  applicant: string;
  caseType: string;
  status: string;
  goal: number;
  raised: number;
  donors: number;
  payouts: { stage: number; amount: number; txid: string | null }[];
};
type Resp = { funds: Fund[]; totals: { funds: number; raised: number; paidOut: number } };

export default function ResultsPage() {
  const { lang } = useLang();
  const { api } = usePi();
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    api<Resp>("/api/need/results").then(setData).catch(() => setData({ funds: [], totals: { funds: 0, raised: 0, paidOut: 0 } }));
  }, [api]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{nt(lang, "res_title")}</h1>
        <p className="text-sm text-muted">{nt(lang, "res_sub")}</p>
      </header>
      {data && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [data.totals.funds, nt(lang, "res_funds")],
            [piFmt(data.totals.raised), nt(lang, "res_raised")],
            [piFmt(data.totals.paidOut), nt(lang, "res_paid")],
          ].map(([v, l]) => (
            <div key={String(l)} className="card p-3">
              <dd className="num text-lg font-bold text-brand">{v}</dd>
              <dt className="text-xs text-muted">{l}</dt>
            </div>
          ))}
        </dl>
      )}
      {data === null && <div className="card h-40 animate-pulse" />}
      {data?.funds.length === 0 && <p className="py-10 text-center text-muted">{nt(lang, "res_empty")}</p>}
      <ul className="space-y-3">
        {data?.funds.map((f) => (
          <li key={f.campaignId} className="card space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/campaigns/${f.campaignId}`} className="font-bold underline-offset-2 hover:underline">
                {nt(lang, `type_${f.caseType}` as NeedKey)} · @{f.applicant}
              </Link>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs">{nt(lang, `st_${f.status}` as NeedKey)}</span>
            </div>
            <Progress raised={f.raised} goal={f.goal} />
            <p className="text-sm text-muted">
              {nt(lang, "res_collected", { raised: piFmt(f.raised), goal: piFmt(f.goal) })} · {f.donors}
            </p>
            {f.payouts.map((p) => (
              <div key={p.stage} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
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
          </li>
        ))}
      </ul>
    </div>
  );
}
