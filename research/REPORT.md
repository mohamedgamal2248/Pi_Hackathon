# بحث: تطبيقات Pi Network، الفائزين في الهاكاثونات، والكود المتاح — تجهيزًا لهاكاثون Pi Next

> تاريخ البحث: 19 نوفمبر 2026 (آخر يوم في Pi Ecosystem Summit، يوم إطلاق Pi Next)

---

## 1. هاكاثون Pi Next (اللي هيتعلن النهاردة)

| البند | المعلومة المتاحة |
|---|---|
| الإطلاق | 19 نوفمبر 2026 — اليوم الثالث والأخير من Pi Ecosystem Summit (17–19 نوفمبر، أونلاين) |
| الجوايز | **200,000 USDT** (أول مرة الجايزة بالـ USDT بدل PI) |
| حوافز إضافية | "App Growth Initiative" بحد أقصى **20 مليون Pi** كدعم تسويقي للتطبيقات |
| الجمهور | مطورين وشركات ناشئة بيبنوا تطبيقات فيها **منفعة حقيقية** |
| الشروط التفصيلية / معايير التحكيم / المسارات | **لسه ما اتنشرتش** وقت كتابة التقرير — هتتعلن مع الافتتاح |

اللي اتعلن في القمة (حسب التغطية الإخبارية، مش من صفحة رسمية):
- **اليوم 1:** أدوات منصة المطورين، Developer web console جديدة، **أدوات MCP للبناء بمساعدة الذكاء الاصطناعي**، دليل تطبيقات (App Directory) متعاد تصميمه، وPi DataLab.
- **اليوم 2:** الذكاء الاصطناعي والتكاملات، وعروض لـ **Pi App Studio** و**SoloHost**.
- **اليوم 3:** إطلاق Pi Next.

### 🔑 أهم اكتشاف من الكود (مش مذكور في الأخبار)
مستودعات `pi-apps/demo` و`pi-apps/pi-nodejs` و`pi-apps/pi-ruby` اتحدّثت **يوم 17 نوفمبر 2026** (أول يوم في القمة) بميزة جديدة:
**اشتراكات عبر Smart Contract على البلوكتشين (Soroban/Stellar)**:

- في الـ Frontend SDK: `Pi.SmartContract.Subscription.subscribe(...)` ، `getMerchantServices(...)` ، `Pi.SmartContract.pollTransaction(hash)` ، `Pi.Wallet.getUserWalletAddresses()` (بـ scope جديد `wallet_address`).
- في الـ Backend (`npm install pi-backend@next`, Node 20+): `SmartContract.Subscription.process(merchantSecret, serviceId, offset, limit)` لتحصيل التجديدات من السيرفر.
- العقد على Testnet: `CCUF75B6...KPFYV`، والخدمة فيها: سعر، مدة الفترة، فترة تجريبية (trial)، تجديد تلقائي.
- الـ demo فيه مثال كامل اسمه **"Pi Bakery Club"** (اشتراك شهري).

**الاستنتاج:** على الأغلب الهاكاثون هيشجع (أو هيكافئ) التطبيقات اللي بتستخدم الأدوات الجديدة: **الاشتراكات، Pi Sign-in (OAuth)، Pi Ad Network، التوكنات، والـ AI/MCP**. ده مجرد استنتاج — استنى الشروط الرسمية.

---

## 2. تاريخ الهاكاثونات والفائزين — وليه كسبوا

### Pi Hackathon 2025 (أول هاكاثون في عصر Open Network)
- الفترة: 15 أغسطس → 15 أكتوبر 2025 — أكتر من **215 تطبيق على Mainnet**. الجوايز: 75K / 45K / 15K PI و5K لكل تنويه شرفي.

| المركز | التطبيق | الفكرة | ليه كسب (من كلام الحكام) |
|---|---|---|---|
| 🥇 1 | **Blind_Lounge** | سوشيال/مواعدة بالخصوصية أولاً، الهوية بتتكشف بموافقة الطرفين | استغل **شبكة Pi الضخمة الموثّقة بـ KYC** لحل مشكلة حقيقية (الأمان والثقة). رسوم Pi لعمل بروفايل = منع spam. البروفايلات لـ KYC-verified بس |
| 🥈 2 | **Starmax** | برنامج ولاء: تدفع Pi في محلات وتاخد مكافآت، والتاجر يصمم برنامجه | استخدام عملي يومي لـ Pi، مرن ويركب على تشغيل المحلات الحالي → فرصة تبنّي حقيقية |
| 🥉 3 | **RUN FOR PI** | لعبة جري، Pi جوه اقتصاد اللعبة (boosters، مستويات، prize pools، leaderboard) | Pi جزء أساسي من الاقتصاد مش ديكور، UI/UX نظيف، تحكم بسيط، استغل المجتمع في الاستحواذ على مستخدمين |
| شرفي | Kindrek | Matchmaking متعدد اللغات + Pi payments + **Pi Ad Network** | تجربة مصقولة |
| شرفي | Workflet for Pi | SaaS لإدارة الفرق والمشاريع | نطاق طموح، لكن تكامل Pi لسه ضعيف |
| شرفي | PallyPay | تقسيم الفواتير بين مجموعة بـ Pi | منفعة حقيقية + B2C |
| شرفي | SimpleJoy | ألعاب متصفح خفيفة مفتوحة المصدر | طلب واضح على ألعاب خفيفة |
| شرفي | Agora Pulse | استطلاعات رأي للمجتمع | قياس رأي المجتمع |

### Pi Commerce Hackathon 2024 (1 فبراير → 3 مارس 2024)
الهدف: تطبيق يدعم **التجارة المحلية بـ Pi**. الـ Core Team نشر Mockups جاهزة في `pi-apps/pi-commerce-app`.

| | التطبيق | ليه كسب |
|---|---|---|
| 🥇 | **Map of Pi** | واجهة بسيطة حوالين **خريطة** للمحلات اللي بتقبل Pi، عشرات المتاجر التجريبية حول العالم، Pi Auth + Pi Payments متكاملين. (الكود: `pi-apps/map-of-pi` — Next.js + MUI + Leaflet + next-intl + Sentry) |
| 🥇 | **PyNook** | تطبيق واضح حوالين الـ use case الأساسي، لغات متعددة، متجر + قائمة بحث + خريطة |
| شرفي | EasyGoods | التزم بالـ prototype الرسمي ورخصة PiOS |
| شرفي | City for Pi | إبداع في التصميم، بس ضعيف في دعم التجارة المحلية |

### Q1 2023 Hackathon (+6,700 مشارك)
- 🥇 **Polls for Pi** — استطلاعات بتدفع Pi للمشاركين. كسب بسبب **البساطة، سهولة الاستخدام، منفعة واضحة لـ Pi، ومشاركة الكود مفتوح المصدر (PiOS)**. الكود: `pi-apps/polls-for-pi` (React + antd / Express + MongoDB + `pi-backend` + OpenAI).
- وصيف: Coinskro (Escrow لتجارة P2P)، Piketplace (ماركت بليس)، Connect Social (سوشيال + tipping).
- جايزة لجنة الـ VC: **ExplorePi** (مستكشف بلوكتشين — `pi-apps/ExplorePi`: Next.js + crawler بـ stellar-sdk + MySQL).
- المراجعة كان فيها **عشرات الآلاف من الـ Pioneers** مش بس الـ Core Team.

### 2021: من الفائزين LatinChain Platform (ألعاب).

---

## 3. الأنماط المشتركة في الفايزين (الدروس)

1. **Pi جوه قلب المنتج، مش زرار دفع ملزوق.** كل الفايزين Pi فيهم هي الاقتصاد نفسه (رسوم بروفايل، ولاء، in-game economy، دفع للمشاركين). الحكام انتقدوا صراحةً التطبيقات اللي "تكامل Pi فيها لسه early".
2. **استغلال الميزة الفريدة لـ Pi: ملايين مستخدمين موثّقين بـ KYC.** Blind_Lounge كسب المركز الأول أساسًا بسبب كده (ثقة + أمان + منع spam/bots).
3. **منفعة واقعية في الحياة اليومية** (تجارة محلية، ولاء، تقسيم فواتير).
4. **بساطة + UI/UX مصقول + تعدد لغات.**
5. **تطبيق شغال فعلاً على Mainnet** ومستوفي متطلبات الـ ecosystem (2025 اشترطوا Mainnet).
6. **خطة نمو/استحواذ مستخدمين** والاستمرار بعد الهاكاثون.
7. **استخدام أدوات المنصة الجديدة** (Ad Network اتذكر كميزة لـ Kindrek واقتراح لـ RUN FOR PI).
8. الفايز لازم يعمل **KYC** قبل استلام الجايزة.

---

## 4. ملاحظات على الـ App Directory (الصورة اللي بعتها)

- الدليل فيه **70,843 تطبيق**، مترتبين بـ **Top staked** (كمية Pi اللي المستخدمين عاملينها stake على التطبيق).
- الأعلى: Pet for Pi (11.11M π)، CiDi Games (9.44M)، Fruity Pi (5.2M)، WORLD OF PI MAINNET (1.56M)، 운명 과 타로 (1.28M)، Resonant Mini، Slice of Pi، OUSD، **Map of Pi (682K)**...
- **Blind_Lounge** (فايز 2025) عند 256K فقط → **الفوز في الهاكاثون مش مرتبط بالـ staking**؛ التحكيم على المنفعة والجودة واستخدام Pi.
- الفئات المسيطرة: **ألعاب**، أدوات ecosystem، تجارة/P2P، سوشيال، خدمات دفع. تطبيقات كورية وصينية وفيتنامية كتير → **السوق المحلي/اللغة** عامل نجاح.
- صفحة `ecosystem.pinet.com/apps` بتعرض القائمة ديناميكيًا (Next.js + server actions) ومفيش API عام نقدر نسحب منه القائمة كاملة؛ القائمة الكاملة جوه Pi Browser.

---

## 5. الكود على GitHub — منظمة `pi-apps` (50 مستودع)

القائمة الكاملة في [`pi-apps-repos.csv`](./pi-apps-repos.csv)، ولنسخهم كلهم محليًا: `./clone_pi_apps.sh`.

### أ) الرسمي من الـ Core Team (ابدأ منهم)
| المستودع | الفايدة |
|---|---|
| `pi-platform-docs` (2046⭐) | **المرجع الأساسي**: SDK، Platform API، Payments، A2U، **Ads**، **Pi Sign-in (OAuth)**، **Tokens** (إصدار توكن وإدراجه في Pi Wallet بـ `pi.toml`)، PiNet metadata |
| `demo` (محدّث 17/11/2026) | تطبيق كامل React+Vite / Express+MongoDB: تسجيل دخول، دفع U2A، **اشتراكات Smart Contract** |
| `pi-nodejs` → npm `pi-backend` (محدّث 17/11/2026) | Backend: A2U + `SmartContract.Subscription.process` (v1 على tag `next`) |
| `pi-ruby`, `pi-sdk-rails` | Ruby |
| `pi-sdk-nextjs` | سكافولد Next.js: `PiButton` + كل endpoints الدفع (approve/complete/cancel/error/incomplete) — "Ten Minutes to Transactions" |
| `pi-sdk-react`, `pi-sdk-js`, `pi-sdk-lite`, `pi-sdk-express`, `pi-sdk-django` | SDKs/قوالب جاهزة |
| `PiOS` | رخصة Pi Open Source وقائمة التطبيقات المفتوحة (الفائز في 2023 اتكافئ على إنه PiOS) |
| `pi-commerce-app` | Mockups هاكاثون 2024 |

### ب) SDKs من المجتمع
`pi-python`, `pi-php`, `pi-go`, `pi-rust`, `pi-csharp`, `pi-blazor`.

### ج) تطبيقات مجتمعية (بعضها فايز)
`map-of-pi` (فايز 2024)، `polls-for-pi` (فايز 2023)، `ExplorePi` (فايز VC 2023)، `door` (تحليلات بلوكتشين)، `SilkRoad` (تجارة فيتنامية)، `geraipi` (ماركت إندونيسي)، `crumbles`, `wepisharp` (سوشيال)، `tokenization-on-pi` (RWA)، `pailot-for-pi`, `local-commerce-hub`, `shop-online`, `orbit` (إدارة سوشيال + AI)، `internet-speed`، وغيرهم.

---

## 6. المكدّس التقني المختصر (اللي استخدموه الفايزين)

**الفلو الإجباري لأي دفع (U2A):**
```js
// Frontend (داخل Pi Browser)
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
Pi.init({ version: "2.0", sandbox: true /* للتطوير */ });

const auth = await Pi.authenticate(["username", "payments"], onIncompletePaymentFound);
// ابعت auth.accessToken للسيرفر وتحقق منه بـ GET https://api.minepi.com/v2/me

Pi.createPayment({ amount: 1, memo: "...", metadata: {orderId: 1} }, {
  onReadyForServerApproval: (paymentId) => post("/approve", { paymentId }),
  onReadyForServerCompletion: (paymentId, txid) => post("/complete", { paymentId, txid }),
  onCancel, onError,
});
```
```js
// Backend (بمفتاح Server API Key من Developer Portal)
POST https://api.minepi.com/v2/payments/{id}/approve     Authorization: Key <API_KEY>
POST https://api.minepi.com/v2/payments/{id}/complete    body: { txid }
```
⚠️ متسلّمش المنتج غير لما `/complete` يرجع 200 — المستخدم ممكن يكون بيزوّر الـ SDK.

**A2U (التطبيق يدفع للمستخدم):** `pi-backend` → `createPayment` → `submitPayment` → `completePayment`.

**الاشتراكات (جديد):**
```ts
const services = await Pi.SmartContract.Subscription.getMerchantServices(APP_WALLET_ADDRESS);
const tx = await Pi.SmartContract.Subscription.subscribe(userWallet, serviceId, /*autoRenew*/ true, periods);
await Pi.SmartContract.pollTransaction(tx.hash, 2);
// Server: SmartContract.Subscription.process(merchantSecret, serviceId, offset, limit)
```

**الإعلانات:** `Pi.Ads.showAd("interstitial" | "rewarded")` + التحقق من الـ rewarded على السيرفر عبر Platform API.

**التسجيل:** افتح `develop.pi` في Pi Browser → New App → تحقق من الدومين → خد الـ API Key → Sandbox URL للتجربة.

---

## 7. توصيات عملية لـ Pi Next

1. **حضّر الأساس دلوقتي** قبل نزول الشروط: سجّل App في Developer Portal، وابدأ من `demo` أو `pi-sdk-nextjs` عشان auth + payments يشتغلوا في أول يوم.
2. **استخدم الأدوات الجديدة**: الاشتراكات (Smart Contracts)، Pi Sign-in، Ad Network، MCP/AI — دي غالبًا اللي القمة بتروّج لها.
3. **اختار فكرة Pi فيها جوهرية + بتستغل الـ KYC** (ثقة، منع bots، هوية بشرية حقيقية — وده متماشي مع اتجاه Pi DataLab والـ AI).
4. **ركّز على سوق محلي** (عربي/مصري) — مفيش تطبيقات عربية كتير في أعلى القائمة.
5. **اطلع Mainnet بتطبيق شغال ومصقول**، ونظّف الـ UX، وادعم أكتر من لغة.
6. خلي الكود مفتوح المصدر (PiOS) لو ينفع — اتحسب ميزة قبل كده.

---

## المصادر
- [Pi Hackathon 2025 Winners — minepi.com](https://minepi.com/blog/hackathon-2025-winners/)
- [Pi Commerce Hackathon Winners](https://minepi.com/blog/commerce-hackathon-announcement/) ([نسخة](https://pi-network-bs.vercel.app/blog/commerce-hackathon-announcement/index.html))
- [Q1 2023 Hackathon Winners — PR Newswire](https://prnewswire.com/news-releases/pi-network-announces-q1-2023-hackathon-winners-celebrating-over-6-700-participants-and-hundreds-of-projects-from-around-the-world-301796254.html)
- [CryptoPotato — prize amounts 2025](https://cryptopotato.com/major-pi-news-pi-network-breaks-silence-with-long-awaited-winner-announcement/)
- [Coinranking — Pi Next 200,000 USDT](https://coinranking.com/news/pi-network-opens-pi-next-hackathon-200000-usdt-prize)
- [BeInCrypto — Summit agenda](https://beincrypto.com/pi-ecosystem-summit-agenda-hackathon/)
- [CoinGabbar — Summit day 1 tools](https://www.coingabbar.com/en/pi-network-news-day-1-summit-tools-launch-as-pi-rebounds)
- [Pi Day 2026](https://minepi.com/blog/pi-day-2026/)
- GitHub: https://github.com/pi-apps (pi-platform-docs, demo, pi-nodejs, PiOS, map-of-pi, polls-for-pi, ExplorePi ...)
