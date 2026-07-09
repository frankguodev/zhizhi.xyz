import { permanentRedirect } from "next/navigation";

export default function LegacyImageAsciiPage() {
  permanentRedirect("/tools/image-to-ascii");
}
