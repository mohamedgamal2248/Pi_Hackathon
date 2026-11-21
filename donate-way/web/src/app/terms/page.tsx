"use client";

import { useLang } from "@/lib/client/i18n";
import { useNeedEnabled } from "@/lib/client/need-types";

export default function Terms() {
  const { lang } = useLang();
  const needOn = useNeedEnabled(); // the need-fund rules are shown only where the feature is live
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
          كل الحملات بتتضاف بمعرفة إدارة سند بعد المراجعة. لو حملة اتلغت أو اتجمع لها أكتر من المطلوب، المبلغ الزيادة بيتحوّل لحملة تانية محتاجة دعم أو لحملة مشابهة.
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
        {needOn && (
          <>
        <h2 className="font-bold">8. صناديق الاحتياج الموثّقة</h2>
        <p>
          رائد عنده حالة علاج أو فاتورة مستشفى أو مصاريف دراسة يقدر يقدّم طلب في سند. شروط الطلب:
        </p>
        <ul className="list-disc space-y-1 ps-5">
          <li>
            <b>رسوم تأكيد المحفظة والجدّية: 1 Pi مرة واحدة لكل طلب، وغير قابلة للاسترداد</b> حتى لو الطلب اترفض أو اتطلب مستندات ومكمّلتش. الرسوم دي بتأكد إن حسابك
            مسجّل بـ Pi ومحفظتك شغالة وإن الطلب جاد، ومش ضمان الموافقة. الموافقة بتعتمد على المستندات الورقية بس، ولو طلبنا مستندات إضافية مش بتدفع الرسوم تاني.
          </li>
          <li>المستندات بتتشاف من فريق المراجعة بس ومش بتظهر للناس. بنرفض أي مستند اتستخدم قبل كده في طلب تاني.</li>
          <li>
            بعد الموافقة بيتفتح صندوق تبرع بمدة اختارها صاحب الحالة (يوم أو أسبوع أو شهر). التبرعات بتتجمع عند سند ومفيهاش خصم، <b>ومفيش استرجاع للمتبرعين</b>.
          </li>
          <li>
            بعد انتهاء المدة بيتحوّل لصاحب الحالة <b>70% من اللي اتجمع</b>، والـ 30% الباقية بتتحوّل بعد ما يرفع إثبات إن الفاتورة أو المصاريف اتسددت، ونعرض الإثبات
            للمتبرعين. التحويل بيكون دايمًا للحساب اللي دفع رسوم التأكيد.
          </li>
          <li>طلب واحد شغال لكل رائد في نفس الوقت. سند ممكن ترفض أي طلب أو توقفه لو في شك في المستندات.</li>
        </ul>
          </>
        )}
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
      <p>All campaigns are added by Sanad&apos;s administrators after review. If a campaign is cancelled or over-funded, the extra goes to another campaign that needs support or a similar campaign.</p>
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
      {needOn && (
        <>
      <h2 className="font-bold">8. Verified-need funds</h2>
      <p>A Pioneer with a treatment, hospital bill or study-fee need can apply on Sanad. The rules:</p>
      <ul className="list-disc space-y-1 ps-5">
        <li>
          <b>Wallet confirmation and seriousness fee: 1 Pi, once per request, non-refundable</b>, even if the request is rejected or you are asked for more documents and do not
          continue. It confirms that your account is signed in with Pi, that your wallet works and that the request is serious. It does not guarantee approval: approval
          depends only on the paper documents, and if we ask for more documents you do not pay again.
        </li>
        <li>Documents are seen only by the review team and are never shown publicly. A document already used on another request is rejected.</li>
        <li>
          After approval a fund opens for the window the applicant chose (one day, one week or one month). Donations are held by Sanad, carry no deduction, and{" "}
          <b>are not refunded to donors</b>.
        </li>
        <li>
          When the window ends, <b>70% of what was collected</b> is paid to the applicant. The remaining 30% is paid after the applicant uploads proof that the bill or
          fees were paid, and that proof is shown to donors. Payouts always go to the account that paid the confirmation fee.
        </li>
        <li>One active request per Pioneer at a time. Sanad may reject or stop any request it doubts.</li>
      </ul>
        </>
      )}
      <p className="text-muted">Pi, Pi Network and the Pi logo are trademarks of the Pi Community Company.</p>
    </article>
  );
}
