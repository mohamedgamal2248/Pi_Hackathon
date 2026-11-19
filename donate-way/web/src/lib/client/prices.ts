"use client";

import { useEffect, useState } from "react";

// Pi/USDT from our /api/prices (OKX, cached on the server). One request per page load.
let piUsd: number | null = null;
let inflight: Promise<number | null> | null = null;

function load() {
  if (!inflight) {
    inflight = fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { piUsd?: number } | null) => (piUsd = j?.piUsd ?? null))
      .catch(() => null);
  }
  return inflight;
}

export function usePiUsd() {
  const [value, setValue] = useState<number | null>(piUsd);
  useEffect(() => {
    if (piUsd != null) return;
    let alive = true;
    load().then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
  }, []);
  return value;
}
