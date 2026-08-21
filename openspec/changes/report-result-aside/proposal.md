## Why

Pressing **Report** on an indicator row of the redesigned Reporting tab still opens the **legacy centered modal** — `dashboard-lab.component.ts:1706-1707` calls `openLegacyReportModal(row)` (`:466`), which renders `<app-aow-hlo-create-modal />` (`dashboard-lab.component.html:1567`). The redesign already ships an aside for exactly this job (`indicator-drawer` mounting `lab-report-form`, `dashboard-lab.component.html:1548`), but the button never reaches it, and the copy of the form inside it **is not at parity with the modal**.

Four defects were confirmed by reading the code, not inferred. Any of them makes the aside report *worse* than the modal it would replace:

1. **Multi-selects cannot select.** `pr-multi-select.component.ts:355` uses `valueItem[optionValue] == option[optionValue]` as the identity check. The five `app-pr-multi-select` in `lab-report-form.component.html:116,128,147,159,176` pass **no `optionValue`**, so the comparison is `undefined == undefined` → always `true` → `indexFind = 0` → every click takes the *deselect* branch and removes item 0. The modal passes `optionValue="code"` (`aow-hlo-create-modal.component.html:132,168`). Consequence: contributing centers and science programs leave in the payload mutilated, and the `Other(s)` sentinel can never be added when the ToC pre-loads centers, so that second dropdown is unreachable.
2. **The Knowledge-product title is never locked.** `lab-report-form.component.html:64-72` passes `[readOnly]="currentResultIsKnowledgeProduct()"` **and** `[isStatic]="true"`; `pr-textarea.component.html:12` switches on `(readOnly() || rolesSE.readOnly) && !isStatic()`, which is permanently `false`. The title stays hand-editable after a Sync.
3. **`Existing results` is always empty.** The drawer queries with `toc_result_indicator_id` and reads `res?.response ?? []` (`indicator-drawer.component.ts:143,151`); the server returns `{ response: { contributors, … } }`, so `list` is an object and `list.length` is `undefined`. The modal reads `response?.contributors ?? []` with `relatedNodeId` (`entity-aow.service.ts:307-310`). The list never renders and the auto-switch to the `info` tab never fires.
4. **350 indicators cannot be reported.** When the indicator carries no `result_type_id`, the category dropdown must appear. `lab-report-form.component.html:4` gates it on `resultTypes().length`, populated by a one-shot `effect` (`:142-159`) reading `ResultsListFilterService.filters.resultLevel` — an async catalog. If the click wins the race, the user falls back to a read-only chip with no way to choose a category, and the POST is rejected.

## What Changes

- **Wire `Report` to the aside.** `onReportingRowReport` stops opening the legacy modal and opens `indicator-drawer` in `report` mode, preserving `primeEntityAowContext()` (needed by `EntityAowService.canReportResults()`).
- **Bring `lab-report-form` to functional parity with the modal**, fixing the four defects above and every gap in the parity table of `design.md`.
- **Two tabs, as the design shows.** `Manual entry` works for real (handle + `Sync`, the existing `GET results-knowledge-products/mqap?handle=`). `Browse CGSpace` is rendered **visible but disabled with a `Coming soon` tag**, in the place the design puts it, because **no search endpoint exists**: the server only exposes `mqap` (validates one handle) and `find/by-handle` (`results-knowledge-products.controller.ts:37,49`). The disabled tab points at **P2-3231** (*One-click Knowledge Product creation from connected repositories*, parent epic **P2-3230**), which Ángel already raised and which specifies this exact capability — **no new ticket is created**.
- **Remove `Progress narrative`** (`lab-report-form.component.html:98-106`). The modal has no such field and always sends `toc_progressive_narrative: ''`; it is not part of the flow being migrated.
- **One canonical payload.** The create body is extracted to a pure function, today triplicated in `aow-hlo-create-modal.component.ts:332-367`, `lab-report-form.component.ts:318-346` and `guided-creation.component.ts:401-419`. The aside adopts it in this change; the other two call sites are migrated only after the aside is verified.
- **`Existing results` visible while filling the form**, with the parameter and parsing the server actually implements.
- **Bilateral seams, not bilateral code.** Field groups modelled as data and a `fundingSource` input defaulted to `'w1w2'`, so P2-3352 / P2-3341 / P2-3353 land without reshaping the component.

**Explicitly out of scope:** the legacy modal keeps serving every other entry point (`dashboard-lab.component.html:612,690,1317,1345,1404,1431` and the `entity-aow` pages). Only the Reporting-tab `Report` button moves.

## Capabilities

### New Capabilities
- `report-result-aside`: reporting a result against a ToC indicator from a side panel opened by the Reporting table — its context header, the Knowledge-product vs non-Knowledge-product form variants, the existing-results list, the disabled `Browse CGSpace` affordance, and the guarantee that every validation of the legacy modal survives.

### Modified Capabilities
<!-- None — no existing openspec/specs/ capability governs the report-result modal. -->

## Impact

**Frontend only. No server change.**

- `pages/result-framework-reporting/shared/report-result/` — **new**: `create-result-payload.util.ts`, `kp-handle.validator.ts`, `report-result.service.ts` (+ specs, + `CLAUDE.md`).
- `pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/` — parity fixes, tabs, removal of `Progress narrative`. **Has no spec today; one is added.**
- `pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/` — `canReport` input, `Existing results` inside the report tab, drawer tokens. **Has no spec today; one is added.**
- `pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.{ts,html}` — `onReportingRowReport` rewired, `canReport` passed down. Both files are clean in the working tree.

**Not touched (WIP on branch `performance-refactor`):** `reporting-aow-table.component.{ts,html,scss}` and `reporting-program-band.component.{ts,html,spec.ts}` carry uncommitted changes. The table already emits the right event (`reportRow`, `reporting-aow-table.component.ts:132`); no edit is required there.

**Handed off, not built:** browsing knowledge products from connected repositories — already specified in **P2-3231** (open, epic **P2-3230**). Note the deltas: P2-3231 AC3 scopes the list to KPs where the user is lead author or contributor, AC9 searches by **title** only and filters by year / repository / type. The design mock additionally shows author + DOI search and a **Center** filter; if those are wanted they are an **extension of P2-3231 AC3/AC9**, never a new ticket.
