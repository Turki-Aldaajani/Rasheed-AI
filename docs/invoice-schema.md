# مخطط JSON الموحّد لبيانات الفاتورة (Unified Invoice Data Schema)

> **إصدار المخطط:** `1.0`  
> **الملف المرجعي الرسمّي:** [`docs/invoice-schema.json`](file:///Users/moad/.gemini/antigravity/worktrees/Rasheed-AI/fix_a13_package_resolution/docs/invoice-schema.json)  
> **المرتبطة بـ:** Issue [#9](https://github.com/Turki-Aldaajani/Rasheed-AI/issues/9) و [#45](https://github.com/Turki-Aldaajani/Rasheed-AI/issues/45)

---

## 1. الغرض والمشكلة

يضمن هذا المخطط وجود عقد بيانات (Data Contract) صارم وثابت بين مخرجات الذكاء الاصطناعي (Gemini Vision) وبقية مكونات النظام وقاعدة البيانات (`bills` و `bill_readings`).

يضمن المخطط:
1. **التحقق المبكّر (Validation):** رفض أي استجابة غير مطابقة قبل محاولة حفظها في قاعدة البيانات.
2. **عزل الحقول الاختيارية (Safe Optional Fields):** التعامل مع الحقول الثانوية (مثل تواريخ بداية/نهاية الفترة) دون تعطيل المسار الأساسي.
3. **إصدار المخطط (Schema Versioning):** إرفاق حقلي إصدار (`version: "1.0"`) لضمان التوافق المستقبلي مع أي تعديلات دون كسر الميزات الحالية.

---

## 2. بنية المخطط (Schema Specification)

| اسم الحقل | النوع | إجباري؟ | الوصف والقواعد |
| :--- | :--- | :--- | :--- |
| `version` | `string` | لا (افتراضي: `"1.0"`) | رقم إصدار المخطط لضمان التوافقية |
| `serviceType` | `string` | نعم | نوع الخدمة: `"electricity"` أو `"water"` |
| `periodLabel` | `string` | نعم | وصف الفترة كما هو مطبوع في الفاتورة (مثال: `"يناير 2025"`) |
| `periodStart` | `string` | لا | تاريخ بداية الفترة بصيغة ISO (`YYYY-MM-DD`) |
| `periodEnd` | `string` | لا | تاريخ نهاية الفترة بصيغة ISO (`YYYY-MM-DD`) |
| `consumption` | `number` | نعم | قيمة الاستهلاك الإيجابية (مثال: `1200`) |
| `consumptionUnit` | `string` | نعم | وحدة الاستهلاك: `"kwh"` للكهرباء أو `"m3"` للمياه |
| `amountSar` | `number` | نعم | المبلغ الإجمالي بالريال السعودي (يجب أن يكون >= 0) |
| `accountNumber` | `string` | نعم | رقم الحساب أو العداد أو المشرك |

---

## 3. قواعد التوافق والتحقق (Validation Rules)

1. **اتساق نوع الخدمة والوحدة:**
   - إذا كان `serviceType === "electricity"` -> يجب أن تكون `consumptionUnit === "kwh"`.
   - إذا كان `serviceType === "water"` -> يجب أن تكون `consumptionUnit === "m3"`.
2. **القيم الرقمية:**
   - يجب أن تكون كل من `consumption` و `amountSar` أعداداً حقيقية غير سالبة.
   - يتم تحويل الأرقام العربية المشرقية (٠١٢٣٤٥٦٧٨٩) تلقائياً إلى أرقام قياسية قبل التحقق.
3. **الرفض الصريح:**
   - البيانات غير المطابقة تُرفض بوضوح مع رسالة خطأ باللغة العربية توضّح الحقل المسبب للرفض.

---

## 4. نموذج الاستجابة المقبولة (Valid JSON Example)

```json
{
  "version": "1.0",
  "serviceType": "electricity",
  "periodLabel": "يناير 2025",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "consumption": 1450,
  "consumptionUnit": "kwh",
  "amountSar": 580.0,
  "accountNumber": "1002948172"
}
```
