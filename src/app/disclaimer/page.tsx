import { LegalPage } from "@/components/legal/legal-page";
import { legalPageMetadata, legalPages } from "@/lib/legal-pages";

export const metadata = legalPageMetadata("zh", "disclaimer");

export default function DisclaimerPage() {
  return <LegalPage content={legalPages.zh.disclaimer} currentPath="/disclaimer" />;
}
