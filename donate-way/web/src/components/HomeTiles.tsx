"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";

// Two entry tiles under the hero: Sadaqa Jariya, and the current season (Friday / Ramadan).
export function HomeTiles() {
  const { t } = useLang();
  const { api } = usePi();
  const [kind, setKind] = useState<"ramadan" | "friday" | null>(null);
  const [daysToFriday, setDays] = useState<number | null>(null);

  useEffect(() => {
    api<{ season: { kind: "ramadan" | "friday" | null; daysToFriday: number } }>("/api/season")
      .then((r) => {
        setKind(r.season.kind);
        setDays(r.season.daysToFriday);
      })
      .catch(() => undefined);
  }, [api]);

  const seasonTitle = kind === "ramadan" ? t("season_ramadan") : t("season_friday");
  const seasonSub = kind ? t("season_today") : daysToFriday != null ? t("season_next_friday", { n: daysToFriday }) : "";

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href="/season" className={`card flex flex-col gap-1 p-4 ${kind ? "border-brand/50" : ""}`}>
        <Icon name="flame" className="text-brand" />
        <b>{seasonTitle}</b>
        <span className="text-xs text-muted">{seasonSub}</span>
      </Link>
      <Link href="/jariya" className="card flex flex-col gap-1 p-4">
        <Icon name="gift" className="text-gold" />
        <b>{t("jariya")}</b>
        <span className="line-clamp-2 text-xs text-muted">{t("jariya_reminder")}</span>
      </Link>
    </div>
  );
}
