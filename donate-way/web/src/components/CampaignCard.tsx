"use client";

import Link from "next/link";
import { useLang, type TKey } from "@/lib/client/i18n";
import { daysLeft, pi, type Campaign } from "@/lib/client/types";

export function Progress({ raised, goal }: { raised: number; goal: number }) {
  const pct = Math.min(100, goal > 0 ? (raised / goal) * 100 : 0);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatusBadge({ c }: { c: Pick<Campaign, "status" | "urgent"> }) {
  const { t } = useLang();
  if (c.status === "funded") return <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">{t("funded")}</span>;
  if (c.status === "completed") return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{t("completed")}</span>;
  if (c.status === "pending") return <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{t("pending")}</span>;
  if (c.urgent) return <span className="rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white">{t("urgent")}</span>;
  return null;
}

export function CampaignCard({ c }: { c: Campaign }) {
  const { t } = useLang();
  const left = daysLeft(c.deadline);
  return (
    <Link href={`/campaigns/${c.id}`} className="card block overflow-hidden transition hover:-translate-y-0.5">
      <div className="relative aspect-[16/9] bg-surface-2">
        {c.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- organizer-provided URLs from any host
          <img src={c.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-4xl">🤲</div>
        )}
        <div className="absolute start-3 top-3">
          <StatusBadge c={c} />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{t(`cat_${c.category}` as TKey)}</span>
          <span>·</span>
          <span>{c.country}</span>
          {left !== null && (
            <>
              <span>·</span>
              <span>{left > 0 ? `${left} ${t("days_left")}` : t("ended")}</span>
            </>
          )}
        </div>
        <h3 className="line-clamp-2 font-bold leading-snug">{c.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{c.summary}</p>
        <Progress raised={c.raised} goal={c.goal} />
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <b className="text-brand">{pi(c.raised)}</b> <span className="text-muted">{t("of_goal")} {pi(c.goal)}</span>
          </span>
          <span className="text-muted">
            {c.donors} {t("donors")}
          </span>
        </div>
      </div>
    </Link>
  );
}
