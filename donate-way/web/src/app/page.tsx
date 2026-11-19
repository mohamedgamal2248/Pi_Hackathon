"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CampaignCard, Cover, Progress } from "@/components/CampaignCard";
import { Icon, type IconName } from "@/components/Icon";
import { Money } from "@/components/Money";
import { QuickDonate } from "@/components/QuickDonate";
import { useLang, type TKey } from "@/lib/client/i18n";
import { Reveal } from "@/lib/client/motion";
import { usePi } from "@/lib/client/pi";
import { CATEGORY_KEYS, pi, type Campaign, type FeedItem, type Proof } from "@/lib/client/types";

type Stats = { total: number; toCampaigns: number; donors: number; campaigns: number; released: number; last24h: { total: number; donors: number } };
type Leader = { username: string; total: number; count: number };
type Home = { stats: Stats; feed: FeedItem[]; proofs: Proof[]; leaderboard: Leader[]; leaderboardWeek: Leader[] };

const SORTS = ["newest", "closest", "most_funded"] as const;

function FeedTicker({ feed }: { feed: FeedItem[] }) {
  const { t } = useLang();
  if (!feed.length) return null;
  const label = (f: FeedItem) => (f.target === "general" ? t("to_general") : f.target === "zakat" ? t("to_zakat") : f.target === "cart" ? t("to_cart") : f.target);
  const row = feed.map((f, i) => (
    <span key={i} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs">
      <b className="num text-brand">{pi(f.amount)}</b>
      <span>{f.name ? `@${f.name}` : t("anonymous_donor")}</span>
      <span className="text-muted">← {label(f)}</span>
      {f.gift && <span className="text-gold">{f.gift === "memorial" ? t("memorial_badge") : t("gift_badge")}</span>}
    </span>
  ));
  return (
    <div className="overflow-hidden" aria-label={t("live_feed")}>
      <div className="marquee flex w-max gap-2">
        {row}
        {row}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t, lang } = useLang();
  const { api } = usePi();
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("newest");
  const [q, setQ] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [home, setHome] = useState<Home | null>(null);
  const [board, setBoard] = useState<"week" | "all">("week");

  useEffect(() => {
    api<Home>("/api/stats").then(setHome).catch(() => undefined);
  }, [api]);

  useEffect(() => {
    const params = new URLSearchParams({ sort });
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    const timer = setTimeout(() => {
      api<{ campaigns: Campaign[] }>(`/api/campaigns?${params}`)
        .then((r) => setCampaigns(r.campaigns))
        .catch(() => setCampaigns([]));
    }, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [api, category, sort, q]);

  const s = home?.stats;
  const urgent = campaigns?.find((c) => c.urgent && c.status === "active");
  const almost = (campaigns ?? []).filter((c) => c.status === "active" && c.raised / c.goal >= 0.75).slice(0, 4);
  const leaders = board === "week" ? home?.leaderboardWeek ?? [] : home?.leaderboard ?? [];
  const date = (d: string) => new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" });

  const steps: { icon: IconName; t: TKey; b: TKey }[] = [
    { icon: "heart", t: "how_1_t", b: "how_1_b" },
    { icon: "shield", t: "how_2_t", b: "how_2_b" },
    { icon: "receipt", t: "how_3_t", b: "how_3_b" },
  ];

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Hero + quick donate */}
      <div className="stagger grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -end-20 -top-20 h-60 w-60 rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <h1 className="relative text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">{t("hero_title")}</h1>
          <p className="relative mt-2 max-w-xl text-sm text-muted sm:text-base">{t("hero_sub")}</p>
          <div className="relative mt-6 text-xs text-muted">{t("total_raised")}</div>
          <div className="relative text-4xl text-brand sm:text-5xl">{s ? <Money value={s.total} animate /> : <span className="num font-bold">…</span>}</div>
          <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span>
              <b className="num text-ink">{s?.donors ?? "…"}</b> {t("donors")}
            </span>
            <span>
              <b className="num text-ink">{s?.campaigns ?? "…"}</b> {t("campaigns")}
            </span>
            <span>
              <b className="num text-gold">{s ? pi(s.released) : "…"}</b> {t("released")}
            </span>
          </div>
          {s && (
            <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-xs">
              <span className="live-dot h-2 w-2 rounded-full bg-brand" aria-hidden />
              {t("live_24h", { amount: pi(s.last24h.total), donors: s.last24h.donors })}
            </div>
          )}
        </section>
        <QuickDonate />
      </div>

      {home && home.feed.length > 0 && <FeedTicker feed={home.feed} />}

      {/* Urgent appeal */}
      {urgent && (
        <Reveal>
          <Link href={`/campaigns/${urgent.id}`} className="card group grid overflow-hidden sm:grid-cols-2">
            <div className="relative">
              <Cover src={urgent.cover_url} sizes="(min-width:640px) 50vw, 100vw" priority className="aspect-[16/10] h-full sm:aspect-auto sm:min-h-64" />
              <span className="absolute start-3 top-3 rounded-full bg-danger px-3 py-1 text-xs font-bold text-brand-ink">{t("urgent")}</span>
            </div>
            <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
              <h2 className="text-xl font-bold leading-snug sm:text-2xl">{urgent.title}</h2>
              {urgent.summary && <p className="line-clamp-2 text-sm text-muted">{urgent.summary}</p>}
              <Progress raised={urgent.raised} goal={urgent.goal} />
              <div className="text-sm">
                <Money value={urgent.raised} className="text-brand" /> <span className="text-muted">{t("of_goal")} {pi(urgent.goal)}</span>
              </div>
              <span className="btn btn-primary self-start">{t("donate_now")}</span>
            </div>
          </Link>
        </Reveal>
      )}

      {/* Causes + campaigns */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">{t("categories")}</h2>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input className="input sm:max-w-sm" placeholder={t("search")} aria-label={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {SORTS.map((x) => (
              <button
                key={x}
                className="chip !min-h-9 !bg-transparent text-xs data-[active=true]:!bg-surface-2 data-[active=true]:!text-brand"
                data-active={sort === x}
                onClick={() => setSort(x)}
              >
                {t(`sort_${x}` as TKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}
          {campaigns?.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i, 5) * 60}>
              <CampaignCard c={c} priority={i < 2} />
            </Reveal>
          ))}
          {campaigns?.length === 0 && <p className="col-span-full py-10 text-center text-muted">{t("empty")}</p>}
        </div>
      </section>

      {/* Almost funded */}
      {almost.length > 0 && (
        <Reveal as="section" className="space-y-3">
          <h2 className="text-lg font-bold">{t("almost_funded")}</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {almost.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="card w-64 shrink-0 snap-start space-y-2 p-4">
                <b className="line-clamp-1">{c.title}</b>
                <Progress raised={c.raised} goal={c.goal} className="h-2" />
                <div className="text-xs text-brand">{t("remaining", { amount: pi(Math.max(0, c.goal - c.raised)) })}</div>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {/* Latest proof of spending */}
      {home && home.proofs.length > 0 && (
        <Reveal as="section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Icon name="receipt" className="text-gold" /> {t("latest_proofs")}
            </h2>
            <Link href="/transparency" className="text-sm text-muted hover:text-ink">
              {t("view_all")}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {home.proofs.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/campaigns/${p.campaign_id}?tab=proof`} className="card flex gap-3 p-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gold-soft">
                  {p.media[0] && <Image src={p.media[0]} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="text-xs text-gold">
                    {t("proof_of_spend")} · {date(p.created_at)}
                  </div>
                  <b className="line-clamp-1 text-sm">{p.title}</b>
                  <div className="line-clamp-1 text-xs text-muted">{p.campaign}</div>
                  {p.amount_spent != null && <div className="num text-xs font-bold text-gold">{pi(p.amount_spent)}</div>}
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Honor board */}
        <Reveal as="section" className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="award" className="text-brand" /> {t("honor_board")}
            </h2>
            <div className="flex gap-1">
              {(["week", "all"] as const).map((b) => (
                <button key={b} className="chip !min-h-8 text-xs" data-active={board === b} onClick={() => setBoard(b)}>
                  {t(b === "week" ? "honor_week" : "honor_all")}
                </button>
              ))}
            </div>
          </div>
          {leaders.length === 0 && <p className="py-4 text-center text-sm text-muted">{t("no_donors")}</p>}
          <ol className="space-y-2">
            {leaders.map((l, i) => (
              <li key={l.username} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`num grid h-7 w-7 place-items-center rounded-full text-xs ${i < 3 ? "bg-brand font-bold text-brand-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>@{l.username}
                </span>
                <b className="num text-brand">{pi(l.total)}</b>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* How it works + 95/5 */}
        <Reveal as="section" className="card p-5">
          <h2 className="mb-4 font-bold">{t("how_title")}</h2>
          <ol className="space-y-4">
            {steps.map((st, i) => (
              <li key={st.t} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-brand">
                  <Icon name={st.icon} size={20} />
                </span>
                <div>
                  <b className="text-sm">
                    {i + 1}. {t(st.t)}
                  </b>
                  <p className="text-sm text-muted">{t(st.b)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </div>
  );
}
