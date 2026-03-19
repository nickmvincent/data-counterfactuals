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
async function loadReferences(options: { force?: boolean } = {}): Promise<Map<string, Reference>> {
  if (!isSembleConfigured()) {
    throw new Error('Semble is not configured. Set SEMBLE_PROFILE_IDENTIFIER or SEMBLE_COLLECTION_AT_URIS, or add defaults in semble.config.json.');
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
