import { randomUUID, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const mode = args.includes("--remote") ? "--remote" : "--local";
const passwordIterations = 100_000;

function readOption(name, fallback) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return fallback;
}

const optionValueIndexes = new Set();
for (const name of ["--config", "--db", "--env", "--password"]) {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    optionValueIndexes.add(index + 1);
  }
}

const database = readOption("--db", "zhizhi");
const envName = readOption("--env", "");
const configPath = readOption("--config", "");
const password = readOption("--password", process.env.ADMIN_PASSWORD ?? "");
const email = args.find((arg, index) => !arg.startsWith("--") && !optionValueIndexes.has(index));

if (!email || !email.includes("@") || !password || password.length < 8) {
  console.error("Usage: npm run admin:create:local -- user@example.com --password your-strong-password");
  console.error("   or: npm run admin:create:remote -- user@example.com --password your-strong-password");
  console.error("   or: npm run admin:create:test -- user@example.com --password your-strong-password");
  console.error("   or: npm run admin:create:test:local -- user@example.com --password your-strong-password");
  console.error("You can also set ADMIN_PASSWORD instead of passing --password.");
  process.exit(1);
}

const wranglerBin = join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(wranglerBin)) {
  console.error("Wrangler is not installed. Run npm ci first.");
  process.exit(1);
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function hashPassword(value) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: passwordIterations,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return `pbkdf2:${passwordIterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

const normalizedEmail = email.trim().toLowerCase();
const displayName = normalizedEmail.split("@")[0] || "admin";
const timestamp = Date.now();
const passwordHash = await hashPassword(password);
const userId = randomUUID();
const sql = [
  `INSERT INTO users (id, email, password_hash, display_name, avatar_url, role, status, preferred_locale, preferred_reading_mode, email_verified_at, last_login_at, created_at, updated_at) VALUES (${sqlString(userId)}, ${sqlString(normalizedEmail)}, ${sqlString(passwordHash)}, ${sqlString(displayName)}, NULL, 'admin', 'active', 'zh', 'full', ${timestamp}, ${timestamp}, ${timestamp}, ${timestamp}) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, role='admin', status='active', updated_at=${timestamp};`,
  `SELECT id, email, role, status FROM users WHERE email=${sqlString(normalizedEmail)};`,
].join(" ");
const wranglerArgs = ["d1", "execute", database, mode, "--json", "--command", sql];

if (envName) {
  wranglerArgs.push("--env", envName);
}

if (configPath) {
  wranglerArgs.push("--config", configPath);
}

const result = spawnSync(process.execPath, [wranglerBin, ...wranglerArgs], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.status ?? 1);
}

const target = envName ? `${database} (${envName})` : database;
if (result.stderr) {
  process.stderr.write(result.stderr);
}

let selectedUser = null;
try {
  const output = JSON.parse(result.stdout);
  selectedUser = output
    .flatMap((entry) => entry.results ?? [])
    .find((row) => row.email === normalizedEmail);
} catch {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  console.error("Could not verify whether the admin user was created.");
  process.exit(1);
}

if (!selectedUser || selectedUser.role !== "admin" || selectedUser.status !== "active") {
  console.error(`Admin user ${normalizedEmail} was not created correctly in ${mode === "--remote" ? "remote" : "local"} D1: ${target}.`);
  process.exit(1);
}

console.log(`Created or updated admin ${normalizedEmail} in ${mode === "--remote" ? "remote" : "local"} D1: ${target}.`);
