import { isSembleConfigured, loadSembleDataset } from '../../helpers/semble';
import { loadReferencesByKeys, formatCitation as formatReferenceCitation } from '../../helpers/shared-references';

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
  visibility?: string;
  body?: string;
}

export interface PaperCollectionsSnapshot {
  generatedAt?: string;
  collections: PaperCollection[];
}

export async function loadPaperCollectionsSnapshot(): Promise<PaperCollectionsSnapshot> {
  if (!isSembleConfigured()) {
    throw new Error('Semble is not configured. Set SEMBLE_PROFILE_IDENTIFIER or SEMBLE_COLLECTION_AT_URIS, or add defaults in semble.config.json.');
  }

  const dataset = await loadSembleDataset();
  if (!dataset) {
    throw new Error('Semble is configured but no collection dataset could be loaded.');
  }

  return {
    generatedAt: dataset.generatedAt,
    collections: dataset.collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      citation_keys: [...collection.citation_keys],
      visibility: collection.visibility,
      body: collection.body,
    })),
  };
}

export async function loadPaperCollections(): Promise<PaperCollection[]> {
  return (await loadPaperCollectionsSnapshot()).collections;
}

/**
 * Load paper citation keys from all Semble collections
 */
export async function loadPaperCollectionKeys(): Promise<string[]> {
  const collections = await loadPaperCollections();
  const keys = new Set<string>();

  for (const collection of collections) {
    for (const key of collection.citation_keys) keys.add(key);
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
 * Get papers for a specific collection
 * Papers are sorted by priority number (ascending), then by year (descending)
 */
export async function loadPapersForCollection(collection: PaperCollection): Promise<Paper[]> {
  const papers = await loadSharedPapers(collection.citation_keys);

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
  const refs = await loadReferencesByKeys(keys);
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
 * Format a paper as a short citation
 */
export function formatCitation(paper: Paper): string {
  return formatReferenceCitation(paper);
}
