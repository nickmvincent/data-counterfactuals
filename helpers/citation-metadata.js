/**
 * @typedef {Object} CitationMetadata
 * @property {string=} title
 * @property {string[]=} authors
 * @property {string=} year
 * @property {string=} venue
 * @property {string=} journal
 * @property {string=} booktitle
 * @property {string=} abstract
 * @property {string=} doi
 */

/**
 * @typedef {Object} ReferenceLike
 * @property {string=} url
 * @property {string=} year
 * @property {string=} venue
 * @property {string=} journal
 * @property {string=} booktitle
 * @property {string[]=} authors
 */

const TITLE_TAG_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_TAG_RE = /<meta\b([^>]*?)>/gi;
const HTML_TAG_RE = /<[^>]+>/g;

const HTML_ENTITIES = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['lt', '<'],
  ['nbsp', ' '],
  ['quot', '"'],
]);

function collapseWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = String(entity).toLowerCase();
    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return HTML_ENTITIES.get(lower) || match;
  });
}

function cleanText(value) {
  return collapseWhitespace(decodeHtmlEntities(String(value || '').replace(HTML_TAG_RE, ' ')));
}

function parseHtmlAttributes(source) {
  /** @type {Record<string, string>} */
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of source.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[key] = decodeHtmlEntities(value);
  }

  return attributes;
}

function collectMetaValues(html) {
  /** @type {Map<string, string[]>} */
  const values = new Map();

  for (const match of html.matchAll(META_TAG_RE)) {
    const attributes = parseHtmlAttributes(match[1] || '');
    const key = collapseWhitespace(
      attributes.name
      || attributes.property
      || attributes.itemprop
      || attributes['http-equiv'],
    ).toLowerCase();
    const content = collapseWhitespace(attributes.content);

    if (!key || !content) continue;

    if (!values.has(key)) {
      values.set(key, []);
    }

    values.get(key).push(content);
  }

  return values;
}

function getMetaValues(metaValues, ...keys) {
  return keys.flatMap((key) => metaValues.get(String(key).toLowerCase()) || []);
}

function pickFirstString(...values) {
  for (const candidate of values.flat()) {
    const text = collapseWhitespace(candidate);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function normalizeAuthors(values) {
  const flattened = values.flatMap((value) => {
    const text = collapseWhitespace(value);
    if (!text) return [];

    if (text.includes(' and ')) {
      return text.split(/\s+and\s+/);
    }

    if (text.includes(';')) {
      return text.split(';');
    }

    return [text];
  });

  return Array.from(new Set(flattened.map((author) => collapseWhitespace(author)).filter(Boolean)));
}

function extractYear(value) {
  const text = collapseWhitespace(value);
  if (!text) return undefined;

  const match = text.match(/\b(18|19|20)\d{2}\b/);
  return match?.[0];
}

function normalizeDoi(value) {
  const text = collapseWhitespace(value);
  if (!text) return undefined;

  const doiMatch = text.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return doiMatch?.[0] || undefined;
}

function extractTitleFromHtml(html) {
  const match = html.match(TITLE_TAG_RE);
  return match ? cleanText(match[1]) : undefined;
}

/**
 * Parse citation-style metadata out of an article page.
 *
 * @param {string} html
 * @param {{ fallbackSiteName?: string }=} options
 * @returns {CitationMetadata | null}
 */
export function extractCitationMetadataFromHtml(html, options = {}) {
  const text = String(html || '');
  if (!text) return null;

  const metaValues = collectMetaValues(text);
  const citationConference = pickFirstString(
    getMetaValues(metaValues, 'citation_conference_title'),
    getMetaValues(metaValues, 'citation_book_title'),
    getMetaValues(metaValues, 'citation_inbook_title'),
  );
  const citationJournal = pickFirstString(
    getMetaValues(metaValues, 'citation_journal_title'),
    getMetaValues(metaValues, 'prism.publicationname'),
  );
  const fallbackVenue = pickFirstString(
    getMetaValues(metaValues, 'dc.source'),
    getMetaValues(metaValues, 'og:site_name'),
    options.fallbackSiteName,
  );
  const authors = normalizeAuthors([
    ...getMetaValues(metaValues, 'citation_author'),
    ...getMetaValues(metaValues, 'dc.creator'),
    ...getMetaValues(metaValues, 'author'),
  ]);

  const metadata = {
    title: pickFirstString(
      getMetaValues(metaValues, 'citation_title'),
      getMetaValues(metaValues, 'dc.title'),
      getMetaValues(metaValues, 'og:title'),
      getMetaValues(metaValues, 'twitter:title'),
      extractTitleFromHtml(text),
    ),
    authors: authors.length ? authors : undefined,
    year: extractYear(pickFirstString(
      getMetaValues(metaValues, 'citation_publication_date'),
      getMetaValues(metaValues, 'citation_online_date'),
      getMetaValues(metaValues, 'citation_date'),
      getMetaValues(metaValues, 'dc.date'),
      getMetaValues(metaValues, 'article:published_time'),
    )),
    venue: pickFirstString(citationConference, citationJournal, fallbackVenue),
    journal: citationJournal,
    booktitle: citationConference,
    abstract: pickFirstString(
      getMetaValues(metaValues, 'citation_abstract'),
      getMetaValues(metaValues, 'description'),
      getMetaValues(metaValues, 'og:description'),
      getMetaValues(metaValues, 'twitter:description'),
    ),
    doi: normalizeDoi(pickFirstString(
      getMetaValues(metaValues, 'citation_doi'),
      getMetaValues(metaValues, 'dc.identifier'),
      getMetaValues(metaValues, 'dc.identifier.doi'),
    )),
  };

  const cleaned = Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value];
        }

        const textValue = cleanText(value);
        return [key, textValue || undefined];
      })
      .filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)),
  );

  return Object.keys(cleaned).length ? /** @type {CitationMetadata} */ (cleaned) : null;
}

/**
 * Determine whether a reference is missing enough metadata to justify
 * an additional citation lookup from the source page.
 *
 * @param {ReferenceLike} reference
 * @returns {boolean}
 */
export function needsCitationMetadataEnrichment(reference) {
  const authors = Array.isArray(reference?.authors) ? reference.authors.filter(Boolean) : [];

  return Boolean(reference?.url)
    && (!collapseWhitespace(reference?.year)
      || (!collapseWhitespace(reference?.venue)
        && !collapseWhitespace(reference?.journal)
        && !collapseWhitespace(reference?.booktitle))
      || authors.length === 0);
}

/**
 * Fetch citation metadata from a paper URL.
 *
 * @param {string | undefined} url
 * @param {{
 *   fallbackSiteName?: string;
 *   fetchImpl?: typeof fetch;
 *   timeoutMs?: number;
 * }=} options
 * @returns {Promise<CitationMetadata | null>}
 */
export async function fetchCitationMetadata(url, options = {}) {
  const target = collapseWhitespace(url);
  if (!target) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(target);
  } catch {
    return null;
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return null;
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return null;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutMs = options.timeoutMs ?? 8000;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetchImpl(parsedUrl.toString(), {
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'user-agent': 'data-counterfactuals/1.0',
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = collapseWhitespace(response.headers.get('content-type')).toLowerCase();
    if (contentType && !contentType.includes('html') && !contentType.includes('xml') && !contentType.startsWith('text/')) {
      return null;
    }

    const html = await response.text();
    return extractCitationMetadataFromHtml(html, {
      fallbackSiteName: options.fallbackSiteName,
    });
  } catch {
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
