#!/usr/bin/env node
// 迁移历史词条图解（ai-terms/{locale}/{slug}/diagram-*）到统一的 ai-terms/{年}/{月}/diagram-*。
// 通过带管理员 Cookie 调用一次性管理 API 完成（R2 搬迁 + 数据库 URL 改写 + 删除旧对象）。
//
// 用法：
//   $env:AI_TERM_ADMIN_COOKIE='zz_admin_session=...'
//   node scripts/migrate-ai-term-diagrams.mjs            # dry-run，只列出将迁移的对象
//   node scripts/migrate-ai-term-diagrams.mjs --apply    # 实际执行迁移
//
// 可选 env：AI_TERM_ADMIN_BASE_URL（默认 https://zhizhi.xyz）

const defaultBaseUrl = "https://zhizhi.xyz";
const apply = process.argv.slice(2).includes("--apply");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const cookie = process.env.AI_TERM_ADMIN_COOKIE?.trim();
if (!cookie) {
  fail("缺少 AI_TERM_ADMIN_COOKIE：登录后台后复制管理员 Cookie 头的值。");
}

const baseUrl = (process.env.AI_TERM_ADMIN_BASE_URL?.trim() || defaultBaseUrl).replace(/\/+$/, "");
const endpoint = `${baseUrl}/api/admin/media/migrate-ai-term-diagrams`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookie,
  },
  body: JSON.stringify({ dryRun: !apply }),
}).catch((error) => fail(`请求失败：${error?.message ?? error}`));

const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  fail(`响应不是 JSON（HTTP ${response.status}）：${text.slice(0, 300)}`);
}

if (!response.ok) {
  fail(`HTTP ${response.status}：${payload.error ?? text.slice(0, 300)}`);
}

console.log(`模式：${payload.dryRun ? "DRY-RUN（未写入）" : "APPLY（已执行）"}`);
console.log(`扫描到旧图解：${payload.total} 个，本次${payload.dryRun ? "将迁移" : "已迁移"}：${payload.migratedCount} 个`);

for (const item of payload.migrated ?? []) {
  console.log(`  ${item.oldKey}  ->  ${item.newKey}`);
}

if (payload.skipped?.length) {
  console.log("跳过：");
  for (const item of payload.skipped) {
    console.log(`  ${item.key}（${item.reason}）`);
  }
}

if (payload.dryRun && payload.total > 0) {
  console.log("\n确认无误后，加 --apply 真正执行。");
}
