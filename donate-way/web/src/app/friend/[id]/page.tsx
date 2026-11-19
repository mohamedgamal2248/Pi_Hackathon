"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DonateSheet } from "@/components/DonateSheet";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { pi, shareUrl, sharePi } from "@/lib/client/types";

type Page = { id: string; campaignId: string; campaignTitle: string; campaignStatus: string; cover: string | null; owner: string; goal: number; message: string | null; raised: number; donors: number };

// A friend's personal fundraising page for a campaign. Gifts made through its link are counted here.
export default function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const { api } = usePi();
  const [d, setD] = useState<{ page: Page; ref: string | null } | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api<{ page: Page; ref: string | null }>(`/api/friend-pages/${id}`).then(setD).catch(() => setMissing(true));
  }, [api, id]);
  useEffect(load, [load]);

  if (missing) return <p className="py-20 text-center text-muted">404</p>;
  if (!d) return <div className="card h-80 animate-pulse" />;
  const p = d.page;
  const pct = Math.min(100, (p.raised / p.goal) * 100);
  const link = shareUrl(`/friend/${p.id}`, d.ref);
  const canGive = p.campaignStatus === "active";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="card overflow-hidden">
        <div className="relative aspect-[16/8] bg-gold-soft">{p.cover && <Image src={p.cover} alt="" fill sizes="(min-width:640px) 576px, 100vw" className="object-cover" priority />}</div>
        <div className="space-y-3 p-5">
          <span className="chip !bg-brand-soft !text-brand">
            <Icon name="link" size={16} /> {t("friend_by", { name: p.owner })}
          </span>
          <h1 className="text-xl font-bold">{p.campaignTitle}</h1>
          {p.message && <p className="text-muted">“{p.message}”</p>}
          <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={p.campaignTitle}>
            <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="num font-bold text-brand">{t("friend_of", { a: pi(p.raised), b: pi(p.goal) })}</span>
            <span className="text-muted">{t("friend_people", { n: p.donors })}</span>
          </div>
          {canGive ? (
            <button className="btn btn-primary w-full text-lg" onClick={() => setOpen(true)}>
              {t("friend_give", { name: p.owner })}
            </button>
          ) : (
            <p className="text-center text-sm text-muted">{t("friend_closed")}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-gold" onClick={() => sharePi(p.campaignTitle, t("friend_text", { title: p.campaignTitle }), link)}>
              <Icon name="share" size={18} /> {t("share")}
            </button>
            <Link href={`/campaigns/${p.campaignId}`} className="btn btn-ghost">
              {t("story")}
            </Link>
          </div>
        </div>
      </section>
      {open && <DonateSheet target={{ kind: "campaign", id: p.campaignId, title: p.campaignTitle }} onClose={() => setOpen(false)} onDone={load} />}
    </div>
  );
}
