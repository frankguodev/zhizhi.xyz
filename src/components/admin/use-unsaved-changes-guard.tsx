"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";

type UnsavedChangesGuardOptions = {
  dirty: boolean;
  title?: string;
  description?: string;
};

export function useUnsavedChangesGuard({
  dirty,
  title = "离开当前页面？",
  description = "当前页面还有未保存修改。离开后，数据库里的草稿不会更新；如果已经生成本地临时稿，下次回来仍可尝试恢复。",
}: UnsavedChangesGuardOptions) {
  const [pendingHref, setPendingHref] = useState("");

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href") ?? "";
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
        return;
      }

      event.preventDefault();
      setPendingHref(anchor.href);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [dirty]);

  const UnsavedChangesDialog = useCallback((): ReactElement | null => {
    if (!pendingHref) {
      return null;
    }

    return (
      <AdminConfirmDialog
        open
        title={title}
        description={description}
        confirmLabel="离开页面"
        cancelLabel="继续编辑"
        tone="danger"
        onCancel={() => setPendingHref("")}
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref("");
          window.location.href = href;
        }}
      />
    );
  }, [description, pendingHref, title]);

  return { UnsavedChangesDialog };
}
