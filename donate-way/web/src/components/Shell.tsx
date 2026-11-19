"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";

const NAV: { href: string; label: TKey; icon: IconName }[] = [
  { href: "/", label: "home", icon: "home" },
  { href: "/zakat", label: "zakat", icon: "calc" },
  { href: "/start", label: "start_campaign", icon: "plus" },
  { href: "/me", label: "profile", icon: "user" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { t, toggle, lang } = useLang();
  const { user, signIn, signingIn, ready } = usePi();
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2 text-2xl font-bold" aria-label={t("app_name")}>
            <span>
              {t("app_name")}
              <span className="text-brand">.</span>
            </span>
            <span className="hidden text-xs font-normal text-muted sm:inline">{t("tagline")}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-2.5 text-sm ${isActive(item.href) ? "bg-surface-2 font-bold text-brand" : "text-muted hover:text-ink"}`}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="chip" aria-label={lang === "ar" ? "English" : "العربية"}>
              {lang === "ar" ? "EN" : "ع"}
            </button>
            {user ? (
              <Link href="/me" className="chip max-w-[9rem] truncate">
                @{user.username}
              </Link>
            ) : (
              <button className="btn btn-primary whitespace-nowrap !min-h-10 !px-4 !py-2 text-sm" disabled={!ready || signingIn} onClick={() => signIn().catch(() => undefined)}>
                {signingIn ? t("signing_in") : t("sign_in_short")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-12 lg:pt-8">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-28 text-center text-xs text-muted sm:px-6 lg:pb-8">
        <div className="mb-1 flex justify-center gap-4">
          <Link href="/privacy" className="py-2">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="py-2">
            {t("terms")}
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="py-2">
              {t("admin")}
            </Link>
          )}
        </div>
        {t("trademark")}
      </footer>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden" aria-label="main">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive(item.href) ? "font-bold text-brand" : "text-muted"}`}
            >
              <Icon name={item.icon} />
              {t(item.label)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
