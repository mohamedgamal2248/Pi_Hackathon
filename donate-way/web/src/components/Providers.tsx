"use client";

import type { ReactNode } from "react";
import { LangProvider } from "@/lib/client/i18n";
import { useEffect } from "react";
import { PiProvider } from "@/lib/client/pi";

function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <PiProvider>
        <RegisterSW />
        {children}
      </PiProvider>
    </LangProvider>
  );
}
