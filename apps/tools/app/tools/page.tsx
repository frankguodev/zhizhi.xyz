import { ToolsStandaloneShell } from "@/components/tools-standalone/tools-standalone-shell";
import { ToolsWorkbenchClient } from "../../components/tools-workbench-client";

const title = "在线工具箱";
const description = "本地运行的在线工具集合，支持 JSON、图片、二维码、Token、Diff 等常用处理，数据不上传。";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title,
    description,
    url: "/tools",
    type: "website",
  },
};

export default function ToolsPage() {
  return (
    <ToolsStandaloneShell title={title}>
      <ToolsWorkbenchClient />
    </ToolsStandaloneShell>
  );
}
