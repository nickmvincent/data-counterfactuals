import { existsSync, promises as fs } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter, slugFromFilename } from '../../helpers/markdown';
import { isSembleConfigured, loadSembleDataset } from '../../helpers/semble';
import { loadReferencesByKeys, loadReferencesByTags, formatCitation as formatReferenceCitation } from '../../helpers/shared-references';

function resolveProjectPath(...segments: string[]): string {
  const fromCwd = resolve(process.cwd(), ...segments);
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  return resolve(repoRoot, ...segments);
}

const CONTENT_DIR = resolveProjectPath('content', 'data-counterfactuals');
const SHARED_REFS_DIR = resolveProjectPath('content', 'shared-references');
// Paper collections now live in shared-references
const PAPER_COLLECTION_DIR = join(SHARED_REFS_DIR, 'paper-collections');
const LEGACY_PAPER_COLLECTION_FILE = join(CONTENT_DIR, 'paper-collection.md');

export interface Paper {
  citation_key: string;
  entry_type: string;
  title: string;
  authors: string[];
  year: string;
  venue?: string;
  url?: string;
  doi?: string;
  abstract?: string;
  tags?: string[];
  semantic_scholar_url?: string;
  google_scholar_url?: string;
  body?: string;
  [key: string]: unknown;
}

export interface PaperCollection {
  slug: string;
  title: string;
  citation_keys: string[];
  include_tags?: string[];
  visibility?: string;
  body?: string;
}

async function parsePaperCollection(filePath: string): Promise<PaperCollection | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);

    if (data.type !== 'paper_collection') return null;

    const citationKeys = Array.isArray(data.citation_keys)
      ? data.citation_keys.map((k) => String(k))
      : [];

    const includeTags = Array.isArray(data.include_tags)
      ? data.include_tags.map((t) => String(t))
      : undefined;

    const filename = basename(filePath);
    return {
      slug: slugFromFilename(filename),
      title: (data.title as string) || slugFromFilename(filename),
      citation_keys: citationKeys,
      include_tags: includeTags,
      visibility: data.visibility as string | undefined,
      body: body || undefined,
    };
  } catch {
    return null;
  }
}

export async function loadPaperCollections(): Promise<PaperCollection[]> {
  if (isSembleConfigured()) {
    const dataset = await loadSembleDataset();
    if (dataset) {
      return dataset.collections.map((collection) => ({
        slug: collection.slug,
        title: collection.title,
        citation_keys: [...collection.citation_keys],
        visibility: collection.visibility,
        body: collection.body,
      }));
    }
  }

  const collections: PaperCollection[] = [];

  try {
    const files = await fs.readdir(PAPER_COLLECTION_DIR);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const collection = await parsePaperCollection(join(PAPER_COLLECTION_DIR, file));
      if (collection) collections.push(collection);
    }
  } catch {
    // Directory may not exist
  }

  const legacyCollection = await parsePaperCollection(LEGACY_PAPER_COLLECTION_FILE);
  if (legacyCollection) collections.push(legacyCollection);

  collections.sort((a, b) => a.title.localeCompare(b.title));
  return collections;
}

/**
 * Load paper citation keys from all paper-collection files
 * Resolves include_tags to actual citation keys
 */
export async function loadPaperCollectionKeys(): Promise<string[]> {
  const collections = await loadPaperCollections();
  const keys = new Set<string>();

  for (const collection of collections) {
    // Add explicit citation keys
    for (const key of collection.citation_keys) keys.add(key);

    // Resolve include_tags to citation keys
    if (collection.include_tags && collection.include_tags.length > 0) {
      const taggedRefs = await loadReferencesByTags(collection.include_tags);
      for (const ref of taggedRefs) {
        keys.add(ref.citation_key);
      }
    }
  }
  return Array.from(keys);
}

/**
 * Get the priority number for a paper
 * Looks for tags like 'priority:1', 'priority:2', etc.
 * Returns the priority number, or Infinity if no priority tag
 */
export function getPriority(paper: Paper): number {
  if (!paper.tags) return Infinity;

  for (const tag of paper.tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('priority:')) {
      const num = parseInt(lower.slice('priority:'.length), 10);
      if (!isNaN(num)) return num;
    }
  }
  return Infinity;
}

/**
 * Get papers for a specific collection (resolves both citation_keys and include_tags)
 * Papers are sorted by priority number (ascending), then by year (descending)
 */
export async function loadPapersForCollection(collection: PaperCollection): Promise<Paper[]> {
  const keys = new Set<string>();
  const referenceOptions = isSembleConfigured() ? {} : { basePath: SHARED_REFS_DIR };

  // Add explicit citation keys
  for (const key of collection.citation_keys) keys.add(key);

  // Resolve include_tags
  if (collection.include_tags && collection.include_tags.length > 0) {
    const taggedRefs = await loadReferencesByTags(collection.include_tags, referenceOptions);
    for (const ref of taggedRefs) {
      keys.add(ref.citation_key);
    }
  }

  const papers = await loadSharedPapers(Array.from(keys));

  // Sort: priority papers first (by number), then by year
  papers.sort((a, b) => {
    const aPriority = getPriority(a);
    const bPriority = getPriority(b);

    // Sort by priority first (lower number = higher priority)
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // If same priority (or both unprioritized), sort by year descending
    return parseInt(b.year || '0') - parseInt(a.year || '0');
  });

  return papers;
}

/**
 * Load papers from shared-references by citation keys
 */
export async function loadSharedPapers(keys: string[]): Promise<Paper[]> {
  const referenceOptions = isSembleConfigured() ? {} : { basePath: SHARED_REFS_DIR };
  const refs = await loadReferencesByKeys(keys, referenceOptions);
  return refs.map((ref) => ({
    citation_key: ref.citation_key,
    entry_type: ref.entry_type,
    title: ref.title,
    authors: ref.authors,
    year: ref.year,
    venue: ref.venue,
    url: ref.url,
    doi: ref.doi,
    abstract: ref.abstract,
    tags: ref.tags as string[] | undefined,
    semantic_scholar_url: ref.semantic_scholar_url as string | undefined,
    google_scholar_url: ref.google_scholar_url as string | undefined,
  }));
}

/**
 * Load all available papers from the shared paper collection
 */
export async function loadAllPapers(sharedKeys?: string[]): Promise<Paper[]> {
  const keys = sharedKeys ?? await loadPaperCollectionKeys();
  return loadSharedPapers(keys);
}

/**
 * Load memos from content/data-counterfactuals/memos/
 */
export async function loadMemos() {
  const memos: Array<{ slug: string; title: string; summary?: string; body: string }> = [];
  const dir = join(CONTENT_DIR, 'memos');

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const raw = await fs.readFile(join(dir, file), 'utf8');
      const { data, body } = parseFrontmatter(raw);

      memos.push({
        slug: slugFromFilename(file),
        title: (data.title as string) || slugFromFilename(file),
        summary: data.summary as string | undefined,
        body,
      });
    }
  } catch {
    // Directory may not exist
  }

  return memos;
}

/**
 * Format a paper as a short citation
 */
export function formatCitation(paper: Paper): string {
  return formatReferenceCitation(paper);
}
