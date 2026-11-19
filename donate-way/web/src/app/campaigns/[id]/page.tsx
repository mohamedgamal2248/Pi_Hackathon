"use client";

import { Icon } from "@/components/Icon";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Progress, StatusBadge } from "@/components/CampaignCard";
import { DonateSheet } from "@/components/DonateSheet";
import { OrganizerTools } from "@/components/OrganizerTools";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { daysLeft, pi, shareUrl, youtubeEmbed, type CampaignDetail } from "@/lib/client/types";

type Tab = "story" | "transparency" | "donors";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { api, user, signIn } = usePi();
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>("story");
  const [donateOpen, setDonateOpen] = useState(false);

  const load = useCallback(() => {
    api<{ campaign: CampaignDetail }>(`/api/campaigns/${id}`)
      .then((r) => setC(r.campaign))
      .catch(() => setMissing(true));
  }, [api, id]);

   
  useEffect(load, [load, user]);

  async function toggleFollow() {
    if (!c) return;
    if (!user) await signIn();
    const r = await api<{ following: boolean }>(`/api/campaigns/${c.id}/follow`, { method: "POST", body: JSON.stringify({ follow: !c.following }) });
    setC({ ...c, following: r.following });
  }

  function share() {
    if (!c) return;
    const url = shareUrl(`/campaigns/${c.id}`);
    if (window.Pi?.openShareDialog) window.Pi.openShareDialog(c.title, `${c.summary}\n${url}`);
    else navigator.share?.({ title: c.title, text: c.summary, url }).catch(() => undefined);
  }

  if (missing) return <p className="py-20 text-center text-muted">404</p>;
  if (!c) return <div className="card h-96 animate-pulse bg-surface-2" />;

  const left = daysLeft(c.deadline);
  const canDonate = ["active", "funded"].includes(c.status) && (left === null || left > 0);
  const video = youtubeEmbed(c.video_url);
  const proofs = c.updates.filter((u) => u.kind === "proof_of_spend");
  const spent = proofs.reduce((s, u) => s + Number(u.amount_spent ?? 0), 0);
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB");

  return (
    <div className="space-y-5 pb-20 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6 lg:space-y-0 lg:pb-0">
      <div className="card overflow-hidden lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
        <div className="relative aspect-[16/9] max-h-[340px] w-full bg-surface-2">
          {c.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- organizer-provided URLs from any host
            <img src={c.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-muted"><Icon name="heart" size={56} /></div>
          )}
          <div className="absolute start-3 top-3">
            <StatusBadge c={c} />
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="text-xs text-muted">
            {t(`cat_${c.category}` as TKey)} · {c.country}
            {left !== null && ` · ${left > 0 ? `${left} ${t("days_left")}` : t("ended")}`}
          </div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{c.title}</h1>
          <p className="text-muted">{c.summary}</p>
          {c.organizer && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-soft p-3 text-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-brand-ink"><Icon name="check" size={18} /></span>
              <div>
                <div className="font-bold">
                  {c.organizer.org ?? c.organizer.name} <span className="font-normal text-muted">@{c.organizer.username}</span>
                </div>
                <div className="text-xs text-brand">{t("verified_organizer")}</div>
              </div>
            </div>
          )}
          <Progress raised={c.raised} goal={c.goal} />
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <b className="num block text-xl text-brand">{pi(c.raised)}</b>
              <span className="text-muted">
                {t("of_goal")} {pi(c.goal)}
              </span>
            </div>
            <div>
              <b className="num block text-xl">{c.donors}</b>
              <span className="text-muted">{t("donors")}</span>
            </div>
            <div>
              <b className="num block text-xl text-gold">{pi(c.released)}</b>
              <span className="text-muted">{t("released")}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {canDonate && (
              <button className="btn btn-primary hidden flex-1 text-lg lg:flex" onClick={() => setDonateOpen(true)}>
                {t("donate_now")}
              </button>
            )}
            <button className="btn btn-ghost flex-1 lg:flex-none" onClick={toggleFollow} aria-pressed={c.following}>
              <Icon name={c.following ? "bellOn" : "bell"} size={18} className={c.following ? "text-brand" : ""} />
              {c.following ? t("following") : t("follow")}
            </button>
            <button className="btn btn-ghost" onClick={share} aria-label={t("share")}>
              <Icon name="share" size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 lg:col-start-1 lg:row-start-1">
      <div className="flex gap-2">
        {(["story", "transparency", "donors"] as Tab[]).map((k) => (
          <button key={k} className="chip flex-1 justify-center" data-active={tab === k} onClick={() => setTab(k)}>
            {t(k === "donors" ? "donors_list" : k)}
          </button>
        ))}
      </div>

      {tab === "story" && (
        <div className="card space-y-4 p-5">
          <p className="whitespace-pre-line leading-relaxed">{c.story}</p>
          {video && (
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe src={video} className="h-full w-full" allowFullScreen title="video" />
            </div>
          )}
          {!!c.gallery?.length && (
            <div className="grid grid-cols-3 gap-2">
              {c.gallery.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element -- organizer-provided URLs
                <img key={g} src={g} alt="" className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "transparency" && (
        <div className="space-y-4">
          <div className="card grid grid-cols-3 gap-2 p-4 text-center text-sm">
            <div>
              <b className="block text-brand">{pi(c.raised)}</b>
              <span className="text-muted">{t("raised")}</span>
            </div>
            <div>
              <b className="block text-gold">{pi(c.released)}</b>
              <span className="text-muted">{t("released")}</span>
            </div>
            <div>
              <b className="block">{pi(spent)}</b>
              <span className="text-muted">{t("proof_of_spend")}</span>
            </div>
          </div>

          {c.tranches.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-2 font-bold">{t("tranches")}</h3>
              <ul className="space-y-2 text-sm">
                {c.tranches.map((tr) => (
                  <li key={tr.id} className="flex items-center justify-between gap-2">
                    <span>
                      {pi(tr.amount)} · <span className="text-muted">{tr.status}</span>
                    </span>
                    {tr.txid ? (
                      <a className="truncate text-xs text-brand underline" href={`https://blockexplorer.minepi.com/mainnet/transactions/${tr.txid}`} target="_blank" rel="noreferrer">
                        {tr.txid.slice(0, 10)}…
                      </a>
                    ) : (
                      <span className="text-xs text-muted">{date(tr.created_at)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="relative space-y-4 border-s-2 border-line ps-5">
            {c.updates.length === 0 && <p className="text-muted">{t("no_updates")}</p>}
            {c.updates.map((u) => (
              <li key={u.id} className="relative">
                <span className={`absolute -start-[29px] top-1 h-4 w-4 rounded-full border-2 border-bg ${u.kind === "proof_of_spend" ? "bg-gold" : "bg-brand"}`} />
                <div className="card space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className={u.kind === "proof_of_spend" ? "font-bold text-gold" : ""}>
                      {u.kind === "proof_of_spend" ? t("proof_of_spend") : t("update")}
                    </span>
                    <span>{date(u.created_at)}</span>
                  </div>
                  <h4 className="font-bold">{u.title}</h4>
                  <p className="whitespace-pre-line text-sm">{u.body}</p>
                  {u.amount_spent != null && <p className="text-sm font-bold text-gold">{pi(Number(u.amount_spent))}</p>}
                  {u.media.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {u.media.map((m) => (
                        <a key={m} href={m} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- receipts hosted anywhere */}
                          <img src={m} alt="" className="aspect-square w-full rounded-lg object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "donors" && (
        <div className="card divide-y divide-line">
          {c.recentDonors.length === 0 && <p className="p-5 text-center text-muted">{t("no_donors")}</p>}
          {c.recentDonors.map((d, i) => (
            <div key={i} className="p-4 text-sm">
              <div className="flex justify-between">
                <b>{d.name ? `@${d.name}` : t("anonymous_donor")}</b>
                <span className="font-bold text-brand">{pi(d.amount)}</span>
              </div>
              {d.message && <p className="mt-1 text-muted">“{d.message}”</p>}
            </div>
          ))}
        </div>
      )}

      {c.isOwner && <OrganizerTools campaign={c} onChange={load} />}

      </div>

      {canDonate && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-20 px-4 lg:hidden">
          <button className="btn btn-primary w-full text-lg shadow-[0_8px_30px_rgba(0,0,0,0.45)]" onClick={() => setDonateOpen(true)}>
            {t("donate_now")}
          </button>
        </div>
      )}

      {donateOpen && <DonateSheet campaignId={c.id} title={c.title} onClose={() => setDonateOpen(false)} onDone={load} />}
    </div>
  );
}
