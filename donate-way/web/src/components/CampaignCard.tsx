"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang, type TKey } from "@/lib/client/i18n";
import { daysLeft, pi, type Campaign } from "@/lib/client/types";

// Fills from 0 when it scrolls into view.
export function Progress({ raised, goal, className = "h-2.5" }: { raised: number; goal: number; className?: string }) {
  const pct = Math.min(100, goal > 0 ? (raised / goal) * 100 : 0);
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        setShown(pct);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [pct]);
  return (
    <div ref={ref} className={`w-full overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-label={`${Math.round(pct)}%`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-out motion-reduce:transition-none" style={{ width: `${shown}%` }} />
    </div>
  );
}

export function StatusBadge({ c }: { c: Pick<Campaign, "status" | "urgent"> }) {
  const { t } = useLang();
  if (c.status === "funded") return <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">{t("funded")}</span>;
  if (c.status === "completed") return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{t("completed")}</span>;
  if (c.status === "paused" || c.status === "draft") return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{t(c.status as TKey)}</span>;
  if (c.urgent) return <span className="rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-brand-ink">{t("urgent")}</span>;
  return null;
}

export function Cover({ src, sizes, priority = false, className = "" }: { src: string | null; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-muted">
          <Icon name="heart" size={40} />
        </div>
      )}
    </div>
  );
}

export function CampaignCard({ c, priority = false }: { c: Campaign; priority?: boolean }) {
  const { t } = useLang();
  const left = daysLeft(c.deadline);
  const remaining = Math.max(0, c.goal - c.raised);
  return (
    <Link href={`/campaigns/${c.id}`} className="card group block overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-brand/40 active:scale-[0.99]">
      <div className="relative">
        <Cover src={c.cover_url} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" priority={priority} className="aspect-[16/10] transition duration-500 group-hover:scale-[1.02]" />
        <div className="absolute start-3 top-3 flex gap-1.5">
          <StatusBadge c={c} />
          {c.zakat_eligible && <span className="rounded-full bg-bg/80 px-2.5 py-1 text-xs font-bold text-brand backdrop-blur">{t("zakat_ok")}</span>}
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{t(`cat_${c.category}` as TKey)}</span>
          {left !== null && (
            <>
              <span>·</span>
              <span>{left > 0 ? `${left} ${t("days_left")}` : t("ended")}</span>
            </>
          )}
        </div>
        <h3 className="line-clamp-2 font-bold leading-snug">{c.title}</h3>
        <Progress raised={c.raised} goal={c.goal} />
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span>
            <Money value={c.raised} className="text-brand" showUsd={false} /> <span className="text-muted">{t("of_goal")} {pi(c.goal)}</span>
          </span>
          <span className="shrink-0 text-xs text-muted">
            {c.status === "active" ? t("remaining", { amount: pi(remaining) }) : `${c.donors} ${t("donors")}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
