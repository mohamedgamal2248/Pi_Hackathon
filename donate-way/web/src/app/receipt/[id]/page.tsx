"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Money } from "@/components/Money";
import { useLang } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";
import { explorerTx, fmt, openExternal, shareUrl, sharePi } from "@/lib/client/types";

export type PublicDonation = {
  id: string;
  amount: number;
  campaignShare: number;
  platformFee: number;
  donor: string | null;
  message: string | null;
  gift: { type: "gift" | "memorial"; name: string; note: string | null } | null;
  isZakat: boolean;
  txid: string | null;
  at: string;
  items: { amount: number; share: number; campaignId: string | null; title: string | null; cover: string | null; fund: string | null }[];
};

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useLang();
  const { api } = usePi();
  const [d, setD] = useState<PublicDonation | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<{ donation: PublicDonation }>(`/api/donations/${id}`)
      .then((r) => setD(r.donation))
      .catch(() => setMissing(true));
  }, [api, id]);

  if (missing) return <p className="py-20 text-center text-muted">404</p>;
  if (!d) return <div className="card mx-auto h-96 max-w-md animate-pulse" />;

  const when = new Date(d.at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "long", timeStyle: "short" });
  const label = (i: PublicDonation["items"][number]) => i.title ?? (i.fund === "zakat" ? t("to_zakat") : t("to_general"));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <article className="card relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-brand" aria-hidden />
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {t("app_name")}
            <span className="text-brand">.</span>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{t("receipt_title")}</span>
        </div>

        <div className="my-6 text-center">
          <div className="text-4xl text-brand">
            <Money value={d.amount} />
          </div>
          {d.isZakat && <div className="mt-1 text-sm text-brand">{t("zakat_payment")}</div>}
        </div>

        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("receipt_no")}</dt>
            <dd className="num">{d.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("date")}</dt>
            <dd>{when}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t("donor")}</dt>
            <dd>{d.donor ? `@${d.donor}` : t("anonymous_donor")}</dd>
          </div>
          {d.items.map((i, k) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="min-w-0 truncate text-muted">{label(i)}</dt>
              <dd className="num shrink-0">{fmt(i.amount)} π</dd>
            </div>
          ))}
          <div className="border-t border-dashed border-line pt-2.5">
            <div className="flex justify-between">
              <dt className="text-muted">{t("split_campaign")} · 95%</dt>
              <dd className="num font-bold text-brand">{fmt(d.campaignShare, 4)} π</dd>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <dt className="text-muted">{t("split_platform")} · 5%</dt>
              <dd className="num">{fmt(d.platformFee, 4)} π</dd>
            </div>
          </div>
          {d.txid && (
            <div className="border-t border-dashed border-line pt-2.5">
              <dt className="text-muted">{t("tx")}</dt>
              <dd>
                <button className="num block w-full truncate text-start text-xs text-brand underline" dir="ltr" onClick={() => openExternal(explorerTx(d.txid!))}>
                  {d.txid}
                </button>
              </dd>
            </div>
          )}
        </dl>
      </article>

      <div className="no-print grid grid-cols-2 gap-2">
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <Icon name="receipt" size={18} /> {t("print")}
        </button>
        <button className="btn btn-gold" onClick={() => sharePi(t("receipt_title"), `${fmt(d.amount)} π`, shareUrl(d.gift ? `/gift/${d.id}` : `/receipt/${d.id}`))}>
          <Icon name="share" size={18} /> {t("share")}
        </button>
      </div>
      {d.gift && (
        <Link href={`/gift/${d.id}`} className="no-print btn btn-ghost w-full">
          <Icon name="gift" size={18} className="text-gold" /> {t("share_gift")}
        </Link>
      )}
    </div>
  );
}
