"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { MonthlySadaqa } from "@/components/MonthlySadaqa";
import { useLang, type TKey } from "@/lib/client/i18n";
import { nt } from "@/lib/client/need-i18n";
import { useNeedEnabled } from "@/lib/client/need-types";
import { useCountUp } from "@/lib/client/motion";
import { usePi } from "@/lib/client/pi";
import { pi, shareUrl, sharePi, type Campaign } from "@/lib/client/types";

type Me = {
  username: string;
  total: number;
  thisYear: number;
  count: number;
  campaignsHelped: number;
  zakatPaid: number;
  gifts: number;
  points: number;
  streak: { weeks: number; givenThisWeek: boolean };
  daily: { days: number; best: number; givenToday: boolean };
  referralCode: string | null;
  referrals: { count: number; total: number };
  hasWallet: boolean;
  hawlStart: string | null;
  donations: {
    id: string;
    amount: number;
    campaign_id: string | null;
    fund: string | null;
    is_zakat: boolean;
    gift: { type: string; name: string } | null;
    completed_at: string;
    dw_campaigns: { title: string } | null;
  }[];
};

function badges(me: Me): TKey[] {
  const b: TKey[] = [];
  if (me.count >= 1) b.push("b_first");
  if (me.count >= 5) b.push("b_regular");
  if (me.count >= 20) b.push("b_pillar");
  if (me.total >= 100) b.push("b_hundred");
  if (me.campaignsHelped >= 5) b.push("b_wide");
  if (me.zakatPaid > 0) b.push("b_zakat");
  if (me.gifts > 0) b.push("b_gift");
  if (me.streak.weeks >= 4) b.push("b_streak");
  if (me.referrals.count > 0) b.push("b_ambassador");
  return b;
}

export default function MePage() {
  const { t, lang } = useLang();
  const { api, user, signIn, ready, signOut } = usePi();
  const router = useRouter();
  const needOn = useNeedEnabled();
  const [me, setMe] = useState<Me | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [copied, setCopied] = useState(false);
  const [pages, setPages] = useState<{ id: string; campaignTitle: string; raised: number; goal: number }[]>([]);
  const points = useCountUp(me?.points ?? 0);

  const load = useCallback(() => {
    if (user) api<Me>("/api/me").then(setMe).catch(() => undefined);
  }, [api, user]);
   
  useEffect(load, [load]);
  useEffect(() => {
    if (user) api<{ pages: typeof pages }>("/api/friend-pages").then((r) => setPages(r.pages)).catch(() => undefined);
  }, [api, user]);
  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/campaigns").then((r) => setCampaigns(r.campaigns.filter((c) => c.status === "active"))).catch(() => undefined);
  }, [api]);

  if (!user)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-8 text-center">
        <Icon name="award" size={40} className="mx-auto text-brand" />
        <p className="text-muted">{t("sign_in_to_see")}</p>
        <button className="btn btn-primary" disabled={!ready} onClick={() => signIn().catch(() => undefined)}>
          {t("sign_in")}
        </button>
      </div>
    );
  if (!me) return <div className="card h-80 animate-pulse" />;

  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const link = me.referralCode ? shareUrl("/", me.referralCode) : null;
  const target = (d: Me["donations"][number]) => d.dw_campaigns?.title ?? (d.fund === "zakat" ? t("to_zakat") : d.fund === "general" ? t("to_general") : t("to_cart"));

  return (
    <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0 [&>section]:h-full">
      {/* Totals */}
      <section className="card space-y-4 p-5 lg:col-span-2">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-2xl font-bold text-brand-ink">{me.username[0]?.toUpperCase()}</div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">@{me.username}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {badges(me).map((b) => (
                <span key={b} className="pop rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-gold">
                  {t(b)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{t("my_total")}</div>
            <div className="text-xl text-brand">
              <Money value={me.total} animate />
            </div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{t("this_year")}</div>
            <div className="text-xl">
              <Money value={me.thisYear} showUsd={false} />
            </div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{t("campaigns_helped")}</div>
            <div className="num text-xl font-bold">{me.campaignsHelped}</div>
          </div>
          <div className="rounded-2xl bg-gold-soft p-3">
            <div className="text-xs text-muted">{t("points")}</div>
            <div className="num text-xl font-bold text-gold">{Math.floor(points)}</div>
          </div>
        </div>
        <p className="text-xs text-muted">{t("points_note")}</p>
      </section>

      {/* Giving streak (daily + weekly) and day badges */}
      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="flame" className="text-brand" /> {t("streak")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="num text-3xl font-bold text-brand">{me.daily.days}</div>
            <div className="text-xs text-muted">{t("streak_unit_days")}</div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="num text-3xl font-bold">{me.streak.weeks}</div>
            <div className="text-xs text-muted">{t("streak_unit_weeks")}</div>
          </div>
        </div>
        <p className={`text-sm ${me.daily.givenToday ? "text-brand" : "text-muted"}`}>{me.daily.givenToday ? t("daily_done") : t("daily_keep")}</p>
        <p className="text-xs text-muted">{t("streak_best", { n: Math.max(me.daily.best, me.daily.days) })}</p>
        <div className="grid grid-cols-4 gap-2">
          {([3, 7, 30, 100] as const).map((n) => {
            const got = Math.max(me.daily.best, me.daily.days) >= n;
            return (
              <div key={n} className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center ${got ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"}`}>
                <Icon name="award" size={22} />
                <div className="text-[11px] font-bold leading-tight">{t(`badge_${n}` as TKey)}</div>
                <div className="num text-[10px]">{t("badge_locked", { n })}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ambassador */}
      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="link" className="text-gold" /> {t("ambassador_title")}
        </h2>
        <p className="text-sm text-muted">{t("ambassador_body")}</p>
        {link && (
          <div className="flex gap-2">
            <code className="num min-w-0 flex-1 truncate rounded-xl bg-surface-2 px-3 py-3 text-xs" dir="ltr">
              {link}
            </code>
            <button
              className="btn btn-ghost !px-3"
              onClick={() => {
                navigator.clipboard?.writeText(link).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label={t("copy_link")}
            >
              <Icon name={copied ? "check" : "link"} size={18} />
            </button>
            <button className="btn btn-gold !px-3" onClick={() => sharePi(t("app_name"), t("hero_title"), link)} aria-label={t("share")}>
              <Icon name="share" size={18} />
            </button>
          </div>
        )}
        <p className="text-xs text-muted">{t("ambassador_bonus")}</p>
        <p className="text-sm">{t("ambassador_stats", { n: me.referrals.count, amount: pi(me.referrals.total) })}</p>
      </section>

      {pages.length > 0 && (
        <section className="card space-y-2 p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Icon name="link" className="text-brand" /> {t("friend_mine")}
          </h2>
          <ul className="divide-y divide-line text-sm">
            {pages.map((p) => (
              <li key={p.id}>
                <Link href={`/friend/${p.id}`} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 truncate">{p.campaignTitle}</span>
                  <span className="num shrink-0 text-brand">
                    {pi(p.raised)} / {pi(p.goal)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Zakat year */}
      <section className="card space-y-2 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Icon name="clock" className="text-brand" /> {t("hawl_status")}
        </h2>
        {me.hawlStart ? (
          <p className="text-sm">
            {t("zakat_hawl_started", { date: new Date(me.hawlStart).toLocaleDateString(lang === "ar" ? "ar-EG-u-ca-islamic" : "en-GB-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        ) : (
          <p className="text-sm text-muted">—</p>
        )}
        <p className="text-sm text-muted">
          {t("zakat_paid")}: <b className="num text-ink">{pi(me.zakatPaid)}</b>
        </p>
        {needOn && (
          <Link href="/need/mine" className="btn btn-ghost w-full">
            <Icon name="shield" size={18} /> {nt(lang, "mine_link")}
          </Link>
        )}
        <Link href="/zakat" className="btn btn-ghost w-full">
          {t("zakat_title")}
        </Link>
      </section>

      {campaigns.length > 0 && <MonthlySadaqa campaigns={campaigns} />}

      <button
        className="btn btn-ghost w-full text-danger lg:col-span-2"
        onClick={() => {
          signOut();
          router.push("/");
        }}
      >
        {t("sign_out")}
      </button>
      <button
        className="text-center text-xs text-muted underline lg:col-span-2"
        onClick={async () => {
          if (!window.confirm(t("delete_confirm"))) return;
          await api("/api/me", { method: "DELETE" }).catch(() => undefined);
          signOut();
          router.push("/");
        }}
      >
        {t("delete_data")}
      </button>

      {/* History */}
      <section className="card p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("history")}</h2>
          <Link href={`/report/${new Date().getFullYear()}`} className="text-sm text-muted hover:text-ink">
            {t("annual_report")}
          </Link>
        </div>
        {me.donations.length === 0 && <p className="text-muted">—</p>}
        <ul className="divide-y divide-line">
          {me.donations.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate">
                  {d.campaign_id ? <Link href={`/campaigns/${d.campaign_id}`}>{target(d)}</Link> : target(d)}
                  {d.is_zakat && <span className="ms-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">{t("zakat_payment")}</span>}
                  {d.gift && <span className="ms-2 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] text-gold">{d.gift.type === "memorial" ? t("memorial_badge") : t("gift_badge")}</span>}
                </div>
                <div className="text-xs text-muted">{date(d.completed_at)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <b className="num text-brand">{pi(d.amount)}</b>
                <Link href={`/receipt/${d.id}`} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2" aria-label={t("receipt")}>
                  <Icon name="receipt" size={18} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
