import { getEntry, type CollectionEntry } from "astro:content";
import katex from "katex";
import { marked } from "marked";

export interface PageSection {
  id: string;
  title: string;
  markdown: string;
  html: string;
}

export interface SplitMarkdownDocument {
  leadMarkdown: string;
  leadHtml: string;
  sections: PageSection[];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function renderMarkdown(markdown: string): string {
  const mathFragments: string[] = [];
  const stashMath = (html: string) => {
    const index = mathFragments.push(html) - 1;
    return index;
  };
  const renderMath = (source: string, displayMode: boolean) =>
    katex.renderToString(source.trim(), {
      displayMode,
      throwOnError: false,
    });

  const withDisplayMath = markdown.trim().replace(/\$\$([\s\S]+?)\$\$/g, (_, source: string) => {
    const index = stashMath(`<div class="math-display">${renderMath(source, true)}</div>`);
    return `\n\n<div data-math-fragment="${index}"></div>\n\n`;
  });

  const withInlineMath = withDisplayMath.replace(/(?<!\\)\$([^\n$]+?)(?<!\\)\$/g, (_, source: string) => {
    const index = stashMath(renderMath(source, false));
    return `<span data-math-fragment="${index}"></span>`;
  });

  return String(marked.parse(withInlineMath))
    .replace(/<div data-math-fragment="(\d+)"><\/div>/g, (_, index: string) => mathFragments[Number(index)] ?? "")
    .replace(/<span data-math-fragment="(\d+)"><\/span>/g, (_, index: string) => mathFragments[Number(index)] ?? "");
}

export function renderMarkdownBlocks(blocks: string[] = []): string[] {
  return blocks.map((block) => renderMarkdown(block));
}

export function splitMarkdownDocument(markdown: string): SplitMarkdownDocument {
  const trimmedMarkdown = markdown.trim();

  if (!trimmedMarkdown) {
    return {
      leadMarkdown: "",
      leadHtml: "",
      sections: [],
    };
  }

  const sections: Array<{ title: string; markdown: string }> = [];
  const leadLines: string[] = [];
  const lines = trimmedMarkdown.split("\n");
  let currentTitle = "";
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    const body = currentLines.join("\n").trim();
    sections.push({ title: currentTitle, markdown: body });
  };

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      flush();
      currentTitle = match[1].trim();
      currentLines = [];
      continue;
    }

    if (!currentTitle) {
      leadLines.push(line);
      continue;
    }

    currentLines.push(line);
  }

  flush();

  const leadMarkdown = leadLines.join("\n").trim();

  return {
    leadMarkdown,
    leadHtml: leadMarkdown ? renderMarkdown(leadMarkdown) : "",
    sections: sections
      .filter((section) => Boolean(section.markdown))
      .map((section) => ({
        id: slugify(section.title),
        title: section.title,
        markdown: section.markdown,
        html: renderMarkdown(section.markdown),
      })),
  };
}

export function splitMarkdownSections(markdown: string): PageSection[] {
  return splitMarkdownDocument(markdown).sections;
}

export async function getRequiredPageEntry(slug: string): Promise<CollectionEntry<"pages">> {
  const entry = await getEntry("pages", slug);
  if (!entry) {
    throw new Error(`Missing page content entry '${slug}'.`);
  }
  return entry;
}
