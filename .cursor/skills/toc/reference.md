# ToC — extended notes

Add long-form SQL excerpts, ER sketches, or initiative-role conventions here as the team documents them.

## Domain docs

- **[P25 result type ↔ ToC indicator typology rules](../../../onecgiar-pr-server/docs/p25-toc-result-type-rules.md)** — planned/unplanned filtering, neutral/custom indicators, validation functions, FAQ (technical).
- **[P25 ToC mapping guide (business)](../../../onecgiar-pr-server/docs/p25-toc-mapping-guide.md)** — plain-language rules for reporting teams: mappings, planned/unplanned, dashboard flows, FAQ.

**Practical starting points in the repo:**

- `rg "Integration_information\\.toc_results" onecgiar-pr-server/src`
- `rg "DB_TOC" onecgiar-pr-server/src/api/results`
- `rg "RESULT_TYPE_TO_INDICATOR_PATTERN" onecgiar-pr-server/src`
