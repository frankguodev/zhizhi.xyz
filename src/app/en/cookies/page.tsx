import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("en", "cookies");

export default function EnglishCookiesPage() {
  return <LegalPage content={legalPages.en.cookies} currentPath="/en/cookies" locale="en" />;
}
