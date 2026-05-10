import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("en", "disclaimer");

export default function EnglishDisclaimerPage() {
  return <LegalPage content={legalPages.en.disclaimer} currentPath="/en/disclaimer" locale="en" />;
}
