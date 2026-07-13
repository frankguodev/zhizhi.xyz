import { permanentRedirect } from "next/navigation";

const title = "在线工具台迁移中";
const description = "知之在线工具台正在迁移到独立站点。";

export const metadata = {
  title,
  description,
  alternates: {
    canonical: "https://tooldb.cn/",
  },
  openGraph: {
    title,
    description,
    url: "https://tooldb.cn/",
    type: "website",
  },
};

export default function ToolsPage() {
  permanentRedirect("https://tooldb.cn/");
}
