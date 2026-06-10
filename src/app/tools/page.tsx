import { ToolsPageShell } from "@/components/tools/tools-page-shell";
import { ToolsWorkbench } from "@/components/tools/tools-workbench";

const title = "在线工具台";
const description = "知之的本地工具台，提供 JSON、编码、时间和文本等常用转换工具，全部在浏览器本地运行，数据不上传。";

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
    <ToolsPageShell title={title}>
      <ToolsWorkbench />
    </ToolsPageShell>
  );
}
