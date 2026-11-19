"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { useLang } from "@/lib/client/i18n";

const C = {
  ar: {
    title: "ليه سند؟",
    lead: "سند هو أسهل طريق لعطاء موثّق بـ Pi: كل تبرع بـ Pi بيتوثّق، وكل صرف عليه إثبات.",
    rows: [
      { i: "wallet", t: "منفعة حقيقية لـ Pi", b: "Pi بتتحول لصدقة وزكاة بدل ما تفضل في المحفظة. الزكاة بتتحسب تلقائيًا من رصيد المحفظة وسعر Pi وسعر الذهب (النصاب 85 جرام)." },
      { i: "eye", t: "شفافية كاملة", b: "الإيصال علني على البلوكشين، وكل حملة فيها خط زمني وإثباتات صرف بالصور والمبلغ، وصفحة شفافية بأرقام التطبيق." },
      { i: "shield", t: "أمان وأقل بيانات", b: "دخول بـ Pi فقط، ودفع بـ Pi فقط. بنحفظ الاسم والمعرّف وعنوان المحفظة العام. وتقدر تمسح بياناتك بضغطة." },
      { i: "flame", t: "ناس بترجع", b: "سلسلة عطاء يومية، وجمعة الخير ورمضان، وصدقة جارية بتفكّرك كل سنة، وتحديات جماعية ومضاعفة تبرعات من رعاة." },
      { i: "award", t: "جاهز لمستقبل Pi", b: "نقاط العطاء (GIVE_POINTS) بتتسجل في دفتر منفصل جاهز يتحوّل لعملة النظام لما تتاح، من غير ما نغيّر في التطبيق. والصدقة الشهرية جاهزة وبتنتظر اشتراكات Mainnet." },
      { i: "heart", t: "للجميع", b: "عربي وإنجليزي بنص الحملة نفسه، وبيشتغل على الموبايل والتابلت، وبيدعم قارئات الشاشة وتقليل الحركة." },
    ],
    cta: "ابدأ التبرع",
  },
  en: {
    title: "Why Sanad?",
    lead: "Sanad is the simplest way to give with Pi, verified: every gift is recorded and every spend comes with proof.",
    rows: [
      { i: "wallet", t: "Real utility for Pi", b: "Pi becomes charity and zakat instead of sitting idle. Zakat is calculated automatically from your wallet balance, the Pi price and the gold price (nisab: 85 g)." },
      { i: "eye", t: "Full transparency", b: "Receipts are public on the blockchain, every campaign has a timeline with proof of spending (photos and amounts), and a transparency page with app-wide numbers." },
      { i: "shield", t: "Safe, minimal data", b: "Pi sign-in and Pi payments only. We keep your username, ID and public wallet address, and you can delete your data in one tap." },
      { i: "flame", t: "People come back", b: "Daily giving streaks, Friday of Giving and Ramadan, Sadaqa Jariya with a yearly reminder, community challenges and sponsor donation matching." },
      { i: "award", t: "Ready for Pi's future", b: "Giving points (GIVE_POINTS) live in a separate ledger that can convert to an ecosystem token when available, with no app changes. Monthly sadaqa is built and waits for Mainnet subscriptions." },
      { i: "heart", t: "For everyone", b: "Arabic and English down to the campaign text, works on phones and tablets, and supports screen readers and reduced motion." },
    ],
    cta: "Start giving",
  },
} as const;

// A one-page summary for reviewers: how Sanad maps to the judging criteria.
export default function WhyPage() {
  const { lang } = useLang();
  const c = C[lang];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card space-y-2 p-6">
        <h1 className="text-2xl font-bold">{c.title}</h1>
        <p className="text-muted">{c.lead}</p>
      </section>
      <ul className="space-y-3">
        {c.rows.map((r) => (
          <li key={r.t} className="card flex gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-brand">
              <Icon name={r.i as IconName} size={22} />
            </span>
            <div>
              <h2 className="font-bold">{r.t}</h2>
              <p className="text-sm text-muted">{r.b}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/" className="btn btn-primary w-full">
        {c.cta}
      </Link>
    </div>
  );
}
