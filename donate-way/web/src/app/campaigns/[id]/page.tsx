"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Cover, Progress, StatusBadge } from "@/components/CampaignCard";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { MonthlySadaqa } from "@/components/MonthlySadaqa";
import { Portal } from "@/components/Portal";
import { useCart } from "@/lib/client/cart";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { daysLeft, fmt, pi, shareUrl, sharePi, youtubeEmbed, type CampaignDetail } from "@/lib/client/types";

type Tab = "story" | "proof" | "donors";

function CampaignView() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { t, lang } = useLang();
  const { api, user, signIn } = usePi();
  const cart = useCart();
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>(search.get("tab") === "proof" ? "proof" : "story");
  const [donateOpen, setDonateOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [myRef, setMyRef] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ campaign: CampaignDetail }>(`/api/campaigns/${id}`)
      .then((r) => setC(r.campaign))
      .catch(() => setMissing(true));
  }, [api, id]);

   
  useEffect(load, [load, user]);

  useEffect(() => {
    if (user) api<{ referralCode: string | null }>("/api/me").then((m) => setMyRef(m.referralCode)).catch(() => undefined);
  }, [api, user]);

  async function toggleFollow() {
    if (!c) return;
    if (!user && !(await signIn())) return;
    const r = await api<{ following: boolean }>(`/api/campaigns/${c.id}/follow`, { method: "POST", body: JSON.stringify({ follow: !c.following }) });
    setC({ ...c, following: r.following });
  }

  function addToCart() {
    if (!c) return;
    cart.add({ campaignId: c.id, title: c.title, amount: c.impact_units[0]?.amount ?? 5 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  if (missing) return <p className="py-20 text-center text-muted">404</p>;
  if (!c) return <div className="card h-96 animate-pulse" />;

  const left = daysLeft(c.deadline);
  const canDonate = ["active", "funded"].includes(c.status) && (left === null || left > 0);
  const video = youtubeEmbed(c.video_url);
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const remaining = Math.max(0, c.goal - c.raised);

  return (
    <div className="space-y-5 pb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6 lg:space-y-0 lg:pb-0">
      <aside className="card overflow-hidden lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
        <div className="relative">
          <Cover src={c.cover_url} sizes="(min-width:1024px) 400px, 100vw" priority className="aspect-[16/10] max-h-[340px] w-full" />
          <div className="absolute start-3 top-3 flex gap-1.5">
            <StatusBadge c={c} />
            {c.zakat_eligible && <span className="rounded-full bg-bg/80 px-2.5 py-1 text-xs font-bold text-brand backdrop-blur">{t("zakat_ok")}</span>}
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="text-xs text-muted">
            {t(`cat_${c.category}` as TKey)} · {c.country}
            {left !== null && ` · ${left > 0 ? `${left} ${t("days_left")}` : t("ended")}`}
          </div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{c.title}</h1>
          {c.summary && <p className="text-muted">{c.summary}</p>}
          <Progress raised={c.raised} goal={c.goal} className="h-3" />
          <div>
            <div className="text-2xl text-brand">
              <Money value={c.raised} animate />
            </div>
            <div className="text-sm text-muted">
              {t("of_goal")} {pi(c.goal)} · {c.donors} {t("donors")}
              {c.status === "active" && ` · ${t("remaining", { amount: pi(remaining) })}`}
            </div>
          </div>
          {c.released > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-gold-soft px-3 py-2 text-sm text-gold">
              <Icon name="receipt" size={18} /> <b className="num">{pi(c.released)}</b> {t("released")}
            </div>
          )}
          <div className="flex gap-2">
            {canDonate && (
              <button className="btn btn-primary hidden flex-1 text-lg lg:flex" onClick={() => setDonateOpen(true)}>
                {t("donate_now")}
              </button>
            )}
            <button className="btn btn-ghost flex-1 lg:flex-none" onClick={addToCart} disabled={!canDonate} aria-label={t("add_to_cart")} title={t("add_to_cart")}>
              <Icon name={added ? "check" : "cart"} size={18} className={added ? "text-brand" : ""} />
              <span className="lg:hidden">{added ? t("added") : t("add_to_cart")}</span>
            </button>
            <button className="btn btn-ghost" onClick={toggleFollow} aria-pressed={c.following} aria-label={c.following ? t("following") : t("follow")}>
              <Icon name={c.following ? "bellOn" : "bell"} size={18} className={c.following ? "text-brand" : ""} />
            </button>
            <button className="btn btn-ghost" onClick={() => sharePi(c.title, c.summary ?? "", shareUrl(`/campaigns/${c.id}`, myRef))} aria-label={t("share")}>
              <Icon name="share" size={18} />
            </button>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <Icon name="shield" size={16} className="mt-0.5 shrink-0" /> {t("how_2_b")} {t("policy_note")}
          </p>
        </div>
      </aside>

      <div className="space-y-5 lg:col-start-1 lg:row-start-1">
        {c.impact_units.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-3 font-bold">{t("impact_units_title")}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {c.impact_units.map((u) => (
                <button key={u.label} disabled={!canDonate} onClick={() => setDonateOpen(true)} className="rounded-2xl bg-surface-2 p-3 text-start transition hover:ring-1 hover:ring-brand">
                  <div className="num text-lg font-bold text-brand">{fmt(u.amount)} π</div>
                  <div className="text-sm text-muted">= {u.label}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-1 rounded-full bg-surface p-1" role="tablist">
          {(["story", "proof", "donors"] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className="chip flex-1 justify-center !bg-transparent data-[active=true]:!bg-brand" data-active={tab === k} onClick={() => setTab(k)}>
              {t(k === "donors" ? "donors_list" : k === "proof" ? "proofs" : "story")}
              {k === "proof" && c.updates.length > 0 && <span className="num ms-1 text-xs opacity-70">{c.updates.length}</span>}
            </button>
          ))}
        </div>

        {tab === "story" && (
          <div className="card fade-in space-y-4 p-5">
            <p className="whitespace-pre-line leading-loose">{c.story}</p>
            {video && (
              <div className="aspect-video overflow-hidden rounded-2xl">
                <iframe src={video} className="h-full w-full" allowFullScreen title="video" loading="lazy" />
              </div>
            )}
            {!!c.gallery?.length && (
              <div className="grid grid-cols-3 gap-2">
                {c.gallery.map((g) => (
                  <div key={g} className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={g} alt="" fill sizes="200px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "proof" && (
          <ol className="fade-in relative space-y-4 border-s-2 border-line ps-5">
            {c.updates.length === 0 && <p className="text-muted">{t("no_updates")}</p>}
            {c.updates.map((u) => (
              <li key={u.id} className="relative">
                <span className={`absolute -start-[29px] top-4 h-4 w-4 rounded-full border-4 border-bg ${u.kind === "proof_of_spend" ? "bg-gold" : "bg-brand"}`} />
                <div className="card space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className={u.kind === "proof_of_spend" ? "font-bold text-gold" : ""}>{u.kind === "proof_of_spend" ? t("proof_of_spend") : t("update")}</span>
                    <span>{date(u.created_at)}</span>
                  </div>
                  <h3 className="font-bold">{u.title}</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{u.body}</p>
                  {u.amount_spent != null && (
                    <p className="text-sm text-gold">
                      {t("spent")}: <b className="num">{pi(u.amount_spent)}</b>
                    </p>
                  )}
                  {u.media.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {u.media.map((m) => (
                        <a key={m} href={m} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-xl">
                          <Image src={m} alt="" fill sizes="200px" className="object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === "donors" && (
          <div className="card fade-in divide-y divide-line">
            {c.recentDonors.length === 0 && <p className="p-5 text-center text-muted">{t("no_donors")}</p>}
            {c.recentDonors.map((d, i) => (
              <div key={i} className="p-4 text-sm">
                <div className="flex justify-between">
                  <b>{d.name ? `@${d.name}` : t("anonymous_donor")}</b>
                  <span className="num font-bold text-brand">{pi(d.amount)}</span>
                </div>
                {d.message && <p className="mt-1 text-muted">“{d.message}”</p>}
              </div>
            ))}
          </div>
        )}

        <MonthlySadaqa campaigns={[{ id: c.id, title: c.title }]} defaultId={c.id} />
      </div>

      {canDonate && (
        <Portal>
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-20 px-4 lg:hidden">
          <button className="btn btn-primary w-full text-lg shadow-[0_8px_30px_rgba(0,0,0,0.45)]" onClick={() => setDonateOpen(true)}>
            {t("donate_now")}
          </button>
        </div>
        </Portal>
      )}

      {donateOpen && <DonateSheet target={{ kind: "campaign", id: c.id, title: c.title, impactUnits: c.impact_units }} onClose={() => setDonateOpen(false)} onDone={load} />}
    </div>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse" />}>
      <CampaignView />
    </Suspense>
  );
}
