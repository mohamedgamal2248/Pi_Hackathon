"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { compressImage } from "@/lib/client/image";
import { useLang } from "@/lib/client/i18n";
import { nt } from "@/lib/client/need-i18n";

type Rect = { x: number; y: number; w: number; h: number }; // in image pixels

// Lets the applicant cover sensitive details (ID number, address, account number) with black boxes
// before the photo leaves the phone. The boxes are burned into the image, so they cannot be removed later.
export function RedactEditor({ file, onDone, onCancel }: { file: File; onDone: (blob: Blob) => void; onCancel: () => void }) {
  const { lang } = useLang();
  const canvas = useRef<HTMLCanvasElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [drag, setDrag] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    createImageBitmap(file).then((b) => {
      if (!alive) return;
      bitmap.current = b;
      setReady(true);
    });
    return () => {
      alive = false;
      bitmap.current?.close();
    };
  }, [file]);

  // Draw the image and the boxes (display size = the canvas element's width).
  useEffect(() => {
    const c = canvas.current;
    const b = bitmap.current;
    if (!c || !b || !ready) return;
    const w = Math.min(b.width, 900);
    const h = Math.round((b.height * w) / b.width);
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(b, 0, 0, w, h);
    ctx.fillStyle = "#000";
    const k = w / b.width;
    for (const r of [...rects, ...(drag ? [drag] : [])]) ctx.fillRect(r.x * k, r.y * k, r.w * k, r.h * k);
  }, [rects, drag, ready]);

  // Pointer position in image pixels.
  const pos = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const box = c.getBoundingClientRect();
    const b = bitmap.current!;
    return { x: ((e.clientX - box.left) / box.width) * b.width, y: ((e.clientY - box.top) / box.height) * b.height };
  };
  const rectOf = (a: { x: number; y: number }, p: { x: number; y: number }): Rect => ({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) });

  async function finish(withBoxes: boolean) {
    const b = bitmap.current;
    if (!b) return;
    setBusy(true);
    try {
      if (!withBoxes || rects.length === 0) return onDone(await compressImage(file));
      const scale = Math.min(1, 1600 / Math.max(b.width, b.height));
      const out = document.createElement("canvas");
      out.width = Math.round(b.width * scale);
      out.height = Math.round(b.height * scale);
      const ctx = out.getContext("2d")!;
      ctx.drawImage(b, 0, 0, out.width, out.height);
      ctx.fillStyle = "#000";
      for (const r of rects) ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/webp", 0.82));
      if (blob) onDone(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div className="fade-in fixed inset-0 z-[80] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={nt(lang, "red_title")}>
        <div className="card flex max-h-[96dvh] w-full max-w-xl flex-col gap-3 overflow-hidden rounded-b-none p-4 sm:rounded-b-3xl">
          <h2 className="font-bold">{nt(lang, "red_title")}</h2>
          <p className="text-sm text-muted">{nt(lang, "red_hint")}</p>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-surface-2">
            {!ready && <div className="h-48 animate-pulse" />}
            <canvas
              ref={canvas}
              className="block w-full touch-none"
              style={{ display: ready ? "block" : "none", cursor: "crosshair" }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                start.current = pos(e);
              }}
              onPointerMove={(e) => start.current && setDrag(rectOf(start.current, pos(e)))}
              onPointerUp={(e) => {
                if (start.current) {
                  const r = rectOf(start.current, pos(e));
                  if (r.w > 8 && r.h > 8) setRects((x) => [...x, r]);
                }
                start.current = null;
                setDrag(null);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" disabled={!rects.length} onClick={() => setRects((x) => x.slice(0, -1))}>
              {nt(lang, "red_undo")}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!rects.length} onClick={() => setRects([])}>
              {nt(lang, "red_clear")}
            </button>
          </div>
          <button type="button" className="btn btn-primary w-full" disabled={busy || !ready || rects.length === 0} onClick={() => finish(true)}>
            {nt(lang, "red_done")}
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost flex-1" disabled={busy || !ready} onClick={() => finish(false)}>
              {nt(lang, "red_asis")}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
              {nt(lang, "red_cancel")}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
