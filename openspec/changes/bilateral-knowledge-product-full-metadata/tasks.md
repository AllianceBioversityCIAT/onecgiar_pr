# Tasks — Bilateral Knowledge Product, full metadata

Frontend only (`onecgiar-pr-client/`). Nothing here waits on the backend: the endpoint the section
already calls returns the MELIA payload today.

## 1. Share the mapping instead of copying it

- [x] 1.1 Add `.../knowledge-product-info/model/knowledge-product-metadata.mapper.ts` exporting pure functions: `mapKnowledgeProductBody`, `splitFairDimensions`, and the colour helpers. No Angular imports, no service access — the response in, the view model out.
- [x] 1.2 `knowledge-product-info.component.ts` delegates to it; `getMetadataFromCGSpace`, `getMetadataFromWoS` and `transformBoolean` are gone, and `_mapFields`, `filterOutObject` and the two colour helpers stay as one-line delegates because the existing spec drives them by name. 203 → 131 lines, and its 27 cases stayed green — the proof that nothing moved.
- [x] 1.3 Unit-test the mapper directly — the branch table nobody covered before: Journal Article with and without a DOI, with and without WoS, `open_access` winning over `accessibility`, `accessibility == null` reading `Not provided` for a Journal Article and `Not available` otherwise, the three handle prefixes plus an unknown source, and `source` falling back through `metadata[].source` and `repo` to `Unknown`.

## 2. Build the bilateral section

- [ ] 2.1 In `type-knowledge-product.component.ts`, load the section through the same endpoint, map it with the shared mapper, and hold the MELIA answers in a save DTO. Keep publishing the checklist on failure (`P2-3355`).
- [ ] 2.2 Load the MELIA lists: the CLARISA MELIA types always; the Theory of Change studies for the 2025-2030 portfolio using the result's program id; the OST studies otherwise.
- [ ] 2.3 Clear the dependent MELIA values when the first question turns No, and when the second question changes branch, so a discarded selection is never saved.
- [ ] 2.4 Re-point `setSectionFields` at the MELIA fields of the answered branch and drop the `handle` item.
- [ ] 2.5 Save through the section's autosave service with the MELIA-only payload.
- [ ] 2.6 Sync action with its confirmation, gated on not-a-Journal-Article or an admin user.

## 3. Template

- [ ] 3.1 The alerts: one per warning, then the two fixed ones carrying the source name.
- [ ] 3.2 The MELIA block with its conditional tree and the portfolio-dependent labels.
- [ ] 3.3 The read-only rows, including the WoS and Unpaywall variants behind their presence conditions, the Altmetric link with its `Not Available` fallback, and the two inline Journal Article messages.
- [ ] 3.4 The FAIR radials, one per dimension, total score excluded.

## 4. Tests

- [ ] 4.1 Component spec for the conditional tree, the clearing behaviour, the checklist per branch, the failed load, the save payload, and the Sync confirmation path.
- [ ] 4.2 Mutation-check the assertions that matter: they must fail when the behaviour is reverted.

## 5. Verification

- [ ] 5.1 The W1/W2 spec suite green after the extraction — proof the shared mapper changed nothing.
- [ ] 5.2 `npx jest pages/bilateral` green.
- [ ] 5.3 `npm run lint` clean on the files touched.
- [ ] 5.4 `ng build` clean — the only gate that catches a broken template or an orphan brace.
- [ ] 5.5 Browser check on a bilateral Knowledge Product result with a synced handle.
