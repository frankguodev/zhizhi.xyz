import { ToolsPageShell } from "@/components/tools/tools-page-shell";
import { ToolsWorkbench } from "@/components/tools/tools-workbench";

const title = "在线工具台";
const description = "知之在线工具台，提供 JSON、编码、时间戳、文本处理、Diff、图片压缩转换、二维码和 Base64 等常用工具，全部在浏览器本地运行，数据不上传。";

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
