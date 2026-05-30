# Collections Metadata Audit

Date: 2026-05-28
Cache audited: `tmp/semble-cache.json` generated at `2026-05-28T23:15:53.149Z`

## Scope

Audited all 149 reference records across the 21 `dc:` Semble collections.

The audit checked for:

- Missing core fields: title, authors, year, venue, URL/DOI when available.
- HTML entity leakage in rendered fields.
- Suspiciously short titles.
- Fallback citation keys derived from URLs.
- Author names rendered in source metadata order, such as `Last, First`.
- A spot-check pass against authoritative pages for the most suspicious records.

## Confirmed Fixes

- `vincent2021dataleverage`: expanded `Data Leverage` to `Data Leverage: A Framework for Empowering the Public in its Relationship with Technology Companies`; venue normalized to `FAccT`.
- `shapley1953value`: removed the chapter-number prefix from `17. A Value for n-Person Games`; venue normalized to `Contributions to the Theory of Games II`.
- `nakkiran2021deepdoubledescent`: removed the trailing footnote marker and restored title case: `Deep Double Descent: Where Bigger Models and More Data Hurt`.
- `kreer2025bayesian`: corrected an ICLR page-title scrape from `ICLR Poster ...` back to the paper title; set authors, year, venue, and URL from the ICLR page.
- `wang2025bettertda`: replaced the fallback URL-derived citation key, fixed authors, year, venue, and URL using the NeurIPS paper page.
- `shetty2026nonmembership`: replaced the fallback ACL URL-derived citation key and normalized venue to `EACL`.
- `kamiran2012preprocessing`: corrected a Springer page-title scrape from `Client Challenge` back to `Data preprocessing techniques for classification without discrimination`; year set to the Knowledge and Information Systems issue year, 2012.
- `khaddaj2023backdoor`: replaced stale ICLR-submission metadata with the final ICML/PMLR record, `Rethinking Backdoor Attacks`.
- `rosenbaum1984subclassification`: corrected the Harvard repository scrape year from 2010 to the 1984 JASA publication year and restored Donald B. Rubin's middle initial.
- OpenReview final-publication year repairs: `ash2020badge` (2020), `basu2021fragileinfluence` (2021), `just2023lava` (2023), `kessler2025sava` (2025), `ki2023nomodeltraining` (2023), `tamine2026utility` (2026), `toneva2019forgetting` (2019), `zhao2021gradientmatching` (2021), and `zhao2023distributionmatching` (2023).
- ArXiv/final-venue year repairs: `shumailov2023curseofrecursion` (2023), `sorscher2022beyondscaling` (2022), and `tian2024derdava` (2024).
- `toneva2019forgetting`: removed OpenReview equal-contribution asterisks from author display names.
- All author lists now get a display-normalization pass that converts citation metadata like `Gebru, Timnit` into `Timnit Gebru`. This fixed many rendered author lists without requiring one-off repairs.

## Remaining Automated Flags

None after the refresh. The audit script found no remaining missing core fields, fallback URL keys, leaked HTML entities, suspicious short titles, or comma-ordered author names.

## Still Worth Manual Review

This pass was an automated metadata audit plus source spot-checking, not a deep scholarly judgment pass. The checklist in `docs/paper-metadata-fit-checklist-2026-05-28.md` is still the right place to manually confirm:

- Whether each paper belongs in its current shelf.
- Whether cross-listed papers should stay cross-listed.
- Whether survey-sized shelves should be split or pruned.
- Whether venue display should prefer full proceedings names or short conference names consistently across the whole site.

## Source Spot Checks

- Microsoft Research page for `Data Leverage`.
- NeurIPS 2025 page for `Better Training Data Attribution via Better Inverse Hessian-Vector Products`.
- ICLR 2026 page for `Bayesian Influence Functions for Hessian-Free Data Attribution`.
- CACM/Microsoft Research pages for `Datasheets for Datasets`.
- arXiv and IOP records for `Deep Double Descent`.
- DOI/secondary bibliography records for Shapley's `A Value for n-Person Games`.
- Springer page for `Data preprocessing techniques for classification without discrimination`.
- Taylor & Francis/JASA page for `Reducing Bias in Observational Studies Using Subclassification on the Propensity Score`.
- OpenReview/ICLR records for `Deep Batch Active Learning`, `Influence Functions in Deep Learning Are Fragile`, `LAVA`, `SAVA`, `Data Valuation Without Training of a Model`, `On the Impact of the Utility in Semivalue-based Data Valuation`, `Dataset Condensation with Gradient Matching`, and `Example Forgetting`.
- PMLR/ICML record for `Rethinking Backdoor Attacks`.
- CVF/WACV record for `Dataset Condensation With Distribution Matching`.
- AAAI record for `DeRDaVa`.
