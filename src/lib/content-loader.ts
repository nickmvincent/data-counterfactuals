import { isSembleConfigured, loadSembleDataset } from '../../helpers/semble';
import { loadReferencesByKeys } from '../../helpers/shared-references';
import { LOCAL_PAPER_COLLECTIONS } from '../data/local-paper-collections';

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

function normalizeCollectionTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

function isSameCollection(
  a: Pick<PaperCollection, 'slug' | 'title'>,
  b: Pick<PaperCollection, 'slug' | 'title'>,
): boolean {
  return a.slug.trim().toLowerCase() === b.slug.trim().toLowerCase()
    || normalizeCollectionTitle(a.title) === normalizeCollectionTitle(b.title);
}

function mergePaperCollections(baseCollections: PaperCollection[]): PaperCollection[] {
  const merged = baseCollections.map((collection) => ({
    ...collection,
    citation_keys: [...collection.citation_keys],
  }));

  for (const localCollection of LOCAL_PAPER_COLLECTIONS) {
    const index = merged.findIndex((collection) => isSameCollection(collection, localCollection));
    if (index === -1) {
      merged.push({
        ...localCollection,
        citation_keys: [...localCollection.citation_keys],
      });
      continue;
    }

    const existing = merged[index];
    merged[index] = {
      ...existing,
      ...localCollection,
      citation_keys: Array.from(new Set([
        ...existing.citation_keys,
        ...localCollection.citation_keys,
      ])),
      visibility: localCollection.visibility ?? existing.visibility,
      body: localCollection.body ?? existing.body,
    };
  }

  return merged;
}

export async function loadPaperCollectionsSnapshot(): Promise<PaperCollectionsSnapshot> {
  if (!isSembleConfigured()) {
    throw new Error('Semble is not configured. Set SEMBLE_PROFILE_IDENTIFIER or SEMBLE_COLLECTION_AT_URIS, or add defaults in semble.config.json.');
  }

  const dataset = await loadSembleDataset();
  if (!dataset) {
    throw new Error('Semble is configured but no collection dataset could be loaded.');
  }

  const collections = mergePaperCollections(
    dataset.collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      citation_keys: [...collection.citation_keys],
      visibility: collection.visibility,
      body: collection.body,
    })),
  );

  return {
    generatedAt: dataset.generatedAt,
    collections,
  };
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
async function loadSharedPapers(keys: string[]): Promise<Paper[]> {
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
