## 1. Client — section-contributors (write tests first, see them fail, then fix)

- [x] 1.1 C2 (revised during apply): keys travel once the question was touched in this visit (`linkedAnswerTouched`), list only once the picker was touched (`linkedListTouched`, also set when No clears a non-empty list). NOT "only on the click": `BilateralAutoSaveService.schedulePayload` keeps one pending body per endpoint and replaces it, so a later centre change would drop the answer from the queue
- [x] 1.2 C1: in `onLinkedResultsModelChange`, union picker ids with `selectedLinkedResultIds()` minus catalogue ids
- [x] 1.3 C1/AC14: `linkedResultOptions` computed = catalogue + synthetic `Result #<id>` entries for selected ids the catalogue lacks; bind `[options]="linkedResultOptions()"`; catalogue read through an additive `InnovationUseResultsService.resultsListSig`; model re-emitted as a new array when options change
- [x] 1.4 C3: radio `[disabled]="readOnly() || !linkedHydrated()"`
- [x] 1.5 C4: `hiddenFieldsWithValues()` returns 0 for the question while `!linkedHydrated()`
- [x] 1.6 Tests (`section-contributors.component.spec.ts`): centre change after hydration carries no linked keys · Yes sends flag without list · pick with an out-of-catalogue stored id keeps it · late catalogue keeps stored ids · radio disabled before hydration · counter 0 after failed read. Each written to fail on the current code first
- [x] 1.7 Tests (`section-contributors.readonly.spec.ts`): stored-but-unknown id renders a chip · radio is disabled read-only
- [x] 1.8 Folder `CLAUDE.md`: contract paragraph (keys only on question change; picker union; synthetic chips) and the corrected P22 sentence

## 2. Server — bilateral-center.service

- [x] 2.1 S1: `typeof === 'boolean'` for the flag; `Array.isArray` + positive-integer filter for the list; `null` list = absent
- [x] 2.2 S2: drop `bilResult.id` from the list; add private `filterActiveResultIds()` (same query as the classic `filterActiveLinkedResults`) and apply it before the writer
- [x] 2.3 S3: rewrite the comments at `syncLinkedBundledAnswer` and in the DTO to state what the writer really spares (legacy rows only)
- [x] 2.4 Tests (`bilateral-center.service.spec.ts`): `"false"` string leaves everything untouched · `linked_results: null` with Yes writes the flag and never calls the writer · self id and inactive id are filtered (mock the query) · existing narrow-protocol tests still green

## 3. Spec, gate, delivery

- [ ] 3.1 The `openspec/specs` baseline for `bilateral-linked-bundled-result` receives the MODIFIED/ADDED requirements on archive (scenario "Rows of other sections survive" replaced by "Legacy rows survive")
- [ ] 3.2 Gate: server `tsc --noEmit` + eslint + `npx jest --silent --reporters=summary --forceExit --maxWorkers=2`; client `npm run build:dev` + `npx ng lint --quiet` + `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2` — RAM checked before each suite (stop if free+inactive < 1 GB)
- [x] 3.3 Falsification: temporarily remove each fix (1.1, 1.2, 1.4, 2.1) and confirm its test goes red; restore
- [ ] 3.4 Commit on `yzuniga/p2-3368-linked-bundled` (verify branch in the same block), merge `--no-ff` into `performance-refactor`, push; watch `prms-reporting-tool-dev`
- [ ] 3.5 On-screen check in prtest on result 9600 (AC10–AC14 + the two-tab scenario: add a link in tab B, change a centre in tab A, reload B → link still there)
- [ ] 3.6 Jira P2-3823: tick the two open tasks, replace the warning panel with the verification evidence, add a one-line note about the classic W1/W2 sharing hole C1 (owner: result-framework-reporting)
- [ ] 3.7 Delivery: comment in P2-3823 → `Ready For UAT` assigned to Cami → DM Ángel + DM Cami (jira.md § Canal por persona)
