/**
 * نتائج التحليل — نموذج تجريبي.
 * لاحقًا: تُنتج من نموذج التحليل الحقيقي بعد قراءة الفاتورة.
 *
 * تنبيه: نسب التوزيع تقديرية ومبنية على بيانات المنزل والطقس،
 * وليست قراءة فعلية لمستوى الأجهزة من عدّاد ذكي.
 */

export type ConsumptionCategory = {
  id: "cooling" | "waterHeating" | "refrigeration" | "lighting" | "other";
  label: string;
  share: number;
  /** درجة اللون ضمن تدرّج العلامة (0 = الأغمق) */
  tone: number;
  headline: string;
  note: string;
  facts: { label: string; value: string }[];
};

export const consumptionBreakdown: ConsumptionCategory[] = [
  {
    id: "cooling",
    label: "التبريد والتكييف",
    share: 55,
    tone: 0,
    headline: "أكبر مصدر محتمل لاستهلاك منزلك",
    note:
      "الطقس الحار ومدة تشغيل المكيفات قد يكونان من أكبر العوامل المؤثرة في استهلاك المنزل خلال هذه الفترة.",
    facts: [
      { label: "درجة الحرارة الحالية", value: "43 درجة مئوية" },
      { label: "عدد وحدات التكييف", value: "5 وحدات" },
      { label: "متوسط الفترة", value: "41 درجة مئوية" },
    ],
  },
  {
    id: "waterHeating",
    label: "تسخين المياه",
    share: 15,
    tone: 1,
    headline: "ثاني أكبر بند تقديري",
    note:
      "تشغيل السخان لساعات طويلة قد يرفع الاستهلاك، خصوصًا في المنازل التي يزيد فيها عدد الأفراد.",
    facts: [
      { label: "عدد الأفراد", value: "6 أفراد" },
      { label: "نوع المسكن", value: "فيلا" },
      { label: "ساعات التشغيل المقدّرة", value: "6 ساعات يوميًا" },
    ],
  },
  {
    id: "refrigeration",
    label: "التبريد والثلاجات",
    share: 8,
    tone: 2,
    headline: "استهلاك مستمر على مدار اليوم",
    note:
      "الثلاجات تعمل باستمرار، ولذلك يكون استهلاكها ثابتًا نسبيًا ولا يتأثر كثيرًا بتغير العادات اليومية.",
    facts: [
      { label: "طبيعة التشغيل", value: "مستمر 24 ساعة" },
      { label: "قابلية التوفير", value: "محدودة" },
    ],
  },
  {
    id: "lighting",
    label: "الإضاءة",
    share: 4,
    tone: 3,
    headline: "نسبة صغيرة من الإجمالي",
    note:
      "الإضاءة عادةً ما تمثل جزءًا صغيرًا من فاتورة المنازل السعودية مقارنةً بالتبريد.",
    facts: [
      { label: "قابلية التوفير", value: "منخفضة" },
      { label: "أثر التحسين", value: "تراكمي على المدى الطويل" },
    ],
  },
  {
    id: "other",
    label: "أخرى",
    share: 18,
    tone: 4,
    headline: "أجهزة متنوعة",
    note:
      "تشمل الغسالات والأفران والأجهزة الإلكترونية وأجهزة الاستعداد، ويختلف تأثيرها من منزل لآخر.",
    facts: [
      { label: "أمثلة", value: "غسالة، فرن، أجهزة إلكترونية" },
      { label: "قابلية التوفير", value: "متوسطة" },
    ],
  },
];

/** إعدادات المحاكاة الافتراضية — تمثّل الوضع الحالي للمنزل */
export const simulationDefaults = {
  acHours: 18,
  acTemp: 24,
  heaterHours: 6,
};

/** الإعدادات التي توصي بها خطة رشيد */
export const recommendedSettings = {
  acHours: 14,
  acTemp: 26,
  heaterHours: 4,
};

/** سيناريو وسيط يوضّح أثر التعديل البسيط */
export const lightSettings = {
  acHours: 16,
  acTemp: 25,
  heaterHours: 6,
};

export const simulationRanges = {
  acHours: { min: 8, max: 24, step: 1, unit: "ساعة/يوم" },
  acTemp: { min: 22, max: 28, step: 1, unit: "درجة مئوية" },
  heaterHours: { min: 1, max: 10, step: 1, unit: "ساعة/يوم" },
};

export type Recommendation = {
  id: keyof typeof recommendedSettings;
  title: string;
  description: string;
  detail: string;
  from: string;
  to: string;
};

/**
 * خطة رشيد. قيمة التوفير لكل بند لا تُكتب هنا —
 * تُحسب من محرك المحاكاة حتى تبقى الأرقام متسقة في كل الشاشات.
 */
export const recommendations: Recommendation[] = [
  {
    id: "acHours",
    title: "تحسين تشغيل المكيفات",
    description:
      "تقليل ساعات تشغيل المكيفات اليومية مع الحفاظ على مستوى راحة مناسب.",
    detail:
      "إطفاء المكيفات في الغرف غير المستخدمة، والاعتماد على المؤقّت قبل الخروج من المنزل بنصف ساعة.",
    from: "18 ساعة يوميًا",
    to: "14 ساعة يوميًا",
  },
  {
    id: "acTemp",
    title: "ضبط درجة الحرارة",
    description:
      "تعديل درجة حرارة المكيف ضمن نطاق مناسب قد يقلل استهلاك التبريد.",
    detail:
      "رفع درجة الحرارة درجتين مع تشغيل المراوح يحافظ على الإحساس بالبرودة تقريبًا نفسه.",
    from: "24 درجة مئوية",
    to: "26 درجة مئوية",
  },
  {
    id: "heaterHours",
    title: "تحسين استخدام سخان المياه",
    description: "تقليل التشغيل غير الضروري للسخان.",
    detail:
      "تشغيل السخان قبل أوقات الاستخدام بفترة قصيرة بدلًا من إبقائه يعمل طوال اليوم.",
    from: "6 ساعات يوميًا",
    to: "4 ساعات يوميًا",
  },
];

export type WaterOpportunity = {
  title: string;
  description: string;
  estimateSar: number;
};

export const waterOpportunities: WaterOpportunity[] = [
  {
    title: "تقليل هدر المياه",
    description:
      "تركيب مرشّدات على الحنفيات ورؤوس الدش قد يقلل التدفق دون التأثير على الاستخدام اليومي.",
    estimateSar: 18,
  },
  {
    title: "اكتشاف الاستهلاك غير المعتاد",
    description:
      "ارتفاع الاستهلاك 13٪ عن الشهر الماضي قد يشير إلى تسريب بسيط أو زيادة في ري الحديقة.",
    estimateSar: 12,
  },
  {
    title: "خطة ترشيد المياه",
    description:
      "تنظيم أوقات الري وتقليل مدة الاستحمام قد يخفض الاستهلاك الشهري تدريجيًا.",
    estimateSar: 15,
  },
];

/** خطوات شاشة التحليل */
export const analysisSteps = [
  "قراءة بيانات الفاتورة",
  "تحليل الاستهلاك",
  "مقارنة نمط الاستهلاك",
  "تحليل تأثير الطقس",
  "إعداد خطة الترشيد",
];
