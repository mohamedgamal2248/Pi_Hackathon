"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { useCallback, useEffect, useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi } from "@/lib/client/types";

type Me = {
  username: string;
  total: number;
  count: number;
  campaignsHelped: number;
  points: number;
  donations: { amount: number; anonymous: boolean; campaign_id: string | null; txid: string | null; completed_at: string; dw_campaigns: { title: string } | null }[];
  recurring: { id: string; amount: number; next_due: string; campaign_id: string | null; dw_campaigns: { title: string } | null }[];
  organizer: { status: string } | null;
};

function badges(me: Me, ar: boolean) {
  const list: string[] = [];
  if (me.count >= 1) list.push(ar ? "أول خطوة" : "First gift");
  if (me.count >= 5) list.push(ar ? "سند دائم" : "Regular");
  if (me.count >= 20) list.push(ar ? "عمود خير" : "Pillar");
  if (me.total >= 100) list.push(ar ? "١٠٠ π+" : "100 π+");
  if (me.campaignsHelped >= 5) list.push(ar ? "متعدد الأثر" : "Wide impact");
  if (me.recurring.length > 0) list.push(ar ? "صدقة جارية" : "Monthly giver");
  if (me.organizer?.status === "approved") list.push(ar ? "منظّم موثّق" : "Verified organizer");
  return list;
}

export default function MePage() {
  const { t, lang } = useLang();
  const { api, user, signIn, ready } = usePi();
  const [me, setMe] = useState<Me | null>(null);
  const [pay, setPay] = useState<Me["recurring"][number] | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    api<Me>("/api/me")
      .then((data) => {
        setMe(data);
        // Opened from a monthly reminder notification: /me?pay=<pledge id>
        const due = new URLSearchParams(window.location.search).get("pay");
        const pledge = data.recurring.find((r) => r.id === due);
        if (pledge) setPay(pledge);
      })
      .catch(() => undefined);
  }, [api, user]);

   
  useEffect(load, [load]);

  async function stop(id: string) {
    await api(`/api/recurring?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!user)
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-muted">{t("sign_in_to_see")}</p>
        <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
          {t("sign_in")}
        </button>
      </div>
    );
  if (!me) return <div className="card h-80 animate-pulse bg-surface-2" />;

  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB");

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-2xl font-bold text-brand-ink">{me.username[0]?.toUpperCase()}</div>
          <div>
            <h1 className="text-lg font-bold">@{me.username}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {badges(me, lang === "ar").map((b) => (
                <span key={b} className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <b className="block text-lg text-brand">{pi(me.total)}</b>
            <span className="text-muted">{t("my_total")}</span>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <b className="block text-lg">{me.campaignsHelped}</b>
            <span className="text-muted">{t("campaigns_helped")}</span>
          </div>
          <div className="rounded-xl bg-gold-soft p-3">
            <b className="block text-lg text-gold">{Math.floor(me.points)}</b>
            <span className="text-muted">{t("points")}</span>
          </div>
        </div>
        <p className="text-xs text-muted">{t("points_note")}</p>
      </div>

      {me.recurring.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Icon name="repeat" size={18} className="text-brand" /> {t("monthly_pledges")}</h2>
          <ul className="space-y-3">
            {me.recurring.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <b>{pi(r.amount)}</b> · {r.dw_campaigns?.title ?? t("general_fund")}
                  <div className="text-xs text-muted">
                    {t("next_due")}: {date(r.next_due)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => setPay(r)}>
                    {t("pay_now")}
                  </button>
                  <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => stop(r.id)}>
                    {t("stop")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 font-bold">{t("history")}</h2>
        {me.donations.length === 0 && <p className="text-muted">—</p>}
        <ul className="divide-y divide-line">
          {me.donations.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <div>
                {d.campaign_id ? <Link href={`/campaigns/${d.campaign_id}`}>{d.dw_campaigns?.title}</Link> : t("general_fund")}
                <div className="text-xs text-muted">{date(d.completed_at)}</div>
              </div>
              <b className="text-brand">{pi(d.amount)}</b>
            </li>
          ))}
        </ul>
      </div>

      {pay && (
        <DonateSheet
          campaignId={pay.campaign_id}
          title={pay.dw_campaigns?.title ?? t("general_fund")}
          initialAmount={pay.amount}
          onClose={() => setPay(null)}
          onDone={load}
        />
      )}
    </div>
  );
}
