#!/usr/bin/env node
import { spawn } from "node:child_process";

function usage() {
  console.log(`Usage:
  npm run ai-term:check -- <TERM>

Runs local checks: validate, import dry-run, and diagram check.`);
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const term = String(args.find((arg) => !arg.startsWith("-")) ?? "").trim();
  if (!term || term === "-h" || term === "--help") {
    usage();
    process.exit(term ? 0 : 1);
  }

  const steps = [
    ["validate", ["npm.cmd", ["run", "ai-term:validate", "--", term]]],
    ["import dry-run", ["npm.cmd", ["run", "ai-term:import:dry-run", "--", term]]],
    ["diagram check", ["npm.cmd", ["run", "ai-term:diagram:check", "--", term]]],
  ];

  let failed = false;
  for (const [label, [command, commandArgs]] of steps) {
    console.log(`\n== ${label}: ${term} ==`);
    const code = await run(command, commandArgs);
    if (code !== 0) {
      failed = true;
      console.log(`Step failed: ${label} (exit ${code})`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
