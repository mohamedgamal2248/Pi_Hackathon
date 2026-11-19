# Pi Developers MCP Server

- **URL:** `https://developers.minepi.com/mcp` (Remote MCP عبر HTTP)
- **المصادقة:** OAuth (`profile:read`, `profile:write`, `apps:read`, `apps:write`). أول مرة الـ agent يستخدم Pi بيفتح تاب في المتصفح، **فتعمل scan للـ QR code بتطبيق Pi** وتوافق. الـ agent مش المفروض أبدًا يطلب منك بيانات دخول Pi أو التوكن بتاعك.
- **التعليمات الرسمية للـ agents:** https://developers.minepi.com/agents.md

## التثبيت
اتثبّت بالفعل في المشروع ده من خلال `.mcp.json`:
```bash
claude mcp add --transport http -s project pi-developers https://developers.minepi.com/mcp
```
Cursor: ضيف نفس الـ URL في `.cursor/mcp.json`. ولأي MCP client تاني (Codex مثلًا) ضيف remote server بنفس الرابط.

بعد ما تفتح المشروع في Claude Code (على جهازك)، اكتب `/mcp` واختار `pi-developers` واعمل **Authenticate**. ولو الأدوات ما ظهرتش، اقفل الـ agent خالص وافتحه تاني.

## الأدوات (Tools)
| Tool | الوظيفة |
|---|---|
| `whoami` | بيانات حسابك |
| `terms_accept` | الموافقة على شروط المطورين |
| `create_app` / `list_apps` / `get_app` / `update_app` | تسجيل التطبيق وإدارته |
| `verify_app_url_ownership` | التحقق من ملكية الدومين، وبيرجع `pi_url` (`https://<sub>.pinet.com`) |
| `prepare_app_logo_upload` / `set_app_logo` | رفع اللوجو (1024×1024) |
| `prompt_payments` | إعداد Pi Payments |
| `logout` | تسجيل الخروج |

## المسار الرسمي (Funnel)
1. `create_app`، والـ agent **لازم يسألك**: Staging (Testnet) ولا Production (Mainnet). **الاختيار ده مش هيتغير بعد كده.** ولـ Pi Next لازم **Production**.
2. Staging: بتجرب في Pi Sandbox على `localhost` (من غير `X-Frame-Options`، وبـ CSP `frame-ancestors 'self' https://*.pinet.com https://*.minepi.com`، و`connect-src` فيها `https://socialchain.app`).
3. بعد كده Pi Login، وبعدها Pi Payments.
4. النشر على HTTPS عام، وبعدين `update_app` (`frontend_url` بس)، وبعدين `verify_app_url_ownership`، وتجرب في Pi Browser.
5. Production: تكمّل الـ listing من `listing_url` (Draft ثم Deployed ثم Listed)، وبعدها اللوجو.
