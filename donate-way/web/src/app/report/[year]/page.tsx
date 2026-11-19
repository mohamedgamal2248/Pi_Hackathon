"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { ShareCard } from "@/components/ShareCard";
import { fmt, pi, shareUrl } from "@/lib/client/types";

type Row = { id: string; amount: number; campaign_share: number; is_zakat: boolean; fund: string | null; completed_at: string; txid: string | null; dw_campaigns: { title: string } | null };

// Printable yearly giving report for the signed-in donor.
export default function ReportPage() {
  const { year } = useParams<{ year: string }>();
  const { t, lang } = useLang();
  const { api, user, signIn, ready } = usePi();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    api<{ username: string; donations: Row[] }>("/api/me")
      .then((m) => {
        setName(m.username);
        setRows(m.donations.filter((d) => String(new Date(d.completed_at).getFullYear()) === year));
      })
      .catch(() => setRows([]));
  }, [api, user, year]);

  if (!user)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
          {t("sign_in")}
        </button>
      </div>
    );
  if (!rows) return <div className="card h-80 animate-pulse" />;

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const zakat = rows.filter((r) => r.is_zakat).reduce((s, r) => s + Number(r.amount), 0);
  const label = (r: Row) => r.dw_campaigns?.title ?? (r.fund === "zakat" ? t("to_zakat") : r.fund === "general" ? t("to_general") : t("to_cart"));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <article className="card space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {t("app_name")}
            <span className="text-brand">.</span>
          </div>
          <span className="num rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand">
            {t("annual_report")} {year}
          </span>
        </div>
        <p className="text-muted">@{name}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="num text-xl font-bold text-brand">{pi(total)}</div>
            <div className="text-xs text-muted">{t("my_total")}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="num text-xl font-bold">{rows.length}</div>
            <div className="text-xs text-muted">{t("history")}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="num text-xl font-bold text-gold">{pi(zakat)}</div>
            <div className="text-xs text-muted">{t("zakat_paid")}</div>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 text-muted">{new Date(r.completed_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</td>
                <td className="py-2">{label(r)}</td>
                <td className="num py-2 text-end font-bold">{fmt(Number(r.amount))} π</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ShareCard
          className="btn btn-gold w-full"
          shareText={t("invite_text")}
          shareLink={shareUrl("/")}
          spec={() => ({
            kicker: t("card_year", { y: year }),
            big: pi(total),
            sub: `@${name}`,
            rows: [`${rows.length} ${t("history")}`, `${new Set(rows.map((r) => r.dw_campaigns?.title ?? r.fund)).size} ${t("card_helped")}`, zakat > 0 ? `${t("zakat_paid")}: ${pi(zakat)}` : ""].filter(Boolean),
            footer: t("card_footer"),
            url: shareUrl("/").replace(/^https?:\/\//, ""),
            rtl: lang === "ar",
          })}
        />
      </article>
      <button className="no-print btn btn-ghost w-full" onClick={() => window.print()}>
        <Icon name="receipt" size={18} /> {t("print")}
      </button>
    </div>
  );
}
