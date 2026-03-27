import test from "node:test";
import assert from "node:assert/strict";

import {
  extractCitationMetadataFromHtml,
  needsCitationMetadataEnrichment,
} from "../helpers/citation-metadata.js";

test("citation metadata extraction reads repeated author tags and conference venue", () => {
  const html = `
    <html>
      <head>
        <meta name="citation_title" content="Datamodels: Predicting Predictions from Training Data" />
        <meta name="citation_author" content="Andrew Ilyas" />
        <meta name="citation_author" content="Shibani Santurkar" />
        <meta name="citation_author" content="Dimitris Tsipras" />
        <meta name="citation_publication_date" content="2022-06-28" />
        <meta name="citation_conference_title" content="Proceedings of the 39th International Conference on Machine Learning" />
        <meta name="citation_abstract" content="A paper about predicting model behavior from training subsets." />
      </head>
    </html>
  `;

  const metadata = extractCitationMetadataFromHtml(html);

  assert.deepEqual(metadata, {
    title: "Datamodels: Predicting Predictions from Training Data",
    authors: ["Andrew Ilyas", "Shibani Santurkar", "Dimitris Tsipras"],
    year: "2022",
    venue: "Proceedings of the 39th International Conference on Machine Learning",
    booktitle: "Proceedings of the 39th International Conference on Machine Learning",
    abstract: "A paper about predicting model behavior from training subsets.",
  });
});

test("citation metadata extraction falls back to journal and site metadata", () => {
  const html = `
    <html>
      <head>
        <title>Membership Inference Attacks Against Machine Learning Models</title>
        <meta property="og:site_name" content="IEEE Xplore" />
        <meta name="citation_author" content="Reza Shokri" />
        <meta name="citation_author" content="Marco Stronati" />
        <meta name="citation_author" content="Congzheng Song" />
        <meta name="citation_author" content="Vitaly Shmatikov" />
        <meta name="citation_publication_date" content="2017/05/18" />
        <meta name="citation_journal_title" content="2017 IEEE Symposium on Security and Privacy" />
      </head>
    </html>
  `;

  const metadata = extractCitationMetadataFromHtml(html);

  assert.deepEqual(metadata, {
    title: "Membership Inference Attacks Against Machine Learning Models",
    authors: ["Reza Shokri", "Marco Stronati", "Congzheng Song", "Vitaly Shmatikov"],
    year: "2017",
    venue: "2017 IEEE Symposium on Security and Privacy",
    journal: "2017 IEEE Symposium on Security and Privacy",
  });
});

test("sparse references are marked for enrichment while complete ones are left alone", () => {
  assert.equal(needsCitationMetadataEnrichment({
    url: "https://arxiv.org/abs/2202.00622",
    authors: ["Andrew Ilyas"],
    year: "",
    venue: undefined,
  }), true);

  assert.equal(needsCitationMetadataEnrichment({
    url: "https://www.microsoft.com/en-us/research/publication/differential-privacy/",
    authors: ["Cynthia Dwork"],
    year: "2006",
    venue: "International Colloquium on Automata, Languages and Programming (ICALP)",
  }), false);
});
