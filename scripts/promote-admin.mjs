import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const mode = args.includes("--remote") ? "--remote" : "--local";

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

const database = readOption("--db", "zhizhi");
const envName = readOption("--env", "");
const configPath = readOption("--config", "");
const optionValueIndexes = new Set();
for (const name of ["--config", "--db", "--env"]) {
  const index = args.indexOf(name);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    optionValueIndexes.add(index + 1);
  }
}
const email = args.find((arg, index) => !arg.startsWith("--") && !optionValueIndexes.has(index));

if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:promote:local -- user@example.com");
  console.error("   or: npm run admin:promote:remote -- user@example.com");
  console.error("   or: npm run admin:promote:test -- user@example.com");
  console.error("   or: npm run admin:promote:test:local -- user@example.com");
  console.error("Options: --db <database-name> --env <environment-name>");
  process.exit(1);
}

const wranglerBin = join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(wranglerBin)) {
  console.error("Wrangler is not installed. Run npm ci first.");
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();
const escapedEmail = normalizedEmail.replaceAll("'", "''");
const timestamp = Date.now();
const sql = [
  `UPDATE users SET role='admin', updated_at=${timestamp} WHERE email='${escapedEmail}';`,
  `SELECT id, email, role, status FROM users WHERE email='${escapedEmail}';`,
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
  console.error("Could not verify whether the admin promotion matched a user.");
  process.exit(1);
}

if (!selectedUser) {
  console.error(`No user found with email ${normalizedEmail} in ${mode === "--remote" ? "remote" : "local"} D1: ${target}.`);
  process.exit(1);
}

if (selectedUser.role !== "admin") {
  console.error(`User ${normalizedEmail} was found, but role is still ${selectedUser.role}.`);
  process.exit(1);
}

console.log(`Promoted ${normalizedEmail} to admin in ${mode === "--remote" ? "remote" : "local"} D1: ${target}.`);
