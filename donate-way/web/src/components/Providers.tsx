"use client";

import type { ReactNode } from "react";
import { LangProvider } from "@/lib/client/i18n";
import { PiProvider } from "@/lib/client/pi";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <PiProvider>{children}</PiProvider>
    </LangProvider>
  );
}
