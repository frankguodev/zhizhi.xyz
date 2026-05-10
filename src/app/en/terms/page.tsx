import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("en", "terms");

export default function EnglishTermsPage() {
  return <LegalPage content={legalPages.en.terms} currentPath="/en/terms" locale="en" />;
}
