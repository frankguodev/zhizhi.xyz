"use client";

import { ToolsWorkbench } from "@/components/tools/tools-workbench";
import type { ToolTab } from "@/components/tools/tool-types";

export function ToolsWorkbenchClient({ initialTool }: { initialTool?: ToolTab }) {
  return <ToolsWorkbench initialTool={initialTool} />;
}
