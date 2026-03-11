/**
 * Shared utility for loading references from content/shared-references/
 *
 * Can be used by Astro projects to load bibliographic data.
 *
 * Usage:
 *   import { loadReferences, loadReferencesByKeys } from '../../helpers/shared-references';
 *
 *   // Load all references
 *   const allRefs = await loadReferences();
 *
 *   // Load specific references by citation keys
 *   const specificRefs = await loadReferencesByKeys(['vincent2019datastrikes', 'bender_stochastic_parrots_2021']);
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseFrontmatter, slugFromFilename } from './markdown';

export interface Reference {
  citation_key: string;
  entry_type: string;
  title: string;
  authors: string[];
  year: string;
  venue?: string;
  url?: string;
  doi?: string;
  abstract?: string;
  pages?: string;
  booktitle?: string;
  journal?: string;
  semantic_scholar_url?: string;
  google_scholar_url?: string;
  tags?: string[];
  [key: string]: unknown;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map((item) => String(item)) : undefined;
}

// During Astro build, import.meta.dirname points to dist/chunks, so we need
// a more robust path resolution. We try multiple strategies:
function resolveSharedRefsPath(): string {
  // Strategy 1: Environment variable (most explicit)
  if (process.env.SHARED_REFS_PATH) {
    return process.env.SHARED_REFS_PATH;
  }

  // Strategy 2+: Check a few likely repo-relative locations.
  const baseDir = import.meta.dirname ?? __dirname;
  const candidates = [
    path.resolve(process.cwd(), 'content/shared-references'),
    path.resolve(baseDir, '../content/shared-references'),
    path.resolve(baseDir, '../../content/shared-references'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const SHARED_REFS_PATH = resolveSharedRefsPath();

let cachedReferences: Map<string, Reference> | null = null;

/**
 * Load all references from shared-references directory
 */
export async function loadReferences(options: { force?: boolean; basePath?: string } = {}): Promise<Map<string, Reference>> {
  if (cachedReferences && !options.force && !options.basePath) {
    return cachedReferences;
  }

  const baseRefsPath = options.basePath || SHARED_REFS_PATH;
  // Bibtex entries live in the bibtex-entries subdirectory
  const refsPath = path.join(baseRefsPath, 'bibtex-entries');
  const refs = new Map<string, Reference>();

  try {
    const files = await readdir(refsPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(refsPath, file);
      const content = await readFile(filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      if (data.type !== 'bibtex_entry') continue;

      const ref: Reference = {
        citation_key: asString(data.citation_key, slugFromFilename(file)),
        entry_type: asString(data.entry_type, 'misc'),
        title: asString(data.title),
        authors: Array.isArray(data.authors) ? data.authors.map((author) => String(author)) : [],
        year: asString(data.year),
        venue: asOptionalString(data.venue),
        url: asOptionalString(data.url),
        doi: asOptionalString(data.doi),
        abstract: asOptionalString(data.abstract),
        pages: asOptionalString(data.pages),
        booktitle: asOptionalString(data.booktitle),
        journal: asOptionalString(data.journal),
        semantic_scholar_url: asOptionalString(data.semantic_scholar_url),
        google_scholar_url: asOptionalString(data.google_scholar_url),
        tags: asStringArray(data.tags),
      };

      // Copy any additional fields
      for (const [key, value] of Object.entries(data)) {
        if (!(key in ref)) {
          ref[key] = value;
        }
      }

      refs.set(ref.citation_key, ref);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }

  cachedReferences = refs;
  return refs;
}

/**
 * Load specific references by citation keys
 */
export async function loadReferencesByKeys(keys: string[], options: { basePath?: string } = {}): Promise<Reference[]> {
  const allRefs = await loadReferences(options);
  const result: Reference[] = [];

  for (const key of keys) {
    const ref = allRefs.get(key);
    if (ref) {
      result.push(ref);
    }
  }

  return result;
}

/**
 * Load references that have any of the specified tags
 */
export async function loadReferencesByTags(tags: string[], options: { basePath?: string } = {}): Promise<Reference[]> {
  const allRefs = await loadReferences(options);
  const results: Reference[] = [];
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  for (const ref of allRefs.values()) {
    if (ref.tags?.some(t => tagSet.has(t.toLowerCase()))) {
      results.push(ref);
    }
  }

  return results;
}

/**
 * Format a reference as a citation string
 */
export function formatCitation(ref: Reference, style: 'apa' | 'short' = 'short'): string {
  if (style === 'short') {
    const firstAuthor = ref.authors[0]?.split(',')[0] || 'Unknown';
    const etAl = ref.authors.length > 1 ? ' et al.' : '';
    return `${firstAuthor}${etAl} (${ref.year})`;
  }

  // APA-ish format
  const authors = ref.authors.join(', ');
  return `${authors} (${ref.year}). ${ref.title}. ${ref.venue || ref.journal || ref.booktitle || ''}`;
}

/**
 * Get the priority number for a reference
 * Looks for tags like 'priority:1', 'priority:2', etc.
 * Returns the priority number, or Infinity if no priority tag
 */
export function getPriority(ref: Reference): number {
  if (!ref.tags) return Infinity;

  for (const tag of ref.tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('priority:')) {
      const num = parseInt(lower.slice('priority:'.length), 10);
      if (!isNaN(num)) return num;
    }
  }
  return Infinity;
}
