"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { Reveal } from "@/lib/client/motion";
import { nt, type NeedKey } from "@/lib/client/need-i18n";
import { usePi } from "@/lib/client/pi";
import { pi, type Campaign } from "@/lib/client/types";

// The home page's main feature: apply for a verified donation fund.
export function NeedHero({ total, donors }: { total?: number; donors?: number }) {
  const { lang } = useLang();
  const steps = ["hero_need_1", "hero_need_2", "hero_need_3", "hero_need_4"] as const;
  return (
    <section className="card relative overflow-hidden border-brand/50 p-5 sm:p-7" aria-labelledby="need-hero-title">
      <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <span className="relative inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-ink">
        <Icon name="shield" size={14} /> {nt(lang, "hero_need_badge")}
      </span>
      <h1 id="need-hero-title" className="relative mt-3 text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl">
        {nt(lang, "hero_need_title")}
      </h1>
      <p className="relative mt-2 max-w-xl text-sm text-muted sm:text-base">{nt(lang, "hero_need_sub")}</p>
      <div className="relative mt-5 flex flex-wrap gap-2">
        <Link href="/need/new" className="btn btn-primary text-base sm:text-lg">
          <Icon name="plus" size={20} /> {nt(lang, "hero_need_cta")}
        </Link>
        <a href="#need-funds" className="btn btn-ghost">
          {nt(lang, "hero_donate_cta")}
        </a>
      </div>
      <ol className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={nt(lang, "hero_need_how")}>
        {steps.map((k, i) => (
          <li key={k} className="flex items-start gap-2 rounded-2xl bg-surface-2 p-2.5 text-xs">
            <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">{i + 1}</span>
            <span>{nt(lang, k as NeedKey)}</span>
          </li>
        ))}
      </ol>
      {total !== undefined && (
        <div className="relative mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted">
          <span className="text-brand">
            <Money value={total} showUsd={false} className="font-bold" />
          </span>
          <span>
            <b className="num text-ink">{donors ?? 0}</b> {lang === "ar" ? "متبرع" : "donors"}
          </span>
        </div>
      )}
    </section>
  );
}

// Open verified-need funds, always first on the page.
export function NeedFunds() {
  const { lang } = useLang();
  const { api } = usePi();
  const [list, setList] = useState<Campaign[] | null>(null);
  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/campaigns?kind=need&sort=newest").then((r) => setList(r.campaigns)).catch(() => setList([]));
  }, [api]);

  const open = (list ?? []).filter((c) => c.status === "active").slice(0, 6);
  return (
    <section id="need-funds" className="scroll-mt-24 space-y-3" aria-labelledby="need-funds-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="need-funds-title" className="flex items-center gap-2 text-lg font-bold">
          <Icon name="shield" className="text-brand" /> {nt(lang, "funds_title")}
        </h2>
        <Link href="/need/results" className="text-sm text-brand underline">
          {nt(lang, "funds_all")}
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list === null && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}
        {open.map((c, i) => (
          <Reveal key={c.id} delay={Math.min(i, 5) * 60}>
            <CampaignCard c={c} priority={i < 2} />
          </Reveal>
        ))}
        {list && open.length === 0 && (
          <div className="card col-span-full space-y-3 p-6 text-center">
            <p className="text-muted">{nt(lang, "funds_empty")}</p>
            <Link href="/need/new" className="btn btn-primary">
              {nt(lang, "hero_need_cta")}
            </Link>
          </div>
        )}
      </div>
      {list && list.some((c) => c.status !== "active") && (
        <p className="text-xs text-muted">
          {pi(list.filter((c) => c.status !== "active").reduce((s, c) => s + c.raised, 0))} · {nt(lang, "funds_all")}
        </p>
      )}
    </section>
  );
}
