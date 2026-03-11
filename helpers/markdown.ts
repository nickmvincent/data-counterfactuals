import { load as loadYaml } from 'js-yaml';

export type Frontmatter = Record<string, unknown>;

export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = (loadYaml(match[1]) as Frontmatter) || {};
  const body = raw.slice(match[0].length).trim();
  return { data, body };
}

export function slugFromFilename(name: string): string {
  return name.replace(/\.md$/i, '');
}
