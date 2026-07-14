import type { APIRoute } from "astro";
import { loadPaperCollectionsSnapshot, loadPapersForCollection } from "../lib/content-loader";

export const prerender = true;

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bibEntry(paper: Awaited<ReturnType<typeof loadPapersForCollection>>[number]): string {
  const type = paper.entry_type === "book" ? "book" : paper.entry_type === "inproceedings" ? "inproceedings" : "article";
  const fields = [
    ["title", clean(paper.title)],
    ["author", paper.authors?.map(clean).join(" and ")],
    ["year", clean(paper.year)],
    ["journal", clean(paper.journal || paper.venue)],
    ["booktitle", clean(paper.booktitle)],
    ["doi", clean(paper.doi)],
    ["url", clean(paper.url)],
  ].filter(([, value]) => value);

  const body = fields.map(([key, value]) => `  ${key} = {${value}}`).join(",\n");
  return `@${type}{${clean(paper.citation_key)},\n${body}\n}`;
}

export const GET: APIRoute = async () => {
  const snapshot = await loadPaperCollectionsSnapshot();
  const papers = (await Promise.all(snapshot.collections.map(loadPapersForCollection))).flat();
  const unique = new Map(papers.map((paper) => [paper.citation_key, paper]));
  const body = [...unique.values()]
    .sort((a, b) => a.citation_key.localeCompare(b.citation_key))
    .map(bibEntry)
    .join("\n\n");

  return new Response(`${body}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": 'attachment; filename="data-counterfactuals-related-work.bib"',
    },
  });
};
