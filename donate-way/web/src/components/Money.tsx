"use client";

import { useCountUp } from "@/lib/client/motion";
import { usePiUsd } from "@/lib/client/prices";
import { fmt, usd } from "@/lib/client/types";

// Pi amount, big; its USD value small and muted next to it (price from OKX).
export function Money({
  value,
  className = "",
  usdClassName = "",
  animate = false,
  showUsd = true,
}: {
  value: number;
  className?: string;
  usdClassName?: string;
  animate?: boolean;
  showUsd?: boolean;
}) {
  const piUsd = usePiUsd();
  const counted = useCountUp(value);
  const shown = animate ? counted : value;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className={`num font-bold ${className}`}>{fmt(shown)} π</span>
      {showUsd && piUsd != null && <span className={`num text-[0.7em] font-normal text-muted ${usdClassName}`}>≈ {usd(value * piUsd)}</span>}
    </span>
  );
}
