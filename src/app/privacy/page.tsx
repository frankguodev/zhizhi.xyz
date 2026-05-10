import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("zh", "privacy");

export default function PrivacyPage() {
  return <LegalPage content={legalPages.zh.privacy} currentPath="/privacy" />;
}
