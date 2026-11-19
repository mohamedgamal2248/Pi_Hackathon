"use client";

import { useEffect, useState } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import { DonateSheet } from "@/components/DonateSheet";
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
    <div className="space-y-6">
      <section className="card overflow-hidden bg-brand p-6 text-brand-ink">
        <h1 className="text-2xl font-bold leading-snug">{t("hero_title")}</h1>
        <p className="mt-2 text-sm opacity-90">{t("hero_sub")}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-lg font-bold">{stats ? pi(stats.total) : "…"}</div>
            <div className="text-xs opacity-80">{t("total_raised")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-lg font-bold">{stats?.donors ?? "…"}</div>
            <div className="text-xs opacity-80">{t("donors")}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <div className="text-lg font-bold">{stats ? pi(stats.released) : "…"}</div>
            <div className="text-xs opacity-80">{t("released")}</div>
          </div>
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-bold">💚 {t("general_fund")}</h2>
          <p className="text-sm text-muted">{t("general_fund_desc")}</p>
          {adMsg && <p className="mt-1 text-sm text-brand">{adMsg}</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setGeneralOpen(true)}>
            {t("donate")}
          </button>
          <button className="btn btn-ghost text-sm" onClick={watchAd} title={t("watch_ad")}>
            📺
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <input className="input" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button className="chip" data-active={category === ""} onClick={() => setCategory("")}>
            {t("all")}
          </button>
          {CATEGORY_KEYS.map((c) => (
            <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>
              {t(`cat_${c}` as TKey)}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {SORTS.map((s) => (
            <button key={s} className="chip text-xs" data-active={sort === s} onClick={() => setSort(s)}>
              {t(`sort_${s}` as TKey)}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {campaigns === null &&
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-72 animate-pulse bg-surface-2" />)}
        {campaigns?.map((c) => (
          <CampaignCard key={c.id} c={c} />
        ))}
        {campaigns?.length === 0 && <p className="col-span-full py-10 text-center text-muted">—</p>}
      </section>

      {leaders.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 font-bold">🏅 {t("honor_board")}</h2>
          <ol className="space-y-2">
            {leaders.map((l, i) => (
              <li key={l.username} className="flex items-center justify-between text-sm">
                <span>
                  <span className="inline-block w-6 text-muted">{i + 1}.</span> @{l.username}
                </span>
                <b className="text-brand">{pi(l.total)}</b>
              </li>
            ))}
          </ol>
        </section>
      )}

      {generalOpen && <DonateSheet campaignId={null} title={t("general_fund")} onClose={() => setGeneralOpen(false)} />}
    </div>
  );
}
