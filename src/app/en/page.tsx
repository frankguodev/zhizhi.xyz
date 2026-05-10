import type { Metadata } from "next";
import { HomePage } from "@/components/content/home-page";
import { getPublicHomePayload } from "@/lib/public-home";
import { siteConfig } from "@/lib/site";

const description = "Sharing practical experience ordinary people can replicate, along with honest paths of real growth.";

export const metadata: Metadata = {
  title: siteConfig.nameEn,
  description,
  alternates: {
    canonical: "/en",
    languages: {
      "zh-CN": "/",
      en: "/en",
    },
  },
  openGraph: {
    title: siteConfig.nameEn,
    description,
    url: "/en",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.nameEn,
    description,
  },
};

export const dynamic = "force-dynamic";

export default async function EnglishHomePage() {
  const payload = await getPublicHomePayload("en");

  return <HomePage payload={payload} />;
}
