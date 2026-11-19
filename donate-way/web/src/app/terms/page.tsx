"use client";

import { useLang } from "@/lib/client/i18n";

export default function Terms() {
  const { lang } = useLang();
  if (lang === "ar")
    return (
      <article className="card mx-auto max-w-3xl space-y-4 p-6 text-sm leading-loose">
        <h1 className="text-xl font-bold">الشروط والأحكام</h1>
        <p className="text-muted">آخر تحديث: نوفمبر 2026</p>
        <h2 className="font-bold">1. توزيع التبرعات (95% / 5%)</h2>
        <p>
          <b>كل تبرع بيتقسم كالتالي: 95% بيروح للحملة أو الصندوق اللي اخترته، و5% بتروح لسند عشان تشغيل المنصة</b> (السيرفرات، والمراجعة، والدعم، ورسوم الشبكة).
          التقسيم ده بيظهر لك قبل الدفع، وفي الإيصال، وفي صفحة الشفافية.
        </p>
        <h2 className="font-bold">2. التبرعات</h2>
        <p>
          التبرعات بتتم بالـ Pi من محفظة Pi، وبتبقى نهائية بعد تأكيدها على البلوكتشين. سند بيستلم التبرع في محفظة التطبيق ويصرفه على الحملة، وبينشر صور وفواتير الصرف
          في صفحة الحملة.
        </p>
        <h2 className="font-bold">3. الحملات</h2>
        <p>
          كل الحملات بتتضاف بمعرفة إدارة سند بعد المراجعة. لو حملة اتلغت أو اتجمع لها أكتر من المطلوب، المبلغ الزيادة بيتحوّل للحملات الأكثر احتياجًا أو لحملة مشابهة.
        </p>
        <h2 className="font-bold">4. الزكاة</h2>
        <p>
          حاسبة الزكاة إرشادية: بتقرا رصيد محفظتك من البلوكتشين وأسعار Pi والذهب من OKX، وبتعتبر النصاب 85 جرام ذهب ونسبة 2.5%. استشر عالم في حالتك. تبرعات الزكاة بتروح
          لصندوق الزكاة أو لحملات عليها علامة &quot;يصلح للزكاة&quot;.
        </p>
        <h2 className="font-bold">5. الصدقة الشهرية</h2>
        <p>الميزة مش متاحة دلوقتي، ومفيش أي مبلغ بيتسحب من خلالها لحد ما اشتراكات Pi تنزل على Mainnet ونفعّلها.</p>
        <h2 className="font-bold">6. نقاط العطاء</h2>
        <p>النقاط مالهاش قيمة نقدية. لو اتطلق توكن سند، ممكن النقاط تتحوّل له بقواعد هتتعلن ساعتها.</p>
        <h2 className="font-bold">7. المسؤولية</h2>
        <p>سند تطبيق مجتمعي ومش من تطوير فريق Pi الأساسي. بنراجع كل حملة وبننشر إثباتات الصرف، لكن مش بنضمن نتيجة أي حملة.</p>
        <p className="text-muted">Pi و Pi Network وشعار Pi علامات تجارية لـ Pi Community Company.</p>
      </article>
    );
  return (
    <article className="card mx-auto max-w-3xl space-y-4 p-6 text-sm leading-relaxed" dir="ltr">
      <h1 className="text-xl font-bold">Terms of Service</h1>
      <p className="text-muted">Last updated: November 2026</p>
      <h2 className="font-bold">1. How donations are split (95% / 5%)</h2>
      <p>
        <b>Every donation is split: 95% goes to the campaign or fund you chose, and 5% goes to Sanad to run the platform</b> (servers, vetting, support and network
        fees). The split is shown before you pay, on your receipt, and on the Transparency page.
      </p>
      <h2 className="font-bold">2. Donations</h2>
      <p>
        Donations are made in Pi from the Pi Wallet and are final once confirmed on the blockchain. Sanad receives them in the app wallet, spends them on the campaign, and
        publishes photos and receipts of the spending on the campaign page.
      </p>
      <h2 className="font-bold">3. Campaigns</h2>
      <p>All campaigns are added by Sanad&apos;s administrators after review. If a campaign is cancelled or over-funded, the extra goes to the most in need or a similar campaign.</p>
      <h2 className="font-bold">4. Zakat</h2>
      <p>
        The zakat calculator is guidance only: it reads your wallet balance from the blockchain and Pi and gold prices from OKX, and uses a nisab of 85 g of gold and a
        2.5% rate. Ask a scholar about your case. Zakat gifts go to the zakat fund or campaigns marked zakat eligible.
      </p>
      <h2 className="font-bold">5. Monthly sadaqa</h2>
      <p>Not available yet. Nothing is charged through it until Pi subscriptions reach Mainnet and we enable it.</p>
      <h2 className="font-bold">6. Giving points</h2>
      <p>Points have no cash value. If a Sanad token is launched, points may be converted under rules published at that time.</p>
      <h2 className="font-bold">7. Liability</h2>
      <p>Sanad is a community app, not developed by the Pi Core Team. We vet every campaign and publish proof of spending, but cannot guarantee the outcome of any campaign.</p>
      <p className="text-muted">Pi, Pi Network and the Pi logo are trademarks of the Pi Community Company.</p>
    </article>
  );
}
