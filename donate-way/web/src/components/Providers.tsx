"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/lib/client/cart";
import { LangProvider } from "@/lib/client/i18n";
import { PiProvider } from "@/lib/client/pi";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <PiProvider>
        <CartProvider>{children}</CartProvider>
      </PiProvider>
    </LangProvider>
  );
}
