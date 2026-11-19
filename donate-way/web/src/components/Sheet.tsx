"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Portal } from "@/components/Portal";
import { useLang } from "@/lib/client/i18n";

// Bottom sheet on phones, centered dialog on larger screens. Slides up; Esc and backdrop close it.
export function Sheet({ title, onClose, children }: { title?: ReactNode; onClose: () => void; children: ReactNode }) {
  const { t } = useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet card safe-bottom relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[20px]" role="dialog" aria-modal="true">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-bold leading-snug">{title}</h3>
          <button onClick={onClose} className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={t("close")}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
    </Portal>
  );
}
