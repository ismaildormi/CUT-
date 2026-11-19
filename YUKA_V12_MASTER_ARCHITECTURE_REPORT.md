# التقرير المعماري الرئيسي الموحد: **`Yuka v12.0`** (المملوكة لشركة **`KASPI`**)
### `Yuka-Core` & `Yuka-Vision` — المنظومة السيادية الشاملة (100% بدون مفاتيح + BYOK اختياري + God-Mode OS + Kaspi POS)

> **الهوية الرسمية الوحيدة (`Sole Official Brand`):** **`Yuka`** (`Yuka-Core` & `Yuka-Vision`)
> **الشركة المالكة (`Owner`):** **`KASPI`**
> **الإصدار الموحد (`Master Release`):** **`v12.0`** (يدمج كامل ترقيات `v10.2` → `v10.3` → `v10.4` → `v10.5` → `v10.6` → `v10.8` → `v10.9` → `v11.0` → `v11.1` → `v11.2` → `v12.0`)
> **الموقع الجغرافي والبيئة التجارية المستهدفة:** **الناظور، المغرب (`Nador, Morocco`)** — دعم أصلي للدارجة المغربية، العربية الفصحى، الفرنسية، الإنجليزية، `Kaspi POS`، وأسعار الصرف الحية (`MAD / EUR / USD / BTC` وأكثر من 200 عملة).
> **حالة البناء والتحقق:** مُتحقَّق منه بـ `npm run lint` (`tsc --noEmit`) و`npm run build` (`vite build`) بدون أخطاء.

---

## 1. التوحيد الجذري للهوية (`Root Rebrand & Zero-Leakage Sovereignty`)

تم توحيد جميع الطبقات (الواجهة الأمامية، السيرفر، المنسق المحلي، ومخرجات الصوت والدردشة) تحت هوية واحدة وحيدة:
- **الاسم الرسمي الوحيد:** **`Yuka`** (تمت إزالة التشتت بين الأسماء السابقة `HEYUKA` و`NEVEA` و`NOVA` و`X × Zebra` من واجهات المستخدم، عناوين الاستوديو، قواميس اللغات السبع في `src/i18n/translations.ts`، وشخصية الدردشة في `server/yukaCore.ts` و`server/gemini.ts`).
- **التوافق العكسي النظيف (`Backward Compatibility`):** ملف `server/heyukaBoss.ts` تحول إلى جسر إعادة تصدير نظيف (`re-export bridge`) نحو `server/yukaCore.ts` لضمان عدم كسر أي وحدة قديمة مع توجيه كل شيء حصرياً إلى نواة **`Yuka v12.0`**.
- **درع السرية التامة ومنع التسرب (`sanitizeYukaChatOutput`):** يمسح تلقائياً أي إشارة عرضية لأسماء مزودين أو نماذج خارجية (بالإنجليزية والعربية) وأي وسوم `<think>...</think>`، ويضمن أن **`Yuka`** وحده هو من يتحدث في النص والصوت.

---

## 2. مخطط الهندسة المعمارية الموحدة (`Yuka v12.0 Mermaid Architecture`)

```mermaid
flowchart TB
    User([المستخدم / صوت + نص + شاشة<br/>الدارجة · العربية · FR · EN]) --> UI["واجهة Yuka STUDIO (React 19 + WebGL2 3D Fur)<br/>src/components/GlassmorphismPanel.tsx<br/>Optional BYOK Vault (AES-GCM 256) • yk-live Keys"]

    UI -->|"طلبات + BYOK مشفر اختيارياً"| Gateway["بوابة Yuka v12.0 الموحدة (Express 5)<br/>/api/yuka/* • /api/gemini/interact • /api/router/execute"]

    Gateway --> Core["👑 Yuka-Core v12.0 (server/yukaCore.ts)<br/>100% Zero-Key Sovereign Orchestrator"]
    Gateway --> OsEngine["🖥️ Yuka God-Mode OS Engine (server/yukaOsEngine.ts)"]
    Gateway --> KeyMesh["🔑 Yuka API Key Gateway (yk-live-...)<br/>+ 100x Distributed Node Mesh"]

    subgraph ZeroKeyArsenal["الدفعات الأربع v10.3 (26+ محرك مفتوح المصدر بدون مفاتيح)"]
        direction LR
        B1["Batch 1: الذكاء والذاكرة<br/>WebLLM · llama.cpp · Ollama<br/>WebContainers · Piston · PGlite · LanceDB"]
        B2["Batch 2: الوسائط والصوت<br/>ComfyUI · TripoSR · PolyHaven · Wan2.1<br/>Kokoro · Habibi-TTS · Fish Speech · CosyVoice · Whisper"]
        B3["Batch 3: الويب والمستندات<br/>Jina · Crawl4AI · DoH 1.1.1.2<br/>Docling · Stirling-PDF · Syncthing · isomorphic-git"]
        B4["Batch 4: المال والتواصل<br/>fawazahmed0 FX (+200) · Dinero.js · hledger<br/>ntfy.sh · Baileys WhatsApp · Matrix · Activepieces"]
    end

    subgraph GodModeOS["أنظمة التحكم والتجسيد v10.4–v11.2 (Python & Win32/Linux)"]
        direction LR
        V104["v10.4–v10.5<br/>Win32 CreateDesktop / Xvfb<br/>Multi-Cursor Swarm (3–6)<br/>Headless Boot Daemon + Voice Cloner"]
        V106["v10.6–v10.9 (Yuka-Vision)<br/>DXcam DXGI · dHash 64-bit · Screenpipe FTS5<br/>OmniParser V2 · Surya OCR · ShowUI Bezier<br/>Baileys OGG Opus Voice Notes · Terjman-v2"]
        V110["v11.0–v11.2 (Safety & Builders)<br/>Shadow Time-Machine Vault (7-Day Restore)<br/>Protected Workspace Guard (.git / Kaspi / OS)<br/>OpenHands / SWE-agent + winget/uv/pnpm Auto-Provisioner"]
    end

    Core -->|"اختياري إذا فُعّل BYOK"| ByokBoost["⚡ Optional User BYOK Booster<br/>(Gemini / OpenAI / Claude / Groq / OpenRouter / Custom)"]
    Core -->|"الوضع الافتراضي 100%"| ZeroKeyArsenal
    OsEngine --> GodModeOS

    ZeroKeyArsenal & ByokBoost & GodModeOS --> Shield["🛡️ sanitizeYukaChatOutput()<br/>درع منع التسرب: Yuka وحده يتحدث"]
    Shield -->|"رد نقي باسم Yuka (KASPI)"| User
```

---

## 3. جرد الوحدات والقدرات المبرمجة (`v10.3 → v12.0` Implementation Map)

### أ. النواة المركزية والترسانة بدون مفاتيح + BYOK (`v10.3` & `v12.0`)
| الملف | الدور المعماري الدقيق |
|---|---|
| **`server/yukaCore.ts`** | النواة الرسمية لـ **`Yuka v12.0` (KASPI)**: تحتوي على مصفوفة الدفعات الأربع الكاملة (`YUKA_ZERO_KEY_REPLACEMENT_MATRIX` لـ 13 فئة و26+ محرك)، منفّذ الاستنتاج الهجين `yukaSupremeExecuteLLM()` الداعم لـ `Optional BYOK` مع تدرج Zero-Key من 4 مستويات، درع `sanitizeYukaChatOutput()`، تعمية `anonymizeOutboundTaskPayload()`، مولّد ومدقّق مفاتيح **`yk-live-...`** مع شبكة **`100x` Node Mesh**، بوابة الصرف الحية `fetchYukaLiveCurrencyRates()` (`fawazahmed0/exchange-api` لأكثر من 200 عملة + `Frankfurter` احتياطياً)، الدفتر المالي المشفر بـ `SHA-256`، وبوابة الإشعارات `ntfy.sh`. |
| **`server/heyukaBoss.ts`** | جسر توافق عكسي نظيف (`Compatibility Re-Export Bridge`) يربط كل الاستدعاءات القديمة مباشرةً بنواة `server/yukaCore.ts` تحت هوية `Yuka v12.0`. |
| **`src/services/yukaByokVault.ts`** | خزنة **BYOK الاختيارية** المشفرة محلياً في المتصفح بـ **Web Crypto API (`PBKDF2-SHA256` + `AES-GCM 256-bit`)** + عميل إدارة وإصدار وإلغاء مفاتيح `yk-live-...`. |
| **`src/components/GlassmorphismPanel.tsx`** | ترقية واجهة الدرج الجانبي إلى **`Yuka STUDIO` (`KASPI · v12.0`)** مع بطاقتين منظمتين داخل تبويب `Cloud & Keys`: **(1) خزنة Optional BYOK AES-GCM** و**(2) مُصدِر مفاتيح `yk-live-...` ومؤشر شبكة `100x`** مع الحفاظ على نظافة مساحة العرض ثلاثية الأبعاد (`WebGL2 Fur Viewport`). |
| **`src/services/companionAI.js`** | ربط تلقائي لحقن إعدادات `BYOK` الاختيارية المشفرة عند تفعيلها في طلبات المحادثة والرؤية الحية، وتوحيد شخصية الاستجابة الاحتياطية باسم **`Yuka`**. |
| **`src/i18n/translations.ts`** | توحيد العلامة التجارية (`brand: 'Yuka'`) عبر جميع اللغات السبع (`en`, `ar`, `fr`, `es`, `de`, `zh`, `ja`). |

### ب. محرك نظام التشغيل السيادي، الرؤية الحية، الصوت، وخزنة الزمن (`v10.4 → v11.2`)
| الملف | الإصدارات المغطاة | القدرات المبرمجة فعلياً |
|---|---|---|
| **`server/yukaOsEngine.ts`** | `v10.4` – `v11.2` | - **خزنة الزمن (`Shadow Time-Machine Vault`):** نقل آمن للملفات (`workspace/yuka_shadow_vault/` + `shadow_manifest.json`) مع مهلة احتفاظ 7 أيام واسترجاع بضغطة واحدة (`restoreFromShadowVault`) ومنع الحذف النهائي.<br/>- **درع حماية المشاريع (`Protected Workspace Guard`):** يمنع حذف أو تعديل `.git`، `package.json`، `server/`، `src/`، `backend/`، `electron/`، `C:\Windows`، `Kaspi POS`، ونواة `Yuka` إلا بتأكيد صريح.<br/>- **مكتبة استنساخ الصوت (`Voice Cloning Profiles`):** تسجيل ملفات الصوت المستنسخ (`Fish Speech V1.5`, `CosyVoice 2.0`, `Habibi-TTS`, `Kokoro-82M`).<br/>- **جسر تنفيذ Python (`executeYukaOsDirective`):** استدعاء مباشر لسكربتات `backend/yuka_godmode_os.py` و`backend/yuka_voice_cloner.py`. |
| **`backend/yuka_godmode_os.py`** | `v10.4`, `v10.6`–`v10.8`, `v11.0`–`v11.2` | - عزل الديسكتوب المخفي (`Win32 CreateDesktopW` على ويندوز و`Xvfb` على لينكس).<br/>- سرب المؤشرات المتعددة (`3–6` مؤشرات متوازية) مع مولّد منحنيات بيزييه التربيعية (`generate_bezier_trajectory`) لحركة بشرية طبيعية وردة فعل `<50ms`.<br/>- ذاكرة الشاشة الحلقية بـ **SQLite FTS5** (`record_screen_episode` / `query_screen_memory`) متكاملة مع معمارية `DXcam` + `dHash 64-bit`.<br/>- الحذف الآمن بـ Shadow Vault + درع حماية النظام.<br/>- التثبيت الصامت التلقائي (`Silent Auto-Provisioner`) عبر `winget` / `uv` / `pnpm` / `docker`. |
| **`backend/yuka_voice_cloner.py`** | `v10.5`, `v10.9` | - عزل الصوت البشري من الضوضاء عبر **`Demucs` (`htdemucs`)**.<br/>- ترميز رسائل **واتساب الصوتية** بصيغة **`OGG / libopus` (24kbps, 16kHz Mono)** عبر `FFmpeg` لتوافق 100% مع `Baileys PTT`.<br/>- سجل محركات الصوت المفتوحة (`Fish Speech V1.5`, `CosyVoice 2.0`, `Habibi-TTS`, `Kokoro-82M`, `F5-TTS`, `OpenVoice V2`, `Faster-Whisper`, `OpenWakeWord`). |
| **`NOVA_Auto_Installer_Windows.bat`** | `v10.5`, `v11.2`, `v12.0` | ترقية المثبت الرسمي لويندوز إلى **`Yuka v12.0 (KASPI)`** مع التثبيت الصامت لـ `Node.js LTS` عبر `winget` وتسجيل خدمة التشغيل الخفي عند إقلاع الويندوز (`YukaSovereignBootDaemon` عبر `schtasks` مع دعم العلم `--headless`). |

---

## 4. بوابة واجهات البرمجة الموحدة (`/api/yuka/*` في `server/start.ts`)

| المسار (`Endpoint`) | الطريقة | الوظيفة |
|---|---|---|
| `/api/yuka/status` | `GET` | إرجاع حالة السيادة الكاملة لـ `Yuka v12.0` (KASPI)، الدفعات الـ 4، حالة `100% Zero-Key`، وعدد المفاتيح النشطة ومضاعف الشبكة (`100x`). |
| `/api/yuka/chat` | `POST` | نقطة المحادثة الموحدة لـ `Yuka` (تدعم `byokConfig` الاختياري ودرع منع التسرب `sanitizeYukaChatOutput` ومفتاح `Authorization: Bearer yk-live-...`). |
| `/api/yuka/keys` | `GET` | عرض مفاتيح **`yk-live-...`** الصادرة ومضاعف الشبكة الموزعة (`100x`، `200x`...). |
| `/api/yuka/keys/mint` | `POST` | إصدار مفتاح **`yk-live-...`** سيادي جديد للمطورين أو نقاط `Kaspi POS` (يُحفظ بـ SHA-256 hash فقط). |
| `/api/yuka/keys/:id` | `DELETE` | إلغاء مفتاح `yk-live-...` محدد فوراً. |
| `/api/yuka/fx` | `GET` | أسعار الصرف الحية لأكثر من 200 عملة عالمية ورقمية (`?base=MAD` افتراضياً للناظور/المغرب + `EUR/USD/BTC`) عبر `fawazahmed0/exchange-api` و`Frankfurter`. |
| `/api/yuka/os/capabilities` | `GET` | جرد قدرات `v10.4`–`v11.2` (الديسكتوب المخفي، سرب المؤشرات، الرؤية الحية، استنساخ الصوت، واتساب، خزنة الزمن، ومنفّذ المشاريع). |
| `/api/yuka/os/execute` | `POST` | تنفيذ أوامر `Yuka God-Mode OS` (`shadow_vault_delete`, `shadow_vault_restore`, `bezier_swarm`, `screen_memory_record`, `screen_memory_search`, `whatsapp_voice_note`, `auto_provision`). |
| `/api/yuka/shadow-vault` | `GET` | استعراض سجل الملفات المحمية داخل **Shadow Time-Machine Vault** القابلة للاسترجاع خلال 7 أيام. |
| `/api/yuka/shadow-vault/restore` | `POST` | استرجاع أي ملف من **Shadow Time-Machine Vault** بضغطة واحدة إلى مساره الأصلي. |

---

## 5. ضمانات الأمان والاستمرارية (`Zero-Risk Production Guarantees`)

1. **Zero Mandatory Keys:** يشتغل التطبيق بالكامل من اللحظة الأولى بـ **0 مفاتيح خارجية**، مع بقاء **BYOK** خياراً حراً مشفراً محلياً بـ `AES-GCM 256-bit`.
2. **Zero Permanent Data Loss:** أي عملية تنظيف تمر إلزامياً عبر **Shadow Time-Machine Vault** (استرجاع لمدة 7 أيام) و**Protected Workspace Guard** لمنع مساس النظام أو مستودعات `.git` أو `Kaspi POS`.
3. **Zero Identity Leakage:** لا يظهر أي اسم مزود خارجي في المحادثات أو الصوت؛ **`Yuka`** (من **`KASPI`**) هو الواجهة والصوت والعقل الموحد الوحيد.
