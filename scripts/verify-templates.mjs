#!/usr/bin/env node
/**
 * يتحقق من أن قوالب Issues وقالب PR وملفات التوثيق المطلوبة في D29 موجودة
 * في المسارات التي يتعرف عليها GitHub تلقائيًا، وأن كل قالب Issue يحمل
 * ترويسة YAML صالحة بحقلي name وabout.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const issueTemplateDir = path.join(root, ".github", "ISSUE_TEMPLATE");
const prTemplatePath = path.join(root, ".github", "pull_request_template.md");
const contributingPath = path.join(root, "CONTRIBUTING.md");
const architecturePath = path.join(root, "docs", "ARCHITECTURE.md");

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fields;
}

let failures = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`✅ ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`❌ ${label}\n   ${err.message}`);
  }
}

check("CONTRIBUTING.md موجود", () => {
  assert.ok(existsSync(contributingPath));
});

check("docs/ARCHITECTURE.md موجود", () => {
  assert.ok(existsSync(architecturePath));
});

check("مجلد .github/ISSUE_TEMPLATE موجود وفيه قالبان على الأقل", () => {
  assert.ok(existsSync(issueTemplateDir));
  const files = readdirSync(issueTemplateDir).filter((f) => f.endsWith(".md"));
  assert.ok(files.length >= 2, `وجدت ${files.length} فقط`);
});

const templateFiles = existsSync(issueTemplateDir)
  ? readdirSync(issueTemplateDir).filter((f) => f.endsWith(".md"))
  : [];

for (const file of templateFiles) {
  check(`قالب ${file} يحمل name وabout في الترويسة`, () => {
    const content = readFileSync(path.join(issueTemplateDir, file), "utf-8");
    const front = parseFrontMatter(content);
    assert.ok(front.name, "لا يوجد name");
    assert.ok(front.about, "لا يوجد about");
  });
}

check(".github/ISSUE_TEMPLATE/config.yml يحافظ على خيار الإصدار الفارغ", () => {
  const configPath = path.join(issueTemplateDir, "config.yml");
  assert.ok(existsSync(configPath));
  const content = readFileSync(configPath, "utf-8");
  assert.match(content, /blank_issues_enabled:\s*true/);
});

check(".github/pull_request_template.md موجود ويذكّر بربط الـ Issue", () => {
  assert.ok(existsSync(prTemplatePath));
  const content = readFileSync(prTemplatePath, "utf-8");
  assert.match(content, /Closes #/);
});

if (failures > 0) {
  console.error(`\n${failures} تحقق فشل.`);
  process.exit(1);
}
console.log("\nكل الفحوصات ناجحة ✅");
