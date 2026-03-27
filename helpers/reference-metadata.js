const METADATA_SOURCE_LABELS = {
  "yaml-note": "Semble note YAML",
  "yaml-note-body": "Semble note body",
  "card-preview": "Semble card preview",
  "card-url": "Semble card URL",
  generated: "Generated fallback",
  "page-citation-meta": "Page citation metadata",
  "doi-csl": "DOI CSL metadata",
};

const METADATA_SOURCE_PRIORITY = {
  generated: 0,
  "card-url": 5,
  "card-preview": 10,
  "yaml-note-body": 15,
  "yaml-note": 20,
  "page-citation-meta": 30,
  "doi-csl": 40,
};

const CORE_FIELDS = [
  "entry_type",
  "title",
  "authors",
  "year",
  "venue",
  "booktitle",
  "journal",
  "pages",
  "doi",
];

const SOFT_FIELDS = ["abstract"];

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isMeaningfulValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(collapseWhitespace(value));
}

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : [];
    const right = Array.isArray(b) ? b : [];
    if (left.length !== right.length) return false;
    return left.every((value, index) => collapseWhitespace(value) === collapseWhitespace(right[index]));
  }

  return collapseWhitespace(a) === collapseWhitespace(b);
}

function buildAuthorName(author) {
  if (!author || typeof author !== "object") {
    return "";
  }

  if (collapseWhitespace(author.literal)) {
    return collapseWhitespace(author.literal);
  }

  return collapseWhitespace([author.given, author.family].filter(Boolean).join(" "));
}

function extractYearFromDateParts(dateParts) {
  if (!Array.isArray(dateParts) || !Array.isArray(dateParts[0])) {
    return undefined;
  }

  const year = dateParts[0][0];
  if (typeof year !== "number" && typeof year !== "string") {
    return undefined;
  }

  const text = String(year).trim();
  return /^\d{4}$/.test(text) ? text : undefined;
}

function cslTypeToEntryType(type) {
  switch (collapseWhitespace(type).toLowerCase()) {
    case "paper-conference":
      return "inproceedings";
    case "article-journal":
      return "article";
    case "chapter":
      return "incollection";
    case "book":
      return "book";
    case "report":
      return "techreport";
    case "thesis":
      return "phdthesis";
    default:
      return undefined;
  }
}

export function createMetadataSource(kind, options = {}) {
  if (!kind) {
    return null;
  }

  return {
    kind,
    label: options.label || METADATA_SOURCE_LABELS[kind] || kind,
    source_url: collapseWhitespace(options.source_url) || undefined,
    source_uri: collapseWhitespace(options.source_uri) || undefined,
    retrieved_at: collapseWhitespace(options.retrieved_at) || undefined,
    official: Boolean(options.official ?? kind === "doi-csl"),
  };
}

export function mergeMetadataSources(...sourceGroups) {
  const seen = new Set();
  const merged = [];

  for (const group of sourceGroups) {
    for (const source of group || []) {
      if (!source || !source.kind) continue;
      const key = [
        source.kind,
        collapseWhitespace(source.source_url),
        collapseWhitespace(source.source_uri),
        collapseWhitespace(source.retrieved_at),
      ].join("|");

      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(source);
    }
  }

  return merged;
}

export function provenancePriority(source) {
  if (!source?.kind) return -1;
  return METADATA_SOURCE_PRIORITY[source.kind] ?? -1;
}

export function pickHigherPriorityProvenance(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  return provenancePriority(candidate) >= provenancePriority(current) ? candidate : current;
}

export function mergeFieldProvenance(existing = {}, incoming = {}, resolved = {}) {
  const fields = new Set([
    ...Object.keys(existing || {}),
    ...Object.keys(incoming || {}),
  ]);
  const merged = {};

  for (const field of fields) {
    const existingProvenance = existing?.[field];
    const incomingProvenance = incoming?.[field];

    if (!(field in resolved)) {
      merged[field] = pickHigherPriorityProvenance(existingProvenance, incomingProvenance);
      continue;
    }

    const resolvedValue = resolved[field];
    const existingValue = existingProvenance?.value;
    const incomingValue = incomingProvenance?.value;

    if (sameValue(resolvedValue, incomingValue) && !sameValue(resolvedValue, existingValue)) {
      merged[field] = incomingProvenance;
      continue;
    }

    if (sameValue(resolvedValue, existingValue) && !sameValue(resolvedValue, incomingValue)) {
      merged[field] = existingProvenance;
      continue;
    }

    merged[field] = pickHigherPriorityProvenance(existingProvenance, incomingProvenance);
  }

  return merged;
}

export function extractDoiFromText(value) {
  const text = collapseWhitespace(value);
  if (!text) return undefined;

  const match = text.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match?.[0];
}

export function extractDoiFromUrl(value) {
  const text = collapseWhitespace(value);
  if (!text) return undefined;

  try {
    const url = new URL(text);
    if (url.hostname.toLowerCase() === "doi.org") {
      return extractDoiFromText(url.pathname);
    }
  } catch {
    return extractDoiFromText(text);
  }

  return undefined;
}

export function normalizeDoiCslMetadata(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const authors = Array.isArray(payload.author)
    ? unique(payload.author.map((author) => buildAuthorName(author)).filter(Boolean))
    : [];
  const title = collapseWhitespace(Array.isArray(payload.title) ? payload.title[0] : payload.title);
  const containerTitle = collapseWhitespace(
    Array.isArray(payload["container-title"]) ? payload["container-title"][0] : payload["container-title"],
  );
  const eventTitle = collapseWhitespace(
    Array.isArray(payload["event-title"]) ? payload["event-title"][0] : payload["event-title"],
  );
  const page = collapseWhitespace(payload.page);
  const doi = extractDoiFromText(payload.DOI);
  const year =
    extractYearFromDateParts(payload.issued?.["date-parts"])
    || extractYearFromDateParts(payload.published?.["date-parts"]);
  const entryType = cslTypeToEntryType(payload.type);
  const isConference = collapseWhitespace(payload.type).toLowerCase() === "paper-conference";
  const abstract = collapseWhitespace(payload.abstract);

  const metadata = {
    entry_type: entryType,
    title: title || undefined,
    authors: authors.length ? authors : undefined,
    year,
    venue: eventTitle || containerTitle || undefined,
    booktitle: isConference ? (eventTitle || containerTitle || undefined) : undefined,
    journal: !isConference ? (containerTitle || undefined) : undefined,
    pages: page || undefined,
    doi,
    abstract: abstract || undefined,
  };

  const cleaned = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => isMeaningfulValue(value)),
  );

  return Object.keys(cleaned).length ? cleaned : null;
}

export async function fetchDoiCslMetadata(doi, options = {}) {
  const normalizedDoi = extractDoiFromText(doi);
  if (!normalizedDoi) return null;

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return null;
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutMs = options.timeoutMs ?? 8000;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(`https://doi.org/${encodeURIComponent(normalizedDoi)}`, {
      headers: {
        accept: "application/vnd.citationstyles.csl+json",
        "user-agent": "data-counterfactuals/1.0",
      },
      redirect: "follow",
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return normalizeDoiCslMetadata(payload);
  } catch {
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function maybeApplyField(reference, field, value, provenance, options = {}) {
  if (!isMeaningfulValue(value) || !provenance) {
    return;
  }

  const currentValue = reference[field];
  const currentProvenance = reference.metadata_provenance?.[field];

  if (!isMeaningfulValue(currentValue)) {
    reference[field] = Array.isArray(value) ? [...value] : value;
    reference.metadata_provenance[field] = provenance;
    return;
  }

  if (options.soft) {
    if (provenancePriority(currentProvenance) <= METADATA_SOURCE_PRIORITY["card-preview"]) {
      reference[field] = Array.isArray(value) ? [...value] : value;
      reference.metadata_provenance[field] = provenance;
    }
    return;
  }

  if (provenancePriority(provenance) >= provenancePriority(currentProvenance)) {
    reference[field] = Array.isArray(value) ? [...value] : value;
    reference.metadata_provenance[field] = provenance;
  }
}

export function resolveReferenceMetadata(reference, layers = []) {
  const resolved = {
    ...reference,
    authors: Array.isArray(reference.authors) ? [...reference.authors] : [],
    metadata_provenance: { ...(reference.metadata_provenance || {}) },
    metadata_sources: mergeMetadataSources(reference.metadata_sources),
  };

  for (const layer of layers) {
    if (!layer?.metadata || !layer.source) continue;

    resolved.metadata_sources = mergeMetadataSources(resolved.metadata_sources, [layer.source]);

    for (const field of CORE_FIELDS) {
      maybeApplyField(resolved, field, layer.metadata[field], layer.source);
    }

    for (const field of SOFT_FIELDS) {
      maybeApplyField(resolved, field, layer.metadata[field], layer.source, { soft: true });
    }
  }

  return resolved;
}
