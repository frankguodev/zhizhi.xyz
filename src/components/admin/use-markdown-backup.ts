import { useCallback, useEffect, useState } from "react";

/**
 * 后台 Markdown 工作台的本地暂存：把编辑中的 Markdown 防抖写入 localStorage，
 * 中途意外退出后下次打开可恢复。保存成功后由调用方 `clearBackup()` 清除。
 *
 * - `baseline` 是“无需暂存”的基准值：导入页传示例稿，编辑页传初始已保存稿。
 *   挂载时只有当本地稿与基准不同才提示可恢复；写入时与基准相同则跳过。
 * - `dirty` 用于在编辑页避免把未改动内容写入；导入页可省略（默认按是否等于基准判断）。
 */
export function useMarkdownBackup({
  backupKey,
  value,
  baseline,
  dirty = true,
}: {
  backupKey: string;
  value: string;
  baseline: string;
  dirty?: boolean;
}) {
  const [backupText, setBackupText] = useState("");
  const [backupAvailable, setBackupAvailable] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const backup = window.localStorage.getItem(backupKey);
      if (backup && backup !== baseline) {
        setBackupText(backup);
        setBackupAvailable(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [backupKey, baseline]);

  useEffect(() => {
    if (!dirty || value === baseline) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(backupKey, value);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [backupKey, dirty, value, baseline]);

  const hideBackup = useCallback(() => setBackupAvailable(false), []);

  const clearBackup = useCallback(() => {
    window.localStorage.removeItem(backupKey);
    setBackupText("");
    setBackupAvailable(false);
  }, [backupKey]);

  return { backupAvailable, backupText, hideBackup, clearBackup };
}
