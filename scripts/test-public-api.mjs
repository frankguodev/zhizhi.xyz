import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PUBLIC_API_TEST_PORT ?? 3217);
let baseUrl = process.env.PUBLIC_API_TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
const nextBin = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  if (!child.pid || child.killed) {
    return Promise.resolve();
  }

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      execFile("taskkill", ["/pid", String(child.pid), "/t", "/f"], () => resolve());
    });
  }

  child.kill("SIGTERM");
  return Promise.resolve();
}

async function waitForServer() {
  const deadline = Date.now() + 90000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/public/home?locale=zh`);
      if (response.status === 200 || response.status === 503) {
        return;
      }
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for test server: ${lastError}`);
}

async function canUseServer(url) {
  try {
    const response = await fetch(`${url}/api/public/home?locale=zh`, { signal: AbortSignal.timeout(1800) });
    return response.status === 200 || response.status === 503;
  } catch {
    return false;
  }
}

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const body = await response.json().catch(() => null);
  return { response, body };
}

function expectNoStore(response) {
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

function expectPublicCache(response) {
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=60/);
  assert.match(response.headers.get("cache-control") ?? "", /stale-while-revalidate=300/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

async function runTests() {
  {
    const { response, body } = await getJson("/api/public/home?locale=fr");
    assert.equal(response.status, 400);
    expectNoStore(response);
    assert.equal(body.error, "Invalid locale. Use zh or en.");
  }

  {
    const { response, body } = await getJson("/api/public/home?locale=zh");
    assert.equal(response.status, 200);
    expectPublicCache(response);
    assert.equal(response.headers.get("content-language"), "zh-CN");
    assert.equal(body.locale, "zh");
    assert.ok(Array.isArray(body.latestArticles));
    assert.ok(Array.isArray(body.popularArticles));
    assert.ok(Array.isArray(body.featuredSeries));
    assert.ok(Array.isArray(body.externalLinks));
  }

  {
    const { response, body } = await getJson("/api/public/articles?limit=51");
    assert.equal(response.status, 400);
    expectNoStore(response);
    assert.match(body.error, /Invalid limit/);
  }

  {
    const { response, body } = await getJson("/api/public/articles?locale=zh&sort=latest&limit=1");
    assert.equal(response.status, 200);
    expectPublicCache(response);
    assert.equal(body.locale, "zh");
    assert.equal(body.sort, "latest");
    assert.ok(Array.isArray(body.articles));
    assert.ok(Array.isArray(body.facets.categories));
    assert.ok(Array.isArray(body.facets.tags));
    assert.equal(body.pagination.limit, 1);
    assert.equal(body.articles[0]?.content, undefined);
  }

  {
    const { response } = await getJson("/api/public/articles/not_valid?locale=zh");
    assert.equal(response.status, 400);
    expectNoStore(response);
  }

  {
    const { response, body } = await getJson("/api/public/articles/ai-obsidian-writing-workflow?locale=zh");
    assert.equal(response.status, 200);
    expectPublicCache(response);
    assert.equal(body.article.slug, "ai-obsidian-writing-workflow");
    assert.equal(body.article.content, undefined);
    assert.equal(body.content.format, "layered-html");
    assert.ok(Array.isArray(body.content.blocks));
  }

  {
    const { response } = await getJson("/api/public/articles/missing-article?locale=zh");
    assert.equal(response.status, 404);
    expectNoStore(response);
  }

  {
    const { response, body } = await getJson("/api/public/series?locale=en&sort=updated&limit=10");
    assert.equal(response.status, 200);
    expectPublicCache(response);
    assert.equal(response.headers.get("content-language"), "en");
    assert.equal(body.locale, "en");
    assert.equal(body.sort, "updated");
    assert.ok(Array.isArray(body.series));
  }

  {
    const { response } = await getJson("/api/public/series?offset=-1");
    assert.equal(response.status, 400);
    expectNoStore(response);
  }

  {
    const { response } = await getJson("/api/public/series/not_valid?locale=zh");
    assert.equal(response.status, 400);
    expectNoStore(response);
  }

  {
    const { response, body } = await getJson("/api/public/links?locale=zh&position=home");
    assert.equal(response.status, 200);
    expectPublicCache(response);
    assert.equal(body.position, "home");
    assert.ok(Array.isArray(body.links));
  }

  {
    const { response } = await getJson("/api/public/links?locale=zh&position=donate");
    assert.equal(response.status, 400);
    expectNoStore(response);
  }
}

let server = null;

try {
  if (!process.env.PUBLIC_API_TEST_BASE_URL && (await canUseServer("http://127.0.0.1:3000"))) {
    baseUrl = "http://127.0.0.1:3000";
  } else {
    const serverCommand =
      process.platform === "win32"
        ? {
            command: process.env.ComSpec ?? "cmd.exe",
            args: ["/d", "/s", "/c", `npm.cmd run dev:next -- --hostname 127.0.0.1 --port ${port}`],
          }
        : {
            command: nextBin,
            args: ["dev", "--hostname", "127.0.0.1", "--port", String(port)],
          };

    server = spawn(serverCommand.command, serverCommand.args, {
      cwd: root,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));

    await waitForServer();
  }

  await runTests();
  console.log("Public API smoke tests passed.");
} finally {
  if (server) {
    await killProcessTree(server);
  }
}
