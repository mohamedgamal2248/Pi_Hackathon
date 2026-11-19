"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { Reveal } from "@/lib/client/motion";
import { usePi } from "@/lib/client/pi";
import { isStagingHost, openExternal, pi, type Proof } from "@/lib/client/types";

type Data = {
  stats: { total: number; donors: number; donations: number; campaigns: number; released: number };
  proofs: Proof[];
  months: { month: string; total: number }[];
  appWallet: { address: string; balance: number | null } | null;
};

export default function TransparencyPage() {
  const { t, lang } = useLang();
  const { api } = usePi();
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    api<Data>("/api/transparency").then(setD).catch(() => undefined);
  }, [api]);

  if (!d) return <div className="card h-96 animate-pulse" />;
  const s = d.stats;
  const max = Math.max(1, ...d.months.map((m) => m.total));
  const date = (x: string) => new Date(x).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <div className="stagger space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon name="eye" className="text-brand" /> {t("transparency_title")}
        </h1>
        <p className="text-muted">{t("transparency_sub")}</p>
      </div>

      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-muted">{t("total_raised")}</div>
          <div className="text-2xl text-ink">
            <Money value={s.total} animate />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("donors")}</div>
          <div className="num text-2xl font-bold text-brand">{s.donors}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("history")}</div>
          <div className="num text-2xl font-bold">{s.donations}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">{t("spent_with_proof")}</div>
          <div className="text-2xl text-gold">
            <Money value={s.released} animate />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal as="section" className="card p-5">
          <h2 className="mb-4 font-bold">{t("last_12_months")}</h2>
          {d.months.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <div className="flex h-40 items-end gap-1.5" role="img" aria-label={t("last_12_months")}>
              {d.months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-brand/80 transition-all" style={{ height: `${(m.total / max) * 100}%` }} title={`${m.month}: ${pi(m.total)}`} />
                  <span className="num text-[10px] text-muted">{m.month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="wallet" className="text-brand" /> {t("app_wallet")}
          </h2>
          {d.appWallet ? (
            <>
              <code className="num block break-all rounded-xl bg-surface-2 p-3 text-xs" dir="ltr">
                {d.appWallet.address}
              </code>
              {d.appWallet.balance != null && (
                <div className="text-2xl">
                  <Money value={d.appWallet.balance} />
                </div>
              )}
              <button className="text-sm text-brand underline" onClick={() => openExternal(`https://blockexplorer.minepi.com/${isStagingHost() ? "testnet" : "mainnet"}/accounts/${d.appWallet!.address}`)}>
                Pi Block Explorer
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-sm">
            <div>
              <b className="num block text-lg">{s.donations}</b>
              <span className="text-xs text-muted">{t("history")}</span>
            </div>
            <div>
              <b className="num block text-lg">{s.donors}</b>
              <span className="text-xs text-muted">{t("donors")}</span>
            </div>
            <div>
              <b className="num block text-lg">{s.campaigns}</b>
              <span className="text-xs text-muted">{t("campaigns")}</span>
            </div>
          </div>
        </Reveal>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="receipt" className="text-gold" /> {t("latest_proofs")}
        </h2>
        {d.proofs.length === 0 && <p className="text-muted">{t("no_updates")}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.proofs.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 5) * 60}>
              <Link href={`/campaigns/${p.campaign_id}?tab=proof`} className="card block overflow-hidden">
                <div className="relative aspect-[16/10] bg-gold-soft">{p.media[0] && <Image src={p.media[0]} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />}</div>
                <div className="space-y-1 p-4">
                  <div className="text-xs text-gold">{date(p.created_at)}</div>
                  <b className="line-clamp-1">{p.title}</b>
                  <div className="line-clamp-1 text-sm text-muted">{p.campaign}</div>
                  {p.amount_spent != null && <div className="num text-sm font-bold text-gold">{pi(p.amount_spent)}</div>}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
