"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Portal } from "@/components/Portal";
import { useLang } from "@/lib/client/i18n";

export type ViewerDoc = { id: string; url: string; label?: string };

// Thumbnails that open in a full-screen card with a close button (also Esc / tap outside), next/previous
// and tap-to-zoom. Plain <img>: these are short-lived signed links to private storage and must not
// go through the image cache. Nothing navigates away from the app.
export function DocViewer({ docs, className = "grid grid-cols-3 gap-2 sm:grid-cols-4" }: { docs: ViewerDoc[]; className?: string }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = () => {
    setOpen(null);
    setZoom(false);
    opener.current?.focus();
  };
  const go = (d: number) => {
    setZoom(false);
    setOpen((i) => (i === null ? i : (i + d + docs.length) % docs.length));
  };

  useEffect(() => {
    if (open === null) return;
    const focusTimer = setTimeout(() => closeBtn.current?.focus(), 0); // after the portal has mounted
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only use stable setters and the docs length
  }, [open, docs.length]);

  const current = open === null ? null : docs[open];
  return (
    <>
      <ul className={className}>
        {docs.map((d, i) => (
          <li key={d.id} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
            <button
              type="button"
              className="h-full w-full focus-visible:outline-2 focus-visible:outline-brand"
              aria-label={`${t("view_photo")} ${i + 1}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img src={d.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              {d.label && <span className="absolute bottom-1 start-1 rounded bg-bg/80 px-1 text-[10px]">{d.label}</span>}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <Portal>
          <div
            className="fade-in fixed inset-0 z-[70] flex flex-col bg-black/90 p-3"
            role="dialog"
            aria-modal="true"
            aria-label={`${t("view_photo")} ${open! + 1} / ${docs.length}`}
            onClick={close}
          >
            <div className="flex items-center justify-between gap-2 pb-2 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="num rounded-full bg-white/10 px-3 py-1 text-sm">
                {open! + 1} / {docs.length}
                {current.label ? ` · ${current.label}` : ""}
              </span>
              <button ref={closeBtn} type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white" aria-label={t("close")} onClick={close}>
                <Icon name="close" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-auto rounded-2xl bg-black/40" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
              <img
                src={current.url}
                alt={`${t("view_photo")} ${open! + 1}`}
                onClick={() => setZoom((z) => !z)}
                className={zoom ? "max-w-none cursor-zoom-out" : "mx-auto h-full max-h-full w-full cursor-zoom-in object-contain"}
                style={zoom ? { width: "220%" } : undefined}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
              {docs.length > 1 ? (
                <button type="button" className="btn btn-ghost !bg-white/10 text-white" onClick={() => go(-1)} aria-label={lang === "ar" ? "السابق" : "Previous"}>
                  <Icon name="back" size={18} className={lang === "ar" ? "" : "rotate-180"} />
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="btn btn-ghost !bg-white/10 text-white" onClick={() => setZoom((z) => !z)}>
                {zoom ? (lang === "ar" ? "تصغير" : "Zoom out") : lang === "ar" ? "تكبير" : "Zoom in"}
              </button>
              {docs.length > 1 ? (
                <button type="button" className="btn btn-ghost !bg-white/10 text-white" onClick={() => go(1)} aria-label={lang === "ar" ? "التالي" : "Next"}>
                  <Icon name="back" size={18} className={lang === "ar" ? "rotate-180" : ""} />
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
