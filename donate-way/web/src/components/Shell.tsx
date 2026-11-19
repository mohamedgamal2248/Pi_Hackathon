"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isStagingHost } from "@/lib/client/types";
import { DonateSheet } from "@/components/DonateSheet";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { useLang, type TKey } from "@/lib/client/i18n";
import { usePi } from "@/lib/client/pi";

const NAV: { href: string; label: TKey; icon: IconName }[] = [
  { href: "/", label: "home", icon: "home" },
  { href: "/zakat", label: "zakat", icon: "calc" },
  { href: "/me", label: "impact", icon: "award" },
  { href: "/transparency", label: "transparency", icon: "eye" },
];

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-full bg-surface-2 p-1 text-xs font-bold" role="group" aria-label="Language">
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`min-h-8 min-w-9 rounded-full px-2.5 transition-colors ${lang === l ? "bg-brand text-brand-ink" : "text-muted hover:text-ink"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const { user, signIn, signingIn, ready } = usePi();
  const path = usePathname();
  const [quick, setQuick] = useState(false);
  const [staging, setStaging] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hostname is only known in the browser
  useEffect(() => setStaging(isStagingHost()), []);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const mobileNav = [NAV[0], NAV[1], null, NAV[2], NAV[3]];

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-xl bg-brand px-4 py-2 font-bold text-brand-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t("skip_to_content")}
      </a>
      {staging && (
        <div className="bg-gold px-4 py-1 text-center text-xs font-bold text-brand-ink" role="status">
          TESTNET · Sanad Staging · Test-Pi only
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold" aria-label={t("app_name")}>
            <Logo size={30} />
            <span>
              {t("app_name")}
              <span className="text-brand">.</span>
            </span>
            <span className="hidden text-xs font-normal text-muted md:inline">{t("tagline")}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-4 py-2.5 text-sm transition-colors ${isActive(item.href) ? "bg-surface-2 font-bold text-brand" : "text-muted hover:text-ink"}`}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LangToggle />
            {user ? (
              <Link href="/me" dir="ltr" className="chip hidden max-w-[10rem] truncate sm:inline-flex">
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

      <main id="main" tabIndex={-1} key={path} className="page-in mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-4 sm:px-6 lg:pb-12 lg:pt-8">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-32 text-center text-xs text-muted sm:px-6 lg:pb-8">
        <div className="mb-1 flex flex-wrap justify-center gap-x-4">
          <Link href="/transparency" className="py-2">
            {t("transparency")}
          </Link>
          <Link href="/why" className="py-2">
            {t("why")}
          </Link>
          <Link href="/season" className="py-2">
            {t("season")}
          </Link>
          <Link href="/jariya" className="py-2">
            {t("jariya")}
          </Link>
          <Link href="/leaderboard" className="py-2">
            {t("leaderboard")}
          </Link>
          <Link href="/terms" className="py-2">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="py-2">
            {t("privacy")}
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="py-2 text-brand">
              {t("admin")}
            </Link>
          )}
        </div>
        {t("trademark")}
      </footer>

      {/* Phone / tablet bottom bar with a raised donate button in the middle */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden" aria-label="main">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {mobileNav.map((item) =>
            item ? (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${isActive(item.href) ? "font-bold text-brand" : "text-muted"}`}
              >
                <Icon name={item.icon} />
                {t(item.label)}
              </Link>
            ) : (
              <div key="donate" className="flex justify-center">
                <button
                  onClick={() => setQuick(true)}
                  className="-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_6px_24px_rgba(198,244,50,0.35)] transition active:scale-95"
                  aria-label={t("donate")}
                >
                  <Icon name="heart" size={24} />
                </button>
              </div>
            )
          )}
        </div>
      </nav>

      {quick && <DonateSheet target={{ kind: "fund", fund: "general", title: t("to_general") }} onClose={() => setQuick(false)} />}
    </div>
  );
}
