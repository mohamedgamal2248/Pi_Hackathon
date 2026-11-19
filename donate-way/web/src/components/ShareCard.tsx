"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { drawCard, type CardSpec } from "@/lib/client/card";
import { useLang } from "@/lib/client/i18n";
import { sharePi } from "@/lib/client/types";

// Button that renders an impact card to an image, previews it, and shares / saves it.
export function ShareCard({ spec, shareText, shareLink, className = "btn btn-gold" }: { spec: () => CardSpec; shareText: string; shareLink: string; className?: string }) {
  const { t } = useLang();
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const blob = await drawCard(spec());
      setImg({ url: URL.createObjectURL(blob), blob });
    } catch {
      sharePi(t("app_name"), shareText, shareLink);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (img) URL.revokeObjectURL(img.url);
    setImg(null);
  }
  async function share() {
    if (!img) return;
    const file = new File([img.blob], "sanad.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `${shareText}\n${shareLink}` });
        return;
      } catch {
        /* cancelled */
      }
    }
    sharePi(t("app_name"), shareText, shareLink);
  }
  function save() {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img.url;
    a.download = "sanad.png";
    a.click();
  }

  return (
    <>
      <button className={className} onClick={open} disabled={busy}>
        <Icon name="share" size={18} /> {t("share_card")}
      </button>
      {img && (
        <Sheet title={t("share_card")} onClose={close}>
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={img.url} alt="" className="mx-auto max-h-[60dvh] w-auto rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-primary" onClick={share}>
                <Icon name="share" size={18} /> {t("share")}
              </button>
              <button className="btn btn-ghost" onClick={save}>
                <Icon name="receipt" size={18} /> PNG
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
