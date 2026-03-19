import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const CACHE_PATH = path.resolve(process.cwd(), "tmp/semble-cache.json");
const OUTPUT_PATH = path.resolve(process.cwd(), "src/data/paper-subset-metric-data.js");
const SOFTMAX_TEMPERATURE = 0.35;

const BUCKET_DEFINITIONS = [
  {
    token: "A",
    label: "Acquisition and selection",
    description: "Active learning and subset-selection papers.",
    collections: ["active learning", "selection and coresets"],
  },
  {
    token: "B",
    label: "Augmentation and distillation",
    description: "Data expansion, condensation, and curriculum papers.",
    collections: ["augmentation and curriculum", "distillation"],
  },
  {
    token: "C",
    label: "Valuation and attribution",
    description: "Influence, semivalue, and data-valuation papers.",
    collections: ["influence", "semivalues"],
  },
  {
    token: "D",
    label: "Privacy and unlearning",
    description: "Membership-inference, privacy, and unlearning papers.",
    collections: ["membership inference", "unlearning"],
  },
  {
    token: "E",
    label: "Causality and fairness",
    description: "Causal inference and fairness-via-data papers.",
    collections: ["causality", "fairness via data interventions"],
  },
  {
    token: "F",
    label: "Robustness and failure modes",
    description: "Poisoning, collapse, and training-dynamics papers.",
    collections: ["poisoning", "model collapse", "training dynamics"],
  },
  {
    token: "G",
    label: "Collective and public data",
    description: "Collective-action and user-generated-content papers.",
    collections: ["collective action", "user-generated content"],
  },
  {
    token: "H",
    label: "Adaptation and scaling",
    description: "Meta-learning and scaling-law papers.",
    collections: ["meta-learning", "scaling laws"],
  },
];

const STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "do",
  "does",
  "during",
  "each",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "more",
  "most",
  "not",
  "of",
  "on",
  "or",
  "our",
  "over",
  "should",
  "than",
  "that",
  "the",
  "their",
  "them",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "under",
  "using",
  "via",
  "was",
  "we",
  "were",
  "what",
  "when",
  "which",
  "while",
  "with",
  "within",
  "without",
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function allSubsets(items) {
  const out = [[]];
  for (const item of items) {
    const current = out.slice();
    for (const subset of current) out.push([...subset, item]);
  }
  return out.sort((left, right) => (left.length - right.length) || left.join("").localeCompare(right.join("")));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique(values) {
  return Array.from(new Set(values));
}

function buildDocumentVectors(documents) {
  const documentFrequency = new Map();

  for (const document of documents) {
    for (const token of new Set(document.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }

  const totalDocuments = documents.length || 1;

  return documents.map((document) => {
    const termFrequency = new Map();
    for (const token of document.tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    const vector = new Map();
    const tokenCount = document.tokens.length || 1;
    for (const [token, count] of termFrequency.entries()) {
      const idf = Math.log((1 + totalDocuments) / (1 + (documentFrequency.get(token) || 0))) + 1;
      vector.set(token, (count / tokenCount) * idf);
    }

    return {
      ...document,
      vector: normalizeVector(vector),
    };
  });
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(Array.from(vector.values()).reduce((sum, value) => sum + value * value, 0)) || 1;
  const out = new Map();
  for (const [token, value] of vector.entries()) out.set(token, value / magnitude);
  return out;
}

function meanVector(vectors) {
  if (!vectors.length) return new Map();
  const sum = new Map();
  for (const vector of vectors) {
    for (const [token, value] of vector.entries()) {
      sum.set(token, (sum.get(token) || 0) + value);
    }
  }

  const average = new Map();
  for (const [token, value] of sum.entries()) {
    average.set(token, value / vectors.length);
  }
  return normalizeVector(average);
}

function cosineSimilarity(left, right) {
  let total = 0;
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const [token, value] of smaller.entries()) {
    total += value * (larger.get(token) || 0);
  }
  return total;
}

function softmax(logits) {
  if (!logits.length) return [];
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
}

function buildCentroidBundle(trainSet, docsByLabel) {
  const fullCentroids = new Map();
  const looCentroids = new Map();

  for (const label of trainSet) {
    const docs = docsByLabel.get(label) || [];
    const vectors = docs.map((document) => document.vector);
    fullCentroids.set(label, meanVector(vectors));

    if (docs.length <= 1) continue;
    docs.forEach((document, index) => {
      const looVectors = vectors.filter((_, vectorIndex) => vectorIndex !== index);
      looCentroids.set(document.key, meanVector(looVectors));
    });
  }

  return { fullCentroids, looCentroids };
}

function scoreDocument(document, trainSet, centroidBundle) {
  if (!trainSet.length) return 0;
  if (!trainSet.includes(document.label)) return 0;

  const logits = trainSet.map((label) => {
    const centroid = label === document.label
      ? (centroidBundle.looCentroids.get(document.key) || centroidBundle.fullCentroids.get(label))
      : centroidBundle.fullCentroids.get(label);
    return cosineSimilarity(document.vector, centroid) / SOFTMAX_TEMPERATURE;
  });

  const probabilities = softmax(logits);
  const labelIndex = trainSet.indexOf(document.label);
  return probabilities[labelIndex] || 0;
}

function scoreTrainEvalPair(trainSet, evalSet, docsBySubset, centroidCache, docsByLabel) {
  if (!evalSet.length) return 1;
  if (!trainSet.length) return 0;

  const evalDocs = docsBySubset.get(evalSet.join("")) || [];
  if (!evalDocs.length) return 0;

  const trainKey = trainSet.join("");
  let centroidBundle = centroidCache.get(trainKey);
  if (!centroidBundle) {
    centroidBundle = buildCentroidBundle(trainSet, docsByLabel);
    centroidCache.set(trainKey, centroidBundle);
  }

  let total = 0;
  for (const document of evalDocs) {
    total += scoreDocument(document, trainSet, centroidBundle);
  }
  return total / evalDocs.length;
}

function buildMetricMatrices(bucketMetadata, allDocuments) {
  const matrices = {};

  for (let count = 2; count <= bucketMetadata.length; count += 1) {
    const activeBuckets = bucketMetadata.slice(0, count);
    const activeTokens = activeBuckets.map((bucket) => bucket.token);
    const activeTokenSet = new Set(activeTokens);
    const activeDocuments = allDocuments.filter((document) => activeTokenSet.has(document.label));
    const docsByLabel = new Map(activeTokens.map((token) => [token, activeDocuments.filter((document) => document.label === token)]));
    const subsets = allSubsets(activeTokens);
    const docsBySubset = new Map(
      subsets.map((subset) => [
        subset.join(""),
        activeDocuments.filter((document) => subset.includes(document.label)),
      ]),
    );
    const centroidCache = new Map();
    const matrix = subsets.map((trainSet) =>
      subsets.map((evalSet) => round(scoreTrainEvalPair(trainSet, evalSet, docsBySubset, centroidCache, docsByLabel))),
    );
    const values = matrix.flat();

    matrices[String(count)] = {
      count,
      tokens: activeTokens,
      subsetCount: subsets.length,
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      matrix,
    };
  }

  return matrices;
}

function loadSembleCache() {
  const payload = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  invariant(Array.isArray(payload.collections), `Expected collections in ${CACHE_PATH}`);
  invariant(Array.isArray(payload.references), `Expected references in ${CACHE_PATH}`);
  return payload;
}

function buildBucketMetadata(payload) {
  const collectionsByTitle = new Map(payload.collections.map((collection) => [collection.title, collection]));
  const referencesByKey = new Map(payload.references.map((reference) => [reference.citation_key, reference]));

  const bucketMetadata = BUCKET_DEFINITIONS.map((definition) => {
    const citationKeys = unique(
      definition.collections.flatMap((title) => {
        const collection = collectionsByTitle.get(title);
        invariant(collection, `Missing collection "${title}" in ${CACHE_PATH}`);
        return Array.isArray(collection.citation_keys) ? collection.citation_keys : [];
      }),
    );

    invariant(citationKeys.length >= 6, `Bucket ${definition.token} is too small (${citationKeys.length} papers).`);

    return {
      ...definition,
      paperCount: citationKeys.length,
      citationKeys,
    };
  });

  const allDocuments = buildDocumentVectors(
    bucketMetadata.flatMap((bucket) =>
      bucket.citationKeys.map((citationKey) => {
        const reference = referencesByKey.get(citationKey);
        invariant(reference, `Missing reference "${citationKey}" in ${CACHE_PATH}`);
        const text = [reference.title, reference.abstract, reference.venue, reference.body].filter(Boolean).join(" ");
        return {
          key: citationKey,
          label: bucket.token,
          title: reference.title,
          tokens: tokenize(text),
        };
      }),
    ),
  );

  return { bucketMetadata, allDocuments };
}

function main() {
  const payload = loadSembleCache();
  const { bucketMetadata, allDocuments } = buildBucketMetadata(payload);
  const matrices = buildMetricMatrices(bucketMetadata, allDocuments);
  const output = {
    version: 1,
    metric: "papers",
    generatedAt: new Date().toISOString(),
    source: {
      cachePath: "tmp/semble-cache.json",
      cacheGeneratedAt: payload.generated_at || null,
      references: payload.stats?.references ?? payload.references.length,
      temperature: SOFTMAX_TEMPERATURE,
      score:
        "Softmax probability assigned to the correct bucket by a TF-IDF nearest-centroid classifier over paper titles and abstracts. Self-eval uses leave-one-out centroids when possible.",
    },
    buckets: bucketMetadata,
    matrices,
  };

  const fileContents = `// Generated by scripts/generate-paper-subset-metric.mjs\nexport const paperSubsetMetricData = ${JSON.stringify(output, null, 2)};\n\nexport default paperSubsetMetricData;\n`;
  writeFileSync(OUTPUT_PATH, fileContents);

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Buckets: ${bucketMetadata.map((bucket) => `${bucket.token}:${bucket.paperCount}`).join(" ")}`);
  console.log(`Matrices: ${Object.keys(matrices).join(", ")}`);
}

main();
