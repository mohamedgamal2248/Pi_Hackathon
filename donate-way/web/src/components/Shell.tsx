"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";

const NAV: { href: string; label: TKey; icon: string }[] = [
  { href: "/", label: "home", icon: "🏠" },
  { href: "/zakat", label: "zakat", icon: "🧮" },
  { href: "/start", label: "start_campaign", icon: "➕" },
  { href: "/me", label: "profile", icon: "👤" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { t, toggle, lang } = useLang();
  const { user, signIn, signingIn, ready } = usePi();
  const path = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg text-brand-ink">🤲</span>
          <span className="leading-tight">
            {t("app_name")}
            <span className="block text-xs font-normal text-muted">{t("tagline")}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="chip" aria-label="language">
            {lang === "ar" ? "EN" : "ع"}
          </button>
          {user ? (
            <Link href="/me" className="chip max-w-[9rem] truncate">
              @{user.username}
            </Link>
          ) : (
            <button className="btn btn-primary whitespace-nowrap !px-4 !py-2 text-sm" disabled={!ready || signingIn} onClick={() => signIn().catch(() => undefined)}>
              {signingIn ? t("signing_in") : t("sign_in_short")}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <footer className="px-4 pb-28 text-center text-xs text-muted">
        <div className="mb-1 flex justify-center gap-4">
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
          {user?.isAdmin && <Link href="/admin">{t("admin")}</Link>}
        </div>
        {t("trademark")}
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs ${active ? "font-bold text-brand" : "text-muted"}`}
              >
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
