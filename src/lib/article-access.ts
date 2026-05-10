import type { ArticleRecord } from "@/data/articles";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export type Viewer = {
  isAuthenticated: boolean;
  user: AuthUser | null;
};

export async function getCurrentViewer(): Promise<Viewer> {
  const user = await getCurrentUser().catch(() => null);
  return { isAuthenticated: Boolean(user), user };
}

export function canListArticle(article: ArticleRecord, viewer: Viewer) {
  void viewer;
  return article.visibility !== "hidden";
}

export function canReadFullArticle(article: ArticleRecord, viewer: Viewer) {
  void viewer;
  return article.visibility !== "hidden";
}

export function createArticlePreview(content: string, maxCharacters = 900) {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let visibleCharacters = 0;
  let insideLayerBlock = false;

  for (const line of lines) {
    if (/^:::(detail|example|warning|advanced|author)(?:\s+.+)?\s*$/.test(line)) {
      insideLayerBlock = true;
      continue;
    }

    if (insideLayerBlock) {
      if (/^:::$/.test(line.trim())) {
        insideLayerBlock = false;
      }
      continue;
    }

    output.push(line);
    visibleCharacters += line.replace(/\s+/g, "").length;

    if (visibleCharacters >= maxCharacters && /^##\s+/.test(line) === false) {
      break;
    }
  }

  return output.join("\n").trim();
}
