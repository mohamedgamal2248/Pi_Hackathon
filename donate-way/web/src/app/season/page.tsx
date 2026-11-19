"use client";

import { useEffect, useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi } from "@/lib/client/types";

type Data = {
  season: { kind: "ramadan" | "friday" | null; ramadanDay: number | null; lastTen: boolean; goal: number; daysToFriday: number; daysToRamadan: number | null; endsAt: string | null };
  progress: { raised: number; donors: number };
  mine: { fridays: number; ramadanDays: number; lastTen: boolean } | null;
};

const BADGES: { key: TKey; got: (m: NonNullable<Data["mine"]>) => boolean; left: (m: NonNullable<Data["mine"]>) => number }[] = [
  { key: "sb_friday_1", got: (m) => m.fridays >= 1, left: (m) => 1 - m.fridays },
  { key: "sb_friday_4", got: (m) => m.fridays >= 4, left: (m) => 4 - m.fridays },
  { key: "sb_ramadan_10", got: (m) => m.ramadanDays >= 10, left: (m) => 10 - m.ramadanDays },
  { key: "sb_last_ten", got: (m) => m.lastTen, left: () => 1 },
];

// Friday of Giving and Ramadan: one shared goal, a countdown, and seasonal badges.
export default function SeasonPage() {
  const { t } = useLang();
  const { api, user } = usePi();
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Data>("/api/season").then(setD).catch(() => undefined);
  }, [api, user]);

  if (!d) return <div className="card h-80 animate-pulse" />;
  const s = d.season;
  const active = s.kind !== null;
  const pct = s.goal > 0 ? Math.min(100, (d.progress.raised / s.goal) * 100) : 0;
  const title = s.kind === "ramadan" ? t("season_ramadan") : s.kind === "friday" ? t("season_friday") : t("season_none");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -end-16 -top-16 h-52 w-52 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="relative space-y-3">
          <span className="chip !bg-brand-soft !text-brand">
            <Icon name="flame" size={16} /> {t("season")}
          </span>
          <h1 className="text-3xl font-bold">{title}</h1>
          {s.kind === "ramadan" && (
            <p className="text-muted">
              {t("season_ramadan_day", { d: s.ramadanDay ?? 1 })}
              {s.lastTen ? ` · ${t("season_last_ten")}` : ""}
            </p>
          )}
          {!active && (
            <p className="text-muted">
              {t("season_next_friday", { n: s.daysToFriday })}
              {s.daysToRamadan != null && ` · ${t("season_next_ramadan", { n: s.daysToRamadan })}`}
            </p>
          )}
          <p className="text-sm text-muted">{t("season_blurb")}</p>
        </div>
      </section>

      {active && (
        <section className="card space-y-3 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold">{t("season_goal")}</h2>
            <span className="num text-sm text-muted">{pi(s.goal)}</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={t("season_goal")}>
            <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-xl text-brand">
              <Money value={d.progress.raised} showUsd={false} />
            </span>
            <span className="text-muted">{t("season_people", { n: d.progress.donors })}</span>
          </div>
          <button className="btn btn-primary w-full" onClick={() => setOpen(true)}>
            {t("season_give")}
          </button>
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">{t("season_my")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BADGES.map((b) => {
            const got = d.mine ? b.got(d.mine) : false;
            return (
              <div key={b.key} className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-center ${got ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted opacity-60"}`}>
                <Icon name="award" size={24} />
                <div className="text-xs font-bold leading-tight">{t(b.key)}</div>
                {!got && d.mine && <div className="num text-[10px]">{t("sb_need", { n: Math.max(1, b.left(d.mine)) })}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {open && <DonateSheet target={{ kind: "fund", fund: "general", title: title }} onClose={() => setOpen(false)} onDone={() => api<Data>("/api/season").then(setD).catch(() => undefined)} />}
    </div>
  );
}
