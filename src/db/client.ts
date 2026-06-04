import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.DB) {
    throw new Error("Cloudflare D1 binding DB is not available. Run with Cloudflare preview or configure D1 first.");
  }

  return drizzle(env.DB, { schema });
}

/** D1 binding 是否可用。用于区分「数据库未配置（本地调试）」与「记录不存在」。 */
export async function isDbAvailable() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return Boolean(env.DB);
  } catch {
    return false;
  }
}
