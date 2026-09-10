# Tasks — Bilateral Knowledge Product, full metadata

Frontend only (`onecgiar-pr-client/`). Nothing here waits on the backend: the endpoint the section
already calls returns the MELIA payload today.

## 1. Share the mapping instead of copying it

- [x] 1.1 Add `.../knowledge-product-info/model/knowledge-product-metadata.mapper.ts` exporting pure functions: `mapKnowledgeProductBody`, `splitFairDimensions`, and the colour helpers. No Angular imports, no service access — the response in, the view model out.
- [x] 1.2 `knowledge-product-info.component.ts` delegates to it; `getMetadataFromCGSpace`, `getMetadataFromWoS` and `transformBoolean` are gone, and `_mapFields`, `filterOutObject` and the two colour helpers stay as one-line delegates because the existing spec drives them by name. 203 → 131 lines, and its 27 cases stayed green — the proof that nothing moved.
- [x] 1.3 Unit-test the mapper directly — the branch table nobody covered before: Journal Article with and without a DOI, with and without WoS, `open_access` winning over `accessibility`, `accessibility == null` reading `Not provided` for a Journal Article and `Not available` otherwise, the three handle prefixes plus an unknown source, and `source` falling back through `metadata[].source` and `repo` to `Unknown`.

## 2. Build the bilateral section

- [x] 2.1 In `type-knowledge-product.component.ts`, load the section through the same endpoint, map it with the shared mapper, and hold the MELIA answers in a save DTO. Keep publishing the checklist on failure (`P2-3355`).
- [x] 2.2 Load the MELIA lists: the CLARISA MELIA types always; the Theory of Change studies for the 2025-2030 portfolio using the result's program id; the OST studies otherwise.
- [x] 2.3 Clear the dependent MELIA values when the first question turns No, and when the second question changes branch, so a discarded selection is never saved.
- [x] 2.4 Re-point `setSectionFields` at the MELIA fields of the answered branch and drop the `handle` item.
- [x] 2.5 Save through the section's autosave service with the MELIA-only payload.
- [x] 2.6 Sync action with its confirmation, gated on not-a-Journal-Article or an admin user.

## 3. Template

- [x] 3.1 The alerts: one per warning, then the two fixed ones carrying the source name.
- [x] 3.2 The MELIA block with its conditional tree and the portfolio-dependent labels.
- [x] 3.3 The read-only rows, including the WoS and Unpaywall variants behind their presence conditions, the Altmetric link with its `Not Available` fallback, and the two inline Journal Article messages.
- [x] 3.4 The FAIR radials, one per dimension, total score excluded.

## 4. Tests

- [x] 4.1 Component spec for the conditional tree, the clearing behaviour, the checklist per branch, the failed load, the save payload, and the Sync confirmation path.
- [x] 4.2 Mutation-checked: reverting the checklist to the `handle` item fails 6 cases, dropping the clearing fails 1, and slipping `handle` into the save payload fails 4. Restoring each returns 42/42.

## 5. Verification

- [x] 5.1 W1/W2 suite green after the extraction with no edit to its spec: 27 cases, plus 21 new ones on the mapper itself.
- [x] 5.2 `npx jest src/app/pages/bilateral` → 25 suites / 632 tests passed.
- [x] 5.3 `npm run lint` clean on the files touched. Three pre-existing `no-console` errors live in `custom-fields/pr-multi-select/repro-p2-3308.spec.ts`, unrelated work in progress, left untouched.
- [x] 5.4 `npm run build` clean — only the pre-existing bundle-budget and CommonJS warnings.
- [x] 5.5 Browser check via `cypress/e2e/bilateral-knowledge-product-metadata.cy.ts` — 4 specs green against a local dev server. The payload is intercepted and the result driven through the live component: the test environment has no bilateral Knowledge Product result to lean on, and `/api/results/get/all` there answers with a SQL error unrelated to this work. Screenshots in `cypress/screenshots/`.
