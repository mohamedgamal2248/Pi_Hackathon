"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Portal } from "@/components/Portal";
import { useLang } from "@/lib/client/i18n";

// Image grid whose photos open full screen inside the app (no navigation away).
export function PhotoGrid({ images, className = "grid grid-cols-3 gap-2" }: { images: string[]; className?: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  return (
    <>
      <div className={className}>
        {images.map((m, i) => (
          <button key={m} onClick={() => setOpen(i)} className="relative aspect-square overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-brand" aria-label={`${t("view_photo")} ${i + 1}`}>
            <Image src={m} alt="" fill sizes="200px" className="object-cover transition duration-300 hover:scale-105" />
          </button>
        ))}
      </div>
      {open !== null && (
        <Portal>
          <div className="fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
            <div className="relative h-full max-h-[85dvh] w-full max-w-3xl">
              <Image src={images[open]} alt="" fill sizes="100vw" className="object-contain" />
            </div>
            <button className="absolute end-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label={t("close")} onClick={() => setOpen(null)}>
              <Icon name="close" />
            </button>
            {images.length > 1 && <span className="num absolute bottom-6 rounded-full bg-white/10 px-3 py-1 text-sm text-white">{open + 1} / {images.length}</span>}
          </div>
        </Portal>
      )}
    </>
  );
}
