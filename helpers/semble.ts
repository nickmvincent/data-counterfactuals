import { parseFrontmatter } from './markdown';

const DEFAULT_SEMBLE_API_BASE = 'https://api.semble.so';
const PAGE_LIMIT = 100;

interface SembleConfig {
  apiBase: string;
  profileIdentifier?: string;
  collectionAtUris: string[];
  collectionNamePrefix?: string;
}

interface SemblePagination {
  totalPages?: number;
  hasNextPage?: boolean;
  nextPage?: number;
}

interface SembleCollectionSummary {
  uri?: string;
  name?: string;
  description?: string | null;
  visibility?: string;
}

interface SembleNoteCard {
  uri?: string;
  text?: string;
}

interface SembleCardContent {
  title?: string;
  description?: string;
  author?: string;
}

interface SembleUrlCard {
  uri?: string;
  url?: string;
  note?: SembleNoteCard | null;
  cardContent?: SembleCardContent | null;
}

interface SembleCollectionPageItem {
  urlCard?: SembleUrlCard | null;
}

interface SembleApiEnvelope<T> {
  data?: T;
}

interface SembleUserCollectionsResponse {
  collections?: SembleCollectionSummary[];
  pagination?: SemblePagination;
}

interface SembleCollectionPageResponse {
  collection?: SembleCollectionSummary;
  urlCards?: SembleCollectionPageItem[];
  pagination?: SemblePagination;
}

export interface SembleReference {
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
  body?: string;
  visibility?: string;
  semble_card_uri?: string;
  semble_note_uri?: string;
  semble_collection_slugs?: string[];
  semble_collection_uris?: string[];
  [key: string]: unknown;
}

export interface SembleCollectionRecord {
  slug: string;
  title: string;
  citation_keys: string[];
  visibility?: string;
  body?: string;
  uri?: string;
}

export interface SembleDataset {
  references: Map<string, SembleReference>;
  collections: SembleCollectionRecord[];
}

let datasetCache:
  | {
      cacheKey: string;
      value: Promise<SembleDataset>;
    }
  | null = null;

function splitEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((author) => String(author).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.includes(' and ')) {
    return trimmed
      .split(/\s+and\s+/)
      .map((author) => author.trim())
      .filter(Boolean);
  }

  if (trimmed.includes(';')) {
    return trimmed
      .split(';')
      .map((author) => author.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

function pickFirst<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value === undefined) continue;

    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    return value;
  }

  return undefined;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseAtUriRkey(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  const parts = uri.split('/');
  return parts[parts.length - 1] || undefined;
}

function buildFallbackCitationKey(card: SembleUrlCard): string {
  const source = card.url || card.uri || card.cardContent?.title || 'record';
  const slug = slugify(source);
  return slug || 'record';
}

function extractFrontmatter(rawNote: string | undefined): { data: Record<string, unknown>; body?: string } {
  const text = rawNote?.trim();
  if (!text) {
    return { data: {} };
  }

  if (text.startsWith('---')) {
    return parseFrontmatter(text);
  }

  return { data: {}, body: text };
}

function normalizeCollectionTitle(name: string | undefined, config: SembleConfig): string {
  const rawName = name?.trim() || 'Untitled collection';
  const prefix = config.collectionNamePrefix;

  if (!prefix || !rawName.startsWith(prefix)) {
    return rawName;
  }

  const stripped = rawName.slice(prefix.length).trim();
  return stripped || rawName;
}

function shouldIncludeCollection(collection: SembleCollectionSummary, config: SembleConfig): boolean {
  if (!config.collectionNamePrefix) return true;
  const name = collection.name?.trim();
  return Boolean(name && name.startsWith(config.collectionNamePrefix));
}

function getSembleConfig(): SembleConfig | null {
  const profileIdentifier = asOptionalString(process.env.SEMBLE_PROFILE_IDENTIFIER);
  const collectionAtUris = splitEnvList(process.env.SEMBLE_COLLECTION_AT_URIS);

  if (!profileIdentifier && collectionAtUris.length === 0) {
    return null;
  }

  return {
    apiBase: asOptionalString(process.env.SEMBLE_API_BASE) || DEFAULT_SEMBLE_API_BASE,
    profileIdentifier,
    collectionAtUris,
    collectionNamePrefix: asOptionalString(process.env.SEMBLE_COLLECTION_NAME_PREFIX),
  };
}

export function isSembleConfigured(): boolean {
  return getSembleConfig() !== null;
}

function buildCacheKey(config: SembleConfig): string {
  return JSON.stringify(config);
}

async function fetchSemble<T>(
  config: SembleConfig,
  path: string,
  searchParams: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(path, config.apiBase);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Semble API request failed (${response.status}) for ${url.toString()}`);
  }

  const json = (await response.json()) as T | SembleApiEnvelope<T>;
  if (json && typeof json === 'object' && 'data' in json && json.data) {
    return json.data;
  }

  return json as T;
}

function getNextPage(pagination: SemblePagination | undefined, page: number): number | null {
  if (!pagination) return null;

  if (typeof pagination.nextPage === 'number') {
    return pagination.nextPage;
  }

  if (pagination.hasNextPage) {
    return page + 1;
  }

  if (typeof pagination.totalPages === 'number' && page < pagination.totalPages) {
    return page + 1;
  }

  return null;
}

async function listCollections(config: SembleConfig): Promise<SembleCollectionSummary[]> {
  if (config.collectionAtUris.length > 0 || !config.profileIdentifier) {
    return [];
  }

  const results: SembleCollectionSummary[] = [];
  let page = 1;

  while (true) {
    const data = await fetchSemble<SembleUserCollectionsResponse>(
      config,
      `/api/collections/user/${encodeURIComponent(config.profileIdentifier)}`,
      { page, limit: PAGE_LIMIT },
    );

    const batch = Array.isArray(data.collections) ? data.collections : [];
    results.push(...batch.filter((collection) => shouldIncludeCollection(collection, config)));

    const nextPage = getNextPage(data.pagination, page);
    if (!nextPage) break;
    page = nextPage;
  }

  return results;
}

async function loadCollectionPage(
  config: SembleConfig,
  collectionAtUri: string,
): Promise<{ collection: SembleCollectionSummary; cards: SembleUrlCard[] }> {
  const cards: SembleUrlCard[] = [];
  let page = 1;
  let collection: SembleCollectionSummary | undefined;

  while (true) {
    const data = await fetchSemble<SembleCollectionPageResponse>(
      config,
      `/api/collections/at/${encodeURIComponent(collectionAtUri)}`,
      { page, limit: PAGE_LIMIT },
    );

    if (!collection && data.collection) {
      collection = data.collection;
    }

    const pageCards = Array.isArray(data.urlCards)
      ? data.urlCards
          .map((item) => item.urlCard || undefined)
          .filter((item): item is SembleUrlCard => Boolean(item))
      : [];
    cards.push(...pageCards);

    const nextPage = getNextPage(data.pagination, page);
    if (!nextPage) break;
    page = nextPage;
  }

  return {
    collection: collection || { uri: collectionAtUri },
    cards,
  };
}

function mergeReference(existing: SembleReference | undefined, incoming: SembleReference): SembleReference {
  if (!existing) return incoming;

  const merged: SembleReference = {
    ...existing,
    ...incoming,
    entry_type: pickFirst(existing.entry_type, incoming.entry_type) || 'misc',
    title: pickFirst(existing.title, incoming.title) || '',
    authors: unique([...(existing.authors || []), ...(incoming.authors || [])]),
    year: pickFirst(existing.year, incoming.year) || '',
    venue: pickFirst(existing.venue, incoming.venue),
    url: pickFirst(existing.url, incoming.url),
    doi: pickFirst(existing.doi, incoming.doi),
    abstract: pickFirst(existing.abstract, incoming.abstract),
    pages: pickFirst(existing.pages, incoming.pages),
    booktitle: pickFirst(existing.booktitle, incoming.booktitle),
    journal: pickFirst(existing.journal, incoming.journal),
    semantic_scholar_url: pickFirst(existing.semantic_scholar_url, incoming.semantic_scholar_url),
    google_scholar_url: pickFirst(existing.google_scholar_url, incoming.google_scholar_url),
    body: pickFirst(existing.body, incoming.body),
    visibility: pickFirst(existing.visibility, incoming.visibility),
    semble_card_uri: pickFirst(existing.semble_card_uri, incoming.semble_card_uri),
    semble_note_uri: pickFirst(existing.semble_note_uri, incoming.semble_note_uri),
    semble_collection_slugs: unique([
      ...(existing.semble_collection_slugs || []),
      ...(incoming.semble_collection_slugs || []),
    ]),
    semble_collection_uris: unique([
      ...(existing.semble_collection_uris || []),
      ...(incoming.semble_collection_uris || []),
    ]),
    tags: unique([...(existing.tags || []), ...(incoming.tags || [])]),
  };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (merged[key] === undefined || merged[key] === '') {
      merged[key] = value;
    }
  }

  return merged;
}

function normalizeReference(
  card: SembleUrlCard,
  collection: SembleCollectionRecord,
): SembleReference {
  const { data, body } = extractFrontmatter(card.note?.text);
  const authors = normalizeAuthors(data.authors ?? data.author ?? card.cardContent?.author);
  const tags = unique([
    ...normalizeStringArray(data.tags),
    `collection:${collection.slug}`,
  ]);

  const citationKey = asOptionalString(data.citation_key) || buildFallbackCitationKey(card);
  const title =
    asOptionalString(data.title) ||
    asOptionalString(card.cardContent?.title) ||
    card.url ||
    citationKey;

  const abstract =
    asOptionalString(data.abstract) ||
    body ||
    asOptionalString(card.cardContent?.description);

  const record: SembleReference = {
    citation_key: citationKey,
    entry_type: asOptionalString(data.entry_type) || 'misc',
    title,
    authors,
    year: asString(data.year),
    venue: asOptionalString(data.venue),
    url: asOptionalString(data.url) || asOptionalString(card.url),
    doi: asOptionalString(data.doi),
    abstract,
    pages: asOptionalString(data.pages),
    booktitle: asOptionalString(data.booktitle),
    journal: asOptionalString(data.journal),
    semantic_scholar_url: asOptionalString(data.semantic_scholar_url),
    google_scholar_url: asOptionalString(data.google_scholar_url),
    tags: tags.length ? tags : undefined,
    body,
    visibility: asOptionalString(data.visibility),
    semble_card_uri: asOptionalString(card.uri),
    semble_note_uri: asOptionalString(card.note?.uri),
    semble_collection_slugs: [collection.slug],
    semble_collection_uris: collection.uri ? [collection.uri] : [],
  };

  for (const [key, value] of Object.entries(data)) {
    if (!(key in record)) {
      record[key] = value;
    }
  }

  return record;
}

async function buildSembleDataset(config: SembleConfig): Promise<SembleDataset> {
  const explicitUris = config.collectionAtUris;
  const discoveredCollections = await listCollections(config);
  const collectionUris = unique([
    ...explicitUris,
    ...discoveredCollections.map((collection) => asString(collection.uri)).filter(Boolean),
  ]);

  const collectionPages = await Promise.all(
    collectionUris.map((collectionAtUri) => loadCollectionPage(config, collectionAtUri)),
  );

  const references = new Map<string, SembleReference>();
  const collections: SembleCollectionRecord[] = [];

  for (const page of collectionPages) {
    if (!shouldIncludeCollection(page.collection, config)) {
      continue;
    }

    const title = normalizeCollectionTitle(page.collection.name, config);
    const slug = slugify(parseAtUriRkey(page.collection.uri) || title);
    const collection: SembleCollectionRecord = {
      slug,
      title,
      citation_keys: [],
      visibility: asOptionalString(page.collection.visibility),
      body: asOptionalString(page.collection.description || undefined),
      uri: asOptionalString(page.collection.uri),
    };

    for (const card of page.cards) {
      const reference = normalizeReference(card, collection);
      references.set(reference.citation_key, mergeReference(references.get(reference.citation_key), reference));
      collection.citation_keys.push(reference.citation_key);
    }

    collection.citation_keys = unique(collection.citation_keys);
    collections.push(collection);
  }

  collections.sort((a, b) => a.title.localeCompare(b.title));

  return { references, collections };
}

export async function loadSembleDataset(options: { force?: boolean } = {}): Promise<SembleDataset | null> {
  const config = getSembleConfig();
  if (!config) return null;

  const cacheKey = buildCacheKey(config);
  if (!options.force && datasetCache && datasetCache.cacheKey === cacheKey) {
    return datasetCache.value;
  }

  const value = buildSembleDataset(config);
  datasetCache = { cacheKey, value };
  return value;
}
