import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("en", "privacy");

export default function EnglishPrivacyPage() {
  return <LegalPage content={legalPages.en.privacy} currentPath="/en/privacy" locale="en" />;
}
