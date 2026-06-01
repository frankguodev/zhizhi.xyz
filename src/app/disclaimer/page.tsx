import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("disclaimer");

export default function DisclaimerPage() {
  return <LegalPage content={legalPages.disclaimer} currentPath="/disclaimer" />;
}
