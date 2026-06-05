#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { optimizedDiagramPath } from "./lib/ai-term-diagram-image.mjs";

const workspaceRoot = process.cwd();
const defaultBaseUrl = "https://zhizhi.xyz";
const defaultEnvBaseUrls = {
  prod: defaultBaseUrl,
  test: "",
};

function usage() {
  console.log(`Usage:
  npm run ai-term:push:prod -- <TERM>
  npm run ai-term:push:test -- <TERM>
  npm run ai-term:push:prod -- <TERM> --dry-run
  node scripts/ai-term-push-prod.mjs --env test <TERM>

Required env:
  AI_TERM_ADMIN_COOKIE       Admin Cookie header value.
  AI_TERM_TEST_ADMIN_COOKIE  Optional test admin Cookie header value.

Optional env:
  AI_TERM_ADMIN_BASE_URL       Defaults to ${defaultBaseUrl} for prod.
  AI_TERM_TEST_ADMIN_BASE_URL  Required for --env test unless AI_TERM_ADMIN_BASE_URL is set.
  AI_TERM_MAX_WEBP_KB          Defaults to 100

Example:
  $env:AI_TERM_ADMIN_COOKIE='zz_admin_session=...'
  npm run ai-term:push:prod -- Agent

  $env:AI_TERM_TEST_ADMIN_BASE_URL='https://zhizhi-test.example.workers.dev'
  $env:AI_TERM_TEST_ADMIN_COOKIE='zz_admin_session=...'
  npm run ai-term:push:test -- Agent`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function normalizeTermArg(value) {
  return String(value ?? "").trim();
}

function getTargetEnv(args) {
  const envIndex = args.findIndex((arg) => arg === "--env");
  const rawValue = envIndex >= 0 ? args[envIndex + 1] : "";
  const value = String(rawValue || process.env.AI_TERM_SYNC_ENV || "prod").trim().toLowerCase();
  if (value !== "prod" && value !== "test") {
    fail("AI term sync env must be prod or test.");
  }
  return value;
}

function getRequiredCookie(targetEnv) {
  const cookie =
    (targetEnv === "test" ? process.env.AI_TERM_TEST_ADMIN_COOKIE?.trim() : "")
    || process.env.AI_TERM_ADMIN_COOKIE?.trim();
  if (!cookie) {
    const name = targetEnv === "test" ? "AI_TERM_TEST_ADMIN_COOKIE or AI_TERM_ADMIN_COOKIE" : "AI_TERM_ADMIN_COOKIE";
    fail(`Missing ${name}. Copy the ${targetEnv} admin Cookie header after logging in.`);
  }
  return cookie;
}

function getBaseUrl(targetEnv) {
  const value =
    (targetEnv === "test" ? process.env.AI_TERM_TEST_ADMIN_BASE_URL?.trim() : "")
    || process.env.AI_TERM_ADMIN_BASE_URL?.trim()
    || defaultEnvBaseUrls[targetEnv];
  if (!value) {
    fail("Missing AI_TERM_TEST_ADMIN_BASE_URL for test sync. Set it to your deployed test Worker URL.");
  }
  return value.replace(/\/+$/, "");
}

function getMaxBytes() {
  const kb = Number(process.env.AI_TERM_MAX_WEBP_KB || "100");
  if (!Number.isFinite(kb) || kb <= 0) {
    fail("AI_TERM_MAX_WEBP_KB must be a positive number.");
  }
  return Math.floor(kb * 1024);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function forceDraftFrontmatter(parsed) {
  const data = parsed.data;
  data.status = "draft";
  data.visibility = data.visibility || "public";
  data.source = {
    ...(data.source && typeof data.source === "object" ? data.source : {}),
    human_reviewed: false,
  };
  return data;
}

function getDiagramAlt(data) {
  const diagram = data.diagram && typeof data.diagram === "object" ? data.diagram : {};
  return typeof diagram.image_alt === "string" && diagram.image_alt.trim() ? diagram.image_alt.trim() : `${data.term || data.slug} 一图看懂`;
}

async function uploadDiagram({ baseUrl, cookie, filePath, locale, slug, alt }) {
  const bytes = await fs.readFile(filePath);
  const formData = new FormData();
  const blob = new Blob([bytes], { type: "image/webp" });
  formData.set("file", blob, path.basename(filePath));
  formData.set("scope", "ai-term");
  formData.set("role", "diagram");
  formData.set("locale", locale);
  formData.set("slug", slug);
  formData.set("alt", alt);

  const response = await fetch(`${baseUrl}/api/admin/media`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.media?.url) {
    fail(`R2 upload failed (${response.status}). ${payload?.error || payload?.hint || "No JSON error returned."}`);
  }

  return payload.media;
}

async function importMarkdown({ baseUrl, cookie, markdown }) {
  const response = await fetch(`${baseUrl}/api/admin/ai-terms`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ markdown }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.aiTerm) {
    fail(`D1 import failed (${response.status}). ${payload?.error || payload?.hint || "No JSON error returned."}`);
  }

  return payload;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const targetEnv = getTargetEnv(args);
  const term = normalizeTermArg(args.find((arg, index) => !arg.startsWith("-") && args[index - 1] !== "--env"));
  if (!term || args.includes("-h") || args.includes("--help")) {
    usage();
    process.exit(args.includes("-h") || args.includes("--help") ? 0 : 1);
  }

  const cookie = dryRun ? "" : getRequiredCookie(targetEnv);
  const baseUrl = getBaseUrl(targetEnv);
  const maxBytes = getMaxBytes();
  const proPath = path.join(workspaceRoot, "summery", "aiterms", "pro", `${term}.md`);
  if (!(await pathExists(proPath))) {
    fail(`Pro markdown not found: ${proPath}`);
  }

  const markdown = await fs.readFile(proPath, "utf8");
  const parsed = matter(markdown);
  const data = forceDraftFrontmatter(parsed);
  const locale = data.locale === "en" ? "en" : data.locale === "zh" ? "zh" : null;
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  if (!locale || !slug) {
    fail("Frontmatter must contain locale zh/en and slug before uploading a diagram.");
  }

  const outputWebp = optimizedDiagramPath(term);
  if (!(await pathExists(outputWebp))) {
    fail(`Optimized diagram not found: ${path.relative(workspaceRoot, outputWebp)}. Run npm run ai-term:diagram:optimize -- ${term} first.`);
  }
  const optimizedStats = await fs.stat(outputWebp);
  if (optimizedStats.size > maxBytes) {
    fail(`Optimized diagram exceeds ${Math.round(maxBytes / 1024)}KB: ${Math.round(optimizedStats.size / 1024)}KB. Re-run npm run ai-term:diagram:optimize -- ${term}.`);
  }
  console.log(`Sync target: ${targetEnv} (${baseUrl})`);
  console.log(`Optimized diagram: ${path.relative(workspaceRoot, outputWebp)} (${Math.round(optimizedStats.size / 1024)}KB, WebP)`);

  if (dryRun) {
    console.log("Dry run complete. R2 upload, pro markdown update, and D1 import were skipped.");
    return;
  }

  const alt = getDiagramAlt(data);
  const media = await uploadDiagram({ baseUrl, cookie, filePath: outputWebp, locale, slug, alt });
  console.log(`Uploaded diagram: ${media.url}`);

  data.diagram = {
    ...(data.diagram && typeof data.diagram === "object" ? data.diagram : {}),
    image: media.url,
    image_alt: alt,
  };

  const updatedMarkdown = matter.stringify(parsed.content.trim(), data).trim() + "\n";
  await fs.writeFile(proPath, updatedMarkdown, "utf8");
  console.log(`Updated pro markdown: ${path.relative(workspaceRoot, proPath)}`);

  const imported = await importMarkdown({ baseUrl, cookie, markdown: updatedMarkdown });
  console.log(`Imported draft: ${imported.aiTerm.locale}/${imported.aiTerm.slug} (${imported.aiTerm.id})`);
  if (imported.importWarnings?.length) {
    console.log("Import warnings:");
    for (const warning of imported.importWarnings) {
      console.log(`- ${warning}`);
    }
  }
  console.log(`${baseUrl}/admin/ai-terms/drafts`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
