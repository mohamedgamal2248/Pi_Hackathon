"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi } from "@/lib/client/types";

type Challenge = { id: string; title: string; description: string | null; goal: number; campaign_id: string | null; campaign_title: string | null; ends_at: string; raised: number; participants: number };

// Running community challenge with a countdown (e.g. "Friday: 1000 π for water").
export function ChallengeCard() {
  const { t } = useLang();
  const { api } = usePi();
  const [c, setC] = useState<Challenge | null>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    api<{ challenge: Challenge | null }>("/api/challenges").then((r) => setC(r.challenge)).catch(() => undefined);
  }, [api]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!c) return null;
  const left = Math.max(0, new Date(c.ends_at).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const timeLeft = d > 0 ? t("d_h", { d, h }) : t("h_m", { h, m });
  const pct = Math.min(100, (c.raised / c.goal) * 100);
  const reached = c.raised >= c.goal;

  return (
    <section className="card relative overflow-hidden border-brand/40 p-5 sm:p-6">
      <div className="pointer-events-none absolute -start-16 -top-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <span className="chip !bg-brand-soft !text-brand">
          <Icon name="flame" size={16} /> {t("challenge")}
        </span>
        <span className="num text-sm text-muted">{reached ? t("challenge_done") : t("challenge_left", { t: timeLeft })}</span>
      </div>
      <h2 className="relative mt-3 text-xl font-bold">{c.title}</h2>
      {c.description && <p className="relative mt-1 text-sm text-muted">{c.description}</p>}
      <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={c.title}>
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="num">
          <Money value={c.raised} showUsd={false} /> / {pi(c.goal)}
        </span>
        <span className="text-muted">{t("challenge_people", { n: c.participants })}</span>
      </div>
      <div className="relative mt-4 flex gap-2">
        <button className="btn btn-primary flex-1" onClick={() => setOpen(true)}>
          {t("challenge_join")}
        </button>
        {c.campaign_id && (
          <Link href={`/campaigns/${c.campaign_id}`} className="btn btn-ghost">
            {c.campaign_title ?? ""}
          </Link>
        )}
      </div>
      {open && (
        <DonateSheet
          target={c.campaign_id ? { kind: "campaign", id: c.campaign_id, title: c.campaign_title ?? c.title } : { kind: "fund", fund: "general", title: t("to_general") }}
          onClose={() => setOpen(false)}
          onDone={() => api<{ challenge: Challenge | null }>("/api/challenges").then((r) => setC(r.challenge)).catch(() => undefined)}
        />
      )}
    </section>
  );
}
