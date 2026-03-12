/**
 * Shared utility for loading references from Semble.
 */

import { isSembleConfigured, loadSembleDataset } from './semble';

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

/**
 * Load all references from Semble
 */
export async function loadReferences(options: { force?: boolean } = {}): Promise<Map<string, Reference>> {
  if (!isSembleConfigured()) {
    throw new Error('Semble is not configured. Set SEMBLE_PROFILE_IDENTIFIER or SEMBLE_COLLECTION_AT_URIS.');
  }

  const dataset = await loadSembleDataset({ force: options.force });
  if (!dataset) {
    throw new Error('Semble is configured but no dataset could be loaded.');
  }

  return dataset.references as Map<string, Reference>;
}

/**
 * Load specific references by citation keys
 */
export async function loadReferencesByKeys(keys: string[]): Promise<Reference[]> {
  const allRefs = await loadReferences();
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
export async function loadReferencesByTags(tags: string[]): Promise<Reference[]> {
  const allRefs = await loadReferences();
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
