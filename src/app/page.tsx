import type { Metadata } from "next";
import { HomePage } from "@/components/content/home-page";
import { getPublicHomePayload } from "@/lib/public-home";
import { defaultShareImage, siteConfig } from "@/lib/site";

const description = "分享普通人也能复制的实战经验和真实成长路径。";

export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.name,
    description,
    url: "/",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
    images: [defaultShareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description,
    images: [defaultShareImage.url],
  },
};

export const revalidate = 300;

export default async function Home() {
  const payload = await getPublicHomePayload("zh");

  return <HomePage payload={payload} />;
}
