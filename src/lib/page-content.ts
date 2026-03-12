import { getEntry, type CollectionEntry } from "astro:content";
import { marked } from "marked";

export interface PageSection {
  id: string;
  title: string;
  markdown: string;
  html: string;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function renderMarkdown(markdown: string): string {
  return String(marked.parse(markdown.trim()));
}

export function renderMarkdownBlocks(blocks: string[] = []): string[] {
  return blocks.map((block) => renderMarkdown(block));
}

export function splitMarkdownSections(markdown: string): PageSection[] {
  const sections: Array<{ title: string; markdown: string }> = [];
  const lines = markdown.trim().split("\n");
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

    if (!currentTitle) continue;
    currentLines.push(line);
  }

  flush();

  return sections
    .filter((section) => Boolean(section.markdown))
    .map((section) => ({
      id: slugify(section.title),
      title: section.title,
      markdown: section.markdown,
      html: renderMarkdown(section.markdown),
    }));
}

export function getSection(sections: PageSection[], id: string): PageSection {
  const section = sections.find((candidate) => candidate.id === id);
  if (!section) {
    throw new Error(`Missing content section '${id}'.`);
  }
  return section;
}

export async function getRequiredPageEntry(slug: string): Promise<CollectionEntry<"pages">> {
  const entry = await getEntry("pages", slug);
  if (!entry) {
    throw new Error(`Missing page content entry '${slug}'.`);
  }
  return entry;
}
