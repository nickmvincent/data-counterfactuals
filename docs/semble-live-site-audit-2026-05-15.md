# Semble Links and Live Site Audit

Date: 2026-05-15

Basis for this audit and fix pass:

- `npm run build:refresh` against the public Semble API.
- Authenticated Semble PDS readback through `npm run semble:manage`.
- Live deployed page: <https://datacounterfactuals.org/collections/>.
- Automated URL audit saved to `tmp/semble-audit-report.json`.

## Final status

The originally observed issues have been fixed and deployed.

- Live site now renders `20 areas`, `137 papers`, and `Updated May 15, 2026`.
- The `data provenance and source attribution` shelf is present on the live site.
- Current normalized build has 130 unique references and 137 rendered shelf rows.
- No missing visible titles, authors, years, venues, or URLs.
- No duplicate URLs.
- No duplicate titles after removing the stale arXiv-only `Data Banzhaf` shelf link.
- No bad-status rendered bibliography URLs remain.
- Remaining URL warnings are automated-check 403s from ACM/Oxford/SSRN-style bot blocking, not confirmed broken links.

## Fixes applied

Semble/PDS records were updated for:

- `jia2019knnvaluation`
  - Replaced the failing ETH repository URL with <https://arxiv.org/abs/1908.08619>.
  - Kept DOI metadata: `10.14778/3342263.3342637`.
- `lu2024dataacquisition`
  - Corrected the note URL to the valid NeurIPS page:
    <https://proceedings.neurips.cc/paper_files/paper/2024/hash/d5e8326bbec25e1c608787d24488521b-Abstract-Conference.html>.
- `feygin2021datadividendworks`
  - Corrected title to `A Data Dividend That Works: Steps Toward Building an Equitable Data Economy`.
  - Pointed URL at the stable PDF.
  - Added a manual metadata override for `title`.
- `wadhwa2020economicimpactdatadividends`
  - Corrected title to `Economic Impact and Feasibility of Data Dividends`.
  - Pointed URL at the stable PDF.
  - Corrected venue to `Data Catalyst report`.
  - Added manual metadata overrides for `title` and `venue`.
- `Data Banzhaf`
  - Removed the stale arXiv-only shelf link.
  - Kept the PMLR entry as canonical.

The public Semble API was still serving stale app-view records immediately after the PDS writeback, so the site loader now contains a narrow repair layer for these known records. This keeps the deployed site correct while the app-view index catches up.

## Verification

Commands run:

- `npm test`
- `npm run build:refresh`
- `node tmp/semble-audit.mjs`
- `npm run cf:deploy`

Live-site verification after deploy:

- `20 areas`
- `137 papers`
- `Updated May 15, 2026`
- `data provenance and source attribution` present
- Jia link points to arXiv
- Corrected data-dividend titles present

## Residual notes

The audit still reports automated-check 403s for a small number of publisher pages. They are classified as reachable-but-bot-blocked:

- ACM DL for `bengio2009curriculum`
- Oxford Academic for `rosenbaum1983central`
- ACM DL for `vincent2019datastrikes`
- SSRN card source for `bearerfriend2025sharingalgorithm`

These do not need immediate action unless we want every automated link check to be green without publisher bot-block exceptions.
