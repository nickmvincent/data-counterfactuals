import test from "node:test";
import assert from "node:assert/strict";

import {
  createMetadataSource,
  extractDoiFromText,
  extractDoiFromUrl,
  normalizeDoiCslMetadata,
  resolveReferenceMetadata,
} from "../helpers/reference-metadata.js";

test("DOI extraction works for bare DOI strings and doi.org URLs", () => {
  assert.equal(
    extractDoiFromText("doi:10.1145/3308558.3313742"),
    "10.1145/3308558.3313742",
  );
  assert.equal(
    extractDoiFromUrl("https://doi.org/10.1145/3308558.3313742"),
    "10.1145/3308558.3313742",
  );
});

test("CSL metadata normalizes into bibliography fields", () => {
  const metadata = normalizeDoiCslMetadata({
    type: "paper-conference",
    title: "Collective Action Problems on Social Media",
    author: [
      { given: "Nicholas", family: "Vincent" },
      { given: "Hanlin", family: "Li" },
    ],
    DOI: "10.1145/3308558.3313742",
    page: "1-13",
    issued: {
      "date-parts": [[2019, 5, 1]],
    },
    "container-title": "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems",
  });

  assert.deepEqual(metadata, {
    entry_type: "inproceedings",
    title: "Collective Action Problems on Social Media",
    authors: ["Nicholas Vincent", "Hanlin Li"],
    year: "2019",
    venue: "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems",
    booktitle: "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems",
    pages: "1-13",
    doi: "10.1145/3308558.3313742",
  });
});

test("official DOI metadata overrides YAML for core fields but preserves manual abstract", () => {
  const reference = {
    citation_key: "vincent2019collective",
    entry_type: "misc",
    title: "Manual Title",
    authors: ["Nick Vincent"],
    year: "2018",
    venue: "Manual Venue",
    doi: "10.1145/3308558.3313742",
    abstract: "Short hand-written note.",
    metadata_provenance: {
      title: { ...createMetadataSource("yaml-note"), value: "Manual Title" },
      authors: { ...createMetadataSource("yaml-note"), value: ["Nick Vincent"] },
      year: { ...createMetadataSource("yaml-note"), value: "2018" },
      venue: { ...createMetadataSource("yaml-note"), value: "Manual Venue" },
      doi: { ...createMetadataSource("yaml-note"), value: "10.1145/3308558.3313742" },
      abstract: { ...createMetadataSource("yaml-note"), value: "Short hand-written note." },
    },
    metadata_sources: [createMetadataSource("yaml-note")],
  };

  const doiSource = createMetadataSource("doi-csl", {
    source_url: "https://doi.org/10.1145/3308558.3313742",
    official: true,
  });

  const resolved = resolveReferenceMetadata(reference, [
    {
      source: doiSource,
      metadata: {
        entry_type: "inproceedings",
        title: "Collective Action Problems on Social Media",
        authors: ["Nicholas Vincent", "Hanlin Li"],
        year: "2019",
        venue: "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems",
        booktitle: "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems",
        doi: "10.1145/3308558.3313742",
        abstract: "Official abstract that should not replace a manual note.",
      },
    },
  ]);

  assert.equal(resolved.entry_type, "inproceedings");
  assert.equal(resolved.title, "Collective Action Problems on Social Media");
  assert.deepEqual(resolved.authors, ["Nicholas Vincent", "Hanlin Li"]);
  assert.equal(resolved.year, "2019");
  assert.equal(resolved.venue, "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems");
  assert.equal(resolved.booktitle, "Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems");
  assert.equal(resolved.abstract, "Short hand-written note.");
  assert.equal(resolved.metadata_provenance.title.kind, "doi-csl");
  assert.equal(resolved.metadata_provenance.abstract.kind, "yaml-note");
});
