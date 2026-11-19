"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";
import { Confetti } from "@/lib/client/motion";
import { usePi } from "@/lib/client/pi";
import { pi, shareUrl, sharePi } from "@/lib/client/types";
import type { PublicDonation } from "@/app/receipt/[id]/page";

// Shareable gift / in-memory card. The amount is shown only as the campaign it supports.
export default function GiftPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const { api } = usePi();
  const [d, setD] = useState<PublicDonation | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<{ donation: PublicDonation }>(`/api/donations/${id}`)
      .then((r) => (r.donation.gift ? setD(r.donation) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [api, id]);

  if (missing) return <p className="py-20 text-center text-muted">404</p>;
  if (!d?.gift) return <div className="card mx-auto aspect-[4/5] max-w-sm animate-pulse" />;

  const memorial = d.gift.type === "memorial";
  const first = d.items[0];

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <article className={`card relative overflow-hidden p-7 text-center ${memorial ? "" : "border-gold/40"}`}>
        {!memorial && <Confetti />}
        <div className="pointer-events-none absolute -top-24 start-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="pop relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-soft text-gold">
          <Icon name={memorial ? "heart" : "gift"} size={30} />
        </div>
        <h1 className="relative mt-5 text-2xl font-bold leading-snug">{t(memorial ? "gift_card_memorial" : "gift_card_gift", { name: d.gift.name })}</h1>
        {d.gift.note && <p className="relative mt-3 leading-relaxed text-muted">“{d.gift.note}”</p>}
        <div className="relative mt-5 rounded-2xl bg-surface-2 p-4 text-sm">
          <div className="text-muted">{first?.title ?? t("to_general")}</div>
          <div className="num mt-1 text-2xl font-bold text-brand">{pi(d.amount)}</div>
        </div>
        <p className="relative mt-4 text-sm text-muted">{t("gift_card_by", { donor: d.donor ? `@${d.donor}` : t("anonymous_donor") })}</p>
        <div className="relative mt-5 text-lg font-bold">
          {t("app_name")}
          <span className="text-brand">.</span>
        </div>
      </article>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-gold" onClick={() => sharePi(t("app_name"), t(memorial ? "gift_card_memorial" : "gift_card_gift", { name: d.gift!.name }), shareUrl(`/gift/${d.id}`))}>
          <Icon name="share" size={18} /> {t("share")}
        </button>
        <Link href={first?.campaignId ? `/campaigns/${first.campaignId}` : "/"} className="btn btn-primary">
          {t("donate")}
        </Link>
      </div>
    </div>
  );
}
