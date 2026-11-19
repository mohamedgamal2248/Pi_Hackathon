"use client";

import { useEffect, useState } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { CATEGORY_KEYS, pi, type Campaign } from "@/lib/client/types";

type Stats = { total: number; donors: number; donations: number; campaigns: number; released: number };
type Leader = { username: string; total: number; count: number };

const SORTS = ["newest", "urgent", "closest", "most_funded"] as const;

export default function Home() {
  const { t } = useLang();
  const { api } = usePi();
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("newest");
  const [q, setQ] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [generalOpen, setGeneralOpen] = useState(false);
  const [adMsg, setAdMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ stats: Stats; leaderboard: Leader[] }>("/api/stats")
      .then((r) => {
        setStats(r.stats);
        setLeaders(r.leaderboard);
      })
      .catch(() => undefined);
  }, [api]);

  useEffect(() => {
    const params = new URLSearchParams({ sort });
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    const timer = setTimeout(() => {
      api<{ campaigns: Campaign[] }>(`/api/campaigns?${params}`)
        .then((r) => setCampaigns(r.campaigns))
        .catch(() => setCampaigns([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [api, category, sort, q]);

  async function watchAd() {
    try {
      const res = await window.Pi?.Ads?.showAd("rewarded");
      if (res?.result === "AD_REWARDED") setAdMsg(t("ad_thanks"));
    } catch {
      setAdMsg(t("error_generic"));
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-7">
          <h1 className="text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">{t("hero_title")}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">{t("hero_sub")}</p>
          <div className="mt-6 text-xs text-muted">{t("total_raised")}</div>
          <div className="num text-start text-4xl font-bold text-brand sm:text-5xl">{stats ? pi(stats.total) : "…"}</div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>
              <b className="num text-ink">{stats?.donors ?? "…"}</b> {t("donors")}
            </span>
            <span>
              <b className="num text-ink">{stats?.campaigns ?? "…"}</b> {t("campaigns")}
            </span>
            <span>
              <b className="num text-gold">{stats ? pi(stats.released) : "…"}</b> {t("released")}
            </span>
          </div>
        </section>

        <section className="card flex flex-col justify-between gap-4 p-5 sm:p-7">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="heart" className="text-brand" /> {t("general_fund")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("general_fund_desc")}</p>
            {adMsg && <p className="mt-2 text-sm text-brand">{adMsg}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={() => setGeneralOpen(true)}>
              {t("donate")}
            </button>
            <button className="btn btn-ghost" onClick={watchAd} aria-label={t("watch_ad")} title={t("watch_ad")}>
              <Icon name="play" size={18} />
            </button>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <input className="input" placeholder={t("search")} aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button className="chip" data-active={category === ""} onClick={() => setCategory("")}>
            {t("all")}
          </button>
          {CATEGORY_KEYS.map((c) => (
            <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>
              {t(`cat_${c}` as TKey)}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {SORTS.map((s) => (
            <button key={s} className="chip !min-h-9 !bg-transparent text-xs data-[active=true]:!bg-surface-2 data-[active=true]:!text-brand" data-active={sort === s} onClick={() => setSort(s)}>
              {t(`sort_${s}` as TKey)}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}
        {campaigns?.map((c) => (
          <CampaignCard key={c.id} c={c} />
        ))}
        {campaigns?.length === 0 && <p className="col-span-full py-10 text-center text-muted">—</p>}
      </section>

      {leaders.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-bold">{t("honor_board")}</h2>
          <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {leaders.map((l, i) => (
              <li key={l.username} className="flex items-center justify-between text-sm">
                <span>
                  <span className={`num inline-block w-7 ${i < 3 ? "font-bold text-brand" : "text-muted"}`}>{i + 1}</span> @{l.username}
                </span>
                <b className="num text-brand">{pi(l.total)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      {generalOpen && <DonateSheet campaignId={null} title={t("general_fund")} onClose={() => setGeneralOpen(false)} />}
    </div>
  );
}
