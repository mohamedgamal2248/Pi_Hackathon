"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Renders into <body>, so fixed overlays aren't trapped by an animated ancestor's stacking context.
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need the DOM, which exists only after mount
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
