export type ReadingMode = "full" | "quick";

export type LayeredBlockType = "detail" | "example" | "warning" | "advanced" | "author";

export type ArticleContentBlock =
  | {
      id: string;
      kind: "markdown";
      html: string;
    }
  | {
      id: string;
      kind: "layer";
      type: LayeredBlockType;
      title: string;
      html: string;
    };

export type ArticleTocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};
