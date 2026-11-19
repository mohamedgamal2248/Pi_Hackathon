"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { Reveal } from "@/lib/client/motion";
import { usePi } from "@/lib/client/pi";

type Row = { username: string; total: number; count: number };
type Data = { all: Row[]; week: Row[]; inviters: Row[] };
type Tab = "week" | "all" | "inviters";

// Top donors (names partly hidden) and top inviters ("ambassadors").
export default function LeaderboardPage() {
  const { t } = useLang();
  const { api } = usePi();
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("week");

  useEffect(() => {
    api<Data>("/api/leaderboard").then(setD).catch(() => setD({ all: [], week: [], inviters: [] }));
  }, [api]);

  const rows = d ? d[tab] : [];
  const medal = ["bg-brand text-brand-ink", "bg-gold text-brand-ink", "bg-surface-2 text-ink"];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Icon name="award" className="text-brand" /> {t("leaderboard")}
      </h1>
      <div className="flex gap-2" role="tablist">
        {(["week", "all", "inviters"] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className="chip" data-active={tab === k} onClick={() => setTab(k)}>
            {t(k === "week" ? "lb_week" : k === "all" ? "lb_all" : "lb_inviters")}
          </button>
        ))}
      </div>
      {tab === "inviters" && <p className="text-sm text-muted">{t("lb_inviters_note")}</p>}
      {!d ? (
        <div className="card h-72 animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="card p-8 text-center text-muted">{t("lb_empty")}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <Reveal key={`${tab}-${i}`} delay={Math.min(i, 8) * 40}>
              <li className="card flex items-center gap-3 p-3">
                <span className={`num grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${medal[i] ?? "bg-surface-2 text-muted"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate" dir="ltr">
                    @{r.username}
                  </b>
                  <span className="text-xs text-muted">{tab === "inviters" ? t("lb_invites", { n: r.count }) : t("lb_gifts", { n: r.count })}</span>
                </span>
                <span className="text-brand">
                  <Money value={r.total} showUsd={false} />
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
      )}
    </div>
  );
}
