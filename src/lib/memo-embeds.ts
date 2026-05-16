export interface MemoMarkdownPart {
  type: "markdown";
  markdown: string;
}

export interface MemoExamplePart {
  type: "example";
  id: string;
}

export type MemoArticlePart = MemoMarkdownPart | MemoExamplePart;

const memoExamplePattern = /^[ \t]*\{\{<\s*memo-example\s+([a-z0-9-]+)\s*>\}\}[ \t]*$/gim;

export function stripMemoEmbeds(markdown: string) {
  return markdown.replace(memoExamplePattern, " ");
}

export function splitMemoEmbeds(markdown: string): MemoArticlePart[] {
  const parts: MemoArticlePart[] = [];
  let lastIndex = 0;

  for (const match of markdown.matchAll(memoExamplePattern)) {
    const matchIndex = match.index ?? 0;
    const before = markdown.slice(lastIndex, matchIndex).trim();

    if (before) {
      parts.push({ type: "markdown", markdown: before });
    }

    parts.push({ type: "example", id: match[1] });
    lastIndex = matchIndex + match[0].length;
  }

  const after = markdown.slice(lastIndex).trim();

  if (after) {
    parts.push({ type: "markdown", markdown: after });
  }

  return parts;
}
