# النشر (Deployment)

توثيق حالة النشر الفعلية على Netlify — كتب بعد التحقق المباشر من إعدادات
الموقع عبر Netlify API، لا افتراضًا.

## الحالة الحالية

| البند | الحالة |
| --- | --- |
| النشر التلقائي عند push على `main` | ✅ يعمل — الموقع مربوط بمستودع GitHub الحقيقي عبر تطبيق Netlify GitHub الرسمي |
| متغيرات البيئة على Netlify | ✅ مضبوطة (`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| فصل بيئة التطوير عن الإنتاج | ❌ غير موجود — مشروع Supabase ومفتاح Gemini نفسهما في التطوير والإنتاج |

تحقّق من حالة الربط بنفسك في أي وقت:

```bash
npm run verify:netlify-git
```

## كيف يعمل النشر التلقائي

1. أي push على فرع `main` يُشغّل بناءً على Netlify تلقائيًا (Continuous Deployment
   عبر GitHub App، مُفعّل على مستوى الموقع — Site configuration → Build & deploy).
2. إعدادات البناء تُقرأ من [`netlify.toml`](../netlify.toml) في جذر المستودع:
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   ```
3. Netlify يستخدم [Next.js Runtime](https://github.com/netlify/next-runtime) تلقائيًا
   للتعامل مع الصفحات الديناميكية والـ Middleware.

## نشر يدوي (بديل احتياطي)

يفيد عند اختبار تغيير قبل دمجه، أو لو انقطع الربط التلقائي مؤقتًا:

```bash
netlify link           # مرة واحدة فقط، لمن لديه صلاحية الوصول لحساب Netlify
netlify deploy --prod
```

## ⚠️ فجوة معروفة: لا فصل بين بيئتَي التطوير والإنتاج

حاليًا نفس مشروع Supabase ونفس مفتاح Gemini API يُستخدمان في:
- بيئة التطوير المحلي (`.env.local` على جهاز كل مطوّر)
- بيئة الإنتاج (متغيرات البيئة على Netlify)

هذا يعني أن أي تجربة أو خطأ محلي (خصوصًا في استدعاءات Gemini المدفوعة، أو
كتابة بيانات تجريبية في جداول Supabase) يؤثر مباشرة على بيانات وتكلفة
الإنتاج. لا يوجد حل آلي لهذا ضمن هذا الملف — يتطلب قرارًا بإنشاء مشروع
Supabase ثانٍ (وربما مفتاح Gemini منفصل) للتطوير، وهو قرار بنية تحتية خارج
نطاق التوثيق وحده.

## استكشاف الأخطاء

**"npm error enoent Could not read package.json"** في سجل البناء على Netlify،
مع سطر مثل `Custom publish path detected: 'D:\...'` أو مسار غريب لا يشبه
GitHub — هذا يعني أن الموقع مربوط بمستودع Git داخلي فارغ تُنشئه Netlify
افتراضيًا للمواقع غير المربوطة (`provider: "netlify-git"`)، لا بمستودع
GitHub الحقيقي. الحل: Site configuration → Build & deploy → Continuous
deployment → Link a different repository → GitHub → اختر
`Turki-Aldaajani/Rasheed-AI`. تحقّق من النتيجة بـ `npm run verify:netlify-git`.
