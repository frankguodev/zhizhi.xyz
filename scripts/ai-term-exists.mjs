#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();
const defaultBaseUrl = "https://zhizhi.xyz";
const defaultEnvBaseUrls = {
  prod: defaultBaseUrl,
  test: "",
};

function usage() {
  console.log(`Usage:
  npm run ai-term:exists:test -- <TERM>
  npm run ai-term:exists:prod -- <TERM>
  node scripts/ai-term-exists.mjs --env test <TERM>
  node scripts/ai-term-exists.mjs --env test --slug hallucination

Exit code:
  0  Target database does not have this locale + slug.
  2  Target database already has this locale + slug.

Auth env (Bearer Token preferred; Cookie is fallback):
  AI_TERM_ADMIN_API_TOKEN       Script token for prod (sent as Authorization: Bearer).
  AI_TERM_TEST_ADMIN_API_TOKEN  Script token for --env test.
  AI_TERM_ADMIN_COOKIE          Fallback admin Cookie header value for prod.
  AI_TERM_TEST_ADMIN_COOKIE     Fallback test admin Cookie header value.

Optional env:
  AI_TERM_ADMIN_BASE_URL       Defaults to ${defaultBaseUrl} for prod.
  AI_TERM_TEST_ADMIN_BASE_URL  Required for --env test unless AI_TERM_ADMIN_BASE_URL is set.

Env loading:
  Values can be set in the current shell or in project .env.local.
  Shell variables take precedence over .env.local.`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function loadEnvLocal() {
  const envPath = path.join(workspaceRoot, ".env.local");
  let content = "";
  try {
    content = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const withoutExport = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line;
    const separatorIndex = withoutExport.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = withoutExport.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) {
      continue;
    }

    let value = withoutExport.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === `"` || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function optionValue(args, name) {
  const index = args.findIndex((arg) => arg === name);
  return index >= 0 ? args[index + 1] : "";
}

function getTargetEnv(args) {
  const value = String(optionValue(args, "--env") || process.env.AI_TERM_SYNC_ENV || "prod").trim().toLowerCase();
  if (value !== "prod" && value !== "test") {
    fail("AI term exists env must be prod or test.");
  }
  return value;
}

// 优先使用脚本专用 Bearer Token，未配置时回退到复制的后台 Cookie。
function getAuthHeaders(targetEnv) {
  const token =
    (targetEnv === "test" ? process.env.AI_TERM_TEST_ADMIN_API_TOKEN?.trim() : "") ||
    process.env.AI_TERM_ADMIN_API_TOKEN?.trim();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  const cookie =
    (targetEnv === "test" ? process.env.AI_TERM_TEST_ADMIN_COOKIE?.trim() : "") ||
    process.env.AI_TERM_ADMIN_COOKIE?.trim();
  if (cookie) {
    return { Cookie: cookie };
  }

  const tokenName = targetEnv === "test" ? "AI_TERM_TEST_ADMIN_API_TOKEN" : "AI_TERM_ADMIN_API_TOKEN";
  const cookieName = targetEnv === "test" ? "AI_TERM_TEST_ADMIN_COOKIE or AI_TERM_ADMIN_COOKIE" : "AI_TERM_ADMIN_COOKIE";
  fail(`Missing auth for ${targetEnv}. Set ${tokenName} (preferred) or copy ${cookieName} after logging in.`);
}

function getBaseUrl(targetEnv) {
  const value =
    (targetEnv === "test" ? process.env.AI_TERM_TEST_ADMIN_BASE_URL?.trim() : "") ||
    process.env.AI_TERM_ADMIN_BASE_URL?.trim() ||
    defaultEnvBaseUrls[targetEnv];
  if (!value) {
    fail("Missing AI_TERM_TEST_ADMIN_BASE_URL for test check. Set it to your deployed test Worker URL.");
  }
  return value.replace(/\/+$/, "");
}

function normalizeTermArg(value) {
  return String(value ?? "").trim();
}

function slugifyTerm(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocaleAndSlug({ term, rawSlug }) {
  if (rawSlug) {
    return { locale: "zh", slug: rawSlug.trim() };
  }

  const proPath = path.join(workspaceRoot, "summery", "aiterms", "pro", `${term}.md`);
  if (await pathExists(proPath)) {
    const parsed = matter(await fs.readFile(proPath, "utf8"));
    const locale = parsed.data.locale === "en" ? "en" : "zh";
    const slug = typeof parsed.data.slug === "string" ? parsed.data.slug.trim() : "";
    if (slug) {
      return { locale, slug };
    }
  }

  const slug = slugifyTerm(term);
  if (!slug) {
    fail("Missing slug. Provide <TERM> or --slug <slug>.");
  }
  return { locale: "zh", slug };
}

async function getExistingAiTerm({ baseUrl, authHeaders, locale, slug }) {
  const response = await fetch(`${baseUrl}/api/admin/ai-terms/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: { ...authHeaders },
  });
  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    fail(`Existing AI term check failed (${response.status}). ${payload?.error || payload?.hint || "No JSON error returned."}`);
  }

  return payload?.aiTerm || null;
}

async function main() {
  await loadEnvLocal();

  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(0);
  }

  const targetEnv = getTargetEnv(args);
  const rawSlug = normalizeTermArg(optionValue(args, "--slug"));
  const term = normalizeTermArg(args.find((arg, index) => !arg.startsWith("-") && args[index - 1] !== "--env" && args[index - 1] !== "--slug"));
  if (!term && !rawSlug) {
    usage();
    process.exit(1);
  }

  const authHeaders = getAuthHeaders(targetEnv);
  const baseUrl = getBaseUrl(targetEnv);
  const { locale, slug } = await resolveLocaleAndSlug({ term, rawSlug });

  console.log(`Existence check target: ${targetEnv} (${baseUrl})`);
  console.log(`AI term key: ${locale}/${slug}`);

  const existing = await getExistingAiTerm({ baseUrl, authHeaders, locale, slug });
  if (!existing) {
    console.log("Result: not found. Safe to generate/sync by default.");
    return;
  }

  console.log(`Result: exists. ${existing.term || existing.slug} (${existing.status}, ${existing.visibility})`);
  console.log(`${baseUrl}/admin/ai-terms/${locale}/${slug}`);
  process.exit(2);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
