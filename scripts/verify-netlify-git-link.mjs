#!/usr/bin/env node
/**
 * يتحقق من معيار نجاح O28: "push على main ينشر تلقائيًا بدون تدخل يدوي".
 *
 * ذلك يتطلب أن يكون موقع Netlify مربوطًا فعليًا بمستودع GitHub الحقيقي
 * (Turki-Aldaajani/Rasheed-AI)، لا بمستودع Netlify الداخلي الفارغ
 * (provider: "netlify-git") الذي يُنشأ افتراضيًا للمواقع غير المربوطة.
 *
 * الاستخدام:
 *   NETLIFY_AUTH_TOKEN=... node scripts/verify-netlify-git-link.mjs
 * أو ببساطة (يستخدم رمز جلسة Netlify CLI المسجّل دخوله محليًا):
 *   netlify api getSite --data '{"site_id":"..."}' | node scripts/verify-netlify-git-link.mjs
 */
import { execSync } from "node:child_process";

const SITE_ID = process.env.NETLIFY_SITE_ID || "1d127d10-6fa3-428f-8d99-894b185e891a";
const EXPECTED_REPO = "Turki-Aldaajani/Rasheed-AI";

async function getSite() {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (token) {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Netlify API returned ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // بدون NETLIFY_AUTH_TOKEN، نعتمد على جلسة netlify CLI المسجّلة دخولها محليًا.
  const raw = execSync(
    `netlify api getSite --data "{\\"site_id\\":\\"${SITE_ID}\\"}"`,
    { encoding: "utf-8" }
  );
  return JSON.parse(raw);
}

const site = await getSite();
const provider = site.build_settings?.provider;
const repoPath = site.build_settings?.repo_path;

console.log(`provider:  ${provider}`);
console.log(`repo_path: ${repoPath}`);

if (provider === "github" && repoPath === EXPECTED_REPO) {
  console.log("\n✅ الموقع مربوط فعليًا بمستودع GitHub الصحيح — push على main يجب أن ينشر تلقائيًا.");
  process.exit(0);
}

console.error(
  `\n❌ الموقع غير مربوط بـ GitHub بشكل صحيح (provider="${provider}", repo_path="${repoPath}").\n` +
    `   المتوقع: provider="github", repo_path="${EXPECTED_REPO}".\n` +
    "   اربط المستودع يدويًا من: Site configuration → Build & deploy → Continuous deployment.\n"
);
process.exit(1);
