import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

function findRemoteProcesses() {
  const patterns = ["opennextjs-cloudflare", "wrangler", "cf:preview", "next/dist/bin/next", ".open-next"];
  let raw = "";

  try {
    raw = execFileSync(
      "wmic.exe",
      ["process", "where", "(name='node.exe' or name='wrangler.exe' or name='workerd.exe')", "get", "CommandLine,Name,ProcessId", "/format:list"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    return [];
  }

  const blocks = raw
    .split(/\r?\n\r?\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const processes = [];

  for (const block of blocks) {
    const commandLine = (block.match(/^CommandLine=(.*)$/m)?.[1] ?? "").trim();
    const name = (block.match(/^Name=(.*)$/m)?.[1] ?? "").trim();
    const processId = Number((block.match(/^ProcessId=(\d+)$/m)?.[1] ?? "0").trim());
    if (!processId || !name) continue;
    if (!commandLine && name.toLowerCase() !== "workerd.exe") continue;

    const lower = commandLine.toLowerCase();
    if (name.toLowerCase() === "workerd.exe" || patterns.some((pattern) => lower.includes(pattern))) {
      processes.push({ ProcessId: processId, Name: name, CommandLine: commandLine });
    }
  }

  return processes;
}

function stopProcess(processId) {
  try {
    execFileSync("taskkill.exe", ["/PID", String(processId), "/T", "/F"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function removeOpenNextDir() {
  const dir = path.resolve(".open-next");
  if (!existsSync(dir)) return;

  const remove = () => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

  try {
    remove();
    console.log(`[remote-stop] removed: ${dir}`);
  } catch (error) {
    try {
      execFileSync("attrib.exe", ["-R", "-S", "-H", dir, "/S", "/D"], { stdio: "ignore" });
      remove();
      console.log(`[remote-stop] removed after attribute reset: ${dir}`);
      return;
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : String(retryError);
      console.warn(`[remote-stop] failed to remove ${dir}: ${message}`);
      if (error instanceof Error && error.code === "EPERM") {
        console.warn("[remote-stop] hint: ensure remote preview terminal is fully closed, then run `npm run remote:stop` again.");
      }
    }
  }
}

function main() {
  if (process.platform !== "win32") {
    console.log("[remote-stop] non-windows environment detected; skipped process cleanup.");
    removeOpenNextDir();
    return;
  }

  const processes = findRemoteProcesses();
  if (processes.length === 0) {
    console.log("[remote-stop] no matching remote dev processes found.");
  } else {
    let stopped = 0;
    for (const proc of processes) {
      if (stopProcess(proc.ProcessId)) {
        stopped += 1;
      }
    }
    console.log(`[remote-stop] matched ${processes.length}, stopped ${stopped}.`);
  }

  removeOpenNextDir();
}

main();
