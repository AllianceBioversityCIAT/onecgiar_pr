# Tasks — Impact Results: Result Detail

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `results` — result detail for impact results (child 3/3 of [`../family.md`](../family.md)) |
| Linked spec | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Baseline | `docs/prd.md` G1, US-S1/S2, AC-1, AC-6 · `docs/ux-ui/design.md` §7 tokens, §8 components, §10 a11y · `docs/trd/trd.md` (client result-detail, W1) |
| Ticket | P2-3901 |
| Owner | Santiago Sanchez |
| Status | draft (2026-10-31) |
| Approval Mode | gated |
| Budget (design §10) | 8 tasks · ~1,400 LOC · ≤ 10 review rounds |

**Base path:** `onecgiar-pr-client/src/app/`.

**Test rules (machine + user policy):**

- Every Jest run uses `--maxWorkers=2` (`--runInBand` if free RAM < 4 GB).
- Scope each run to the touched files, one run at a time, never the full suite; run `--findRelatedTests <changed files>` before push.
- Cypress CT never runs alongside Jest. Run a spec directly with `npx cypress run --component --spec <file>`; the batch script exits red even on a pass.
- Lint the client with `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`.
- Browser checks hit the shared prdb, so the agent never clicks a write button; IRD-T-8 writes are done by the user.

**Skills (from the Skill Map):**

| Skill | Tasks |
|---|---|
| `angular-developer` | all code tasks |
| `spartan` + `tailwind-design-system` | IRD-T-3, IRD-T-4 (UI) |
| `tdd` | IRD-T-1 (utils, word count) |

---

## 2. Pre-flight checklist

- [x] Child #1 `server-foundation` = `done` (E2–E5, green check, ToC exemption, geo guard live on PRTest).
- [x] Child #2 `sp-reporting-entry` = `done` (the `IMPACT_AREAS` constant exists).
- [x] `requirements.md` approved (2026-10-31).
- [x] `design.md` approved (2026-10-31).
- [ ] IRD-OQ-1 exact guide copy: does not block; placeholders are confirmed at IRD-T-8.

---

## 3. Task list

### IRD-T-1 — Impact utils, word counter, API methods and interfaces — `[x]`

- **Type:** client (shared)
- **Description:**
  - **`shared/utils/impact-result.util.ts`:**
    - `isP25ImpactResult(result)`: type 9 AND P25.
    - `resultTypeDisplayName(typeId, dbName)`: "Impact result" for 9, otherwise `dbName`.
    - `principalImpactAreaNames(result)`: areas with `*_tag_level_id === 3`, named from `IMPACT_AREAS`, in id order.
  - **`shared/utils/impact-word-count.util.ts`:** a line-for-line port of server `onecgiar-pr-server/src/api/results-framework-reporting/impact-level/utils/count-words.ts`.
  - **`shared/interfaces/impact-level.interface.ts`:** E2–E5 types (design §4).
  - **Four methods in `shared/services/api/results-api.service.ts`:** `GET_impactStudyTypes`, `GET_impactLevelInfo`, `PATCH_impactLevelInfo` and `GET_impactPreviousResultsSearch`.
    - Base `baseApiBaseUrl` + `results-framework-reporting/impact-level/…`.
    - The search method omits null/empty params and sends `typeIds` as csv.
  - **Confirm the existing result-types catalog method name** and record it in `execution.md`.
  - **DataControlService:** add a computed `isP25ImpactResultSignal` on `currentResultSignal()`.
- **Implements:** design §3, §4, §5, IRD-DD-3, DD-7, DD-9; IRD-R-4 (count), R-11 (helpers)
- **Files (expected):** the util files and their specs, the interface, the API service and its spec, `data-control.service.ts`
- **Depends on:** —
- **Blocks:** T-2..T-7
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - Word count differs from the server spec on any case copied from `count-words.spec.ts` (empty, whitespace, `\n\t`, NBSP, U+3000, U+0085, U+FEFF, 99/100/101 words).
    - The predicate is true for P22 type 9 or for P25 type 1.
    - The display name changes for any type other than 9.
    - Principal names are wrong for 0, 1 or 2 areas.
    - The URLs or query params differ from design §5.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="impact-result.util|impact-word-count.util|results-api.service"`
  - **Consumers:** `results-api.service` callers are unchanged (additive methods only).
- **Definition of done:** the specs, with the server cases copied 1:1, are green; lint is clean.

### IRD-T-2 — Route entry and section order — `[x]`

- **Type:** client (routing)
- **Description:**
  - Add `{ path: 'impact-level-info', prName: 'Impact level info', prHide: 9, portfolioAcronym: 'P25', loadChildren }` to `resultDetailRouting` in `shared/routing/routing-data.ts`, immediately after `evidences`.
  - Create the page module skeleton: module plus a routing module with `canDeactivate` like `policy-change-info`. The component can be an empty shell here.
  - Add a section-list spec over `result-sections.service.ts`.
- **Implements:** IRD-R-1, R-13 (sections), IRD-DD-1, DD-2
- **Files (expected):** `routing-data.ts`; `pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/impact-level-info.module.ts` + `-routing.module.ts` + empty component; `result-sections.service.spec.ts`
- **Depends on:** IRD-T-1
- **Blocks:** IRD-T-3
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - P25 type 9 does not list exactly General, Contributors, Geo, Evidence, Impact level info, in that order.
    - P25 type 1 or P22 type 9 lists Impact level info, or their list changes from the pre-change snapshot.
    - The path is not exactly `impact-level-info`.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="result-sections.service"`
  - **Disqualifier:** a sort or special case added to the service instead of array placement violates DD-1; stop.
- **Definition of done:** the section-list cases are green; lint is clean.

### IRD-T-3 — Impact level info page — `[x]`

- **Type:** client (UI)
- **Description:** Build the page per design §6.2, mimicking `rd-result-types-pages/policy-change-info`.
  - **Load:** E2 + E3, with `[appSectionSkeleton]`; on error show a banner and disable save.
  - **Study type:** `app-pr-select` with the definition shown.
  - **Contribution:** `app-pr-textarea [maxWords]=100 [wordCounterFn]=impactWordCount`.
  - **`custom-fields/pr-textarea`:**
    - Add the optional `wordCounterFn` input; the default stays `WordCounterService`.
    - Extend `pr-textarea.contract.cy.ts` with a custom-fn case and keep the default cases unchanged.
  - **Yes/No:** `app-pr-yes-or-not`. Switching to No with links asks for confirmation.
  - **Selected list:** removable, each remove button with an accessible name.
  - **"Add results" button:** opens the picker (T-4); stubbed until T-4 lands.
  - **Save:**
    - Sends a full E4 body: No → `previous_result_ids: []`.
    - Re-hydrates from the response and takes a new snapshot.
    - On 400, shows the server message and keeps the input.
    - Over 100 words blocks save with a message.
  - **Read-only:** every input is disabled.
  - **Docs:** the folder `CLAUDE.md` is new and stamped.
- **Implements:** IRD-R-2, R-3, R-4, R-5, R-7, NFR-1, NFR-3, NFR-5, NFR-6; IRD-DD-2, DD-3
- **Files (expected):** `impact-level-info.component.{ts,html,spec.ts}`; `custom-fields/pr-textarea/pr-textarea.component.ts` + `pr-textarea.contract.cy.ts`; `impact-level-info/CLAUDE.md`
- **Depends on:** IRD-T-2
- **Blocks:** IRD-T-4, IRD-T-8
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - The save body has missing or extra keys, or No sends ids.
    - Text with line breaks totalling 101 server-words is allowed to save.
    - A 400 clears the form.
    - The load error shows an empty form as if nothing were saved.
    - The default `pr-textarea` count changes (contract CT).
  - **Red run:**
    - Jest: `npx jest --maxWorkers=2 --testPathPattern="impact-level-info.component"`
    - CT, run separately: `npx cypress run --component --spec src/app/custom-fields/pr-textarea/pr-textarea.contract.cy.ts`
  - **Consumers:** the 21 `pr-textarea [maxWords]` consumers keep the default path (CT proves it).
- **Definition of done:** Jest and the `pr-textarea` CT are green; lint is clean.

### IRD-T-4 — Previous-results picker — `[x]`

- **Type:** client (UI)
- **Description:**
  - **Component:** `impact-level-info/components/previous-results-picker/` per design §6.3, as a Spartan `hlm-dialog`.
  - **Search:** debounced ≥ 300 ms, using `switchMap`; a new query resets to page 1.
  - **Filters:** phase/portfolio (from `GET_versioning(ALL, REPORTING)`) and result type, built with `app-pr-filter-select` / `app-pr-filter-multiselect`.
  - **Requests:** send `excludeResultId`, `limit` 20, and paging.
  - **Already selected:** an item already in the list shows "Selected" and cannot be added again.
  - **States:** an empty state, and an error state with retry.
  - **Done / Cancel:** Done emits the working selection; Cancel or Escape discards it.
  - **Wiring:** connect it to the page from T-3.
  - **CT:** page + picker at 1280 and 900 px.
- **Implements:** IRD-R-6, NFR-1, NFR-2, NFR-4; IRD-DD-4
- **Files (expected):** `previous-results-picker.component.{ts,html,spec.ts,cy.ts}`; `impact-level-info.component.{ts,html}` (wiring); `impact-level-info.cy.ts`
- **Depends on:** IRD-T-3
- **Blocks:** IRD-T-8
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - More than one request per typing burst.
    - A stale response overwrites a newer one.
    - The current result is not excluded.
    - A duplicate can be added.
    - Cancel keeps changes.
    - Escape does not close.
    - Focus does not return to "Add results".
    - Horizontal scroll at 900 px.
  - **Red run:**
    - Jest: `npx jest --maxWorkers=2 --testPathPattern="previous-results-picker|impact-level-info.component"`
    - CT, run separately: `npx cypress run --component --spec "src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/**/*.cy.ts"`
- **Definition of done:** Jest and CT are green; lint is clean.

### IRD-T-5 — Contributors & partners without ToC — `[x]`

- **Type:** client (UI)
- **Description:** In `pages/results/pages/result-detail/pages/rd-contributors-and-partners/`:
  - Add the `isImpactResult` computed.
  - `@if (!isImpactResult())` around the ToC block (html ~:38-95) and the generic linked-results block (~:618-660+).
  - The save omits `has_innovation_link` / `linked_results` for impact results, following the P2-3424 conditional `delete`.
  - Add the impact copy line under the title (placeholder text, confirmed at T-8).
  - **Verify** that the centers block renders its flat dropdown when `planned_result=false`. If it does not, extend the `@if` (design §6.4). Record the outcome in `execution.md`.
  - This folder is excluded from coverage, so add a spec anyway.
  - Update the folder `CLAUDE.md` if one exists.
- **Implements:** IRD-R-8, R-13; IRD-DD-5
- **Files (expected):** `rd-contributors-and-partners.component.{ts,html}` + spec
- **Depends on:** IRD-T-1
- **Blocks:** IRD-T-8
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - For type 9: a ToC or linked-results control is in the DOM, or the save body carries the link fields.
    - For type 1: the DOM or the save body differs from before.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="rd-contributors-and-partners"`
  - **Disqualifier:** hiding by CSS/`display:none` instead of `@if` (the mandatory DOM scan would still count the fields).
- **Definition of done:** the type-9 and type-1 cases are green; lint is clean.

### IRD-T-6 — Geography Regional/Country and Evidence copy — `[x]`

- **Type:** client (UI)
- **Description:**
  - **Geography:**
    - `shared/components/geoscope-management/` gets `allowedScopeIds = input<number[] | null>(null)`. It filters the main and extra-scope options, with no TBD when set.
    - `rd-geographic-location` passes `[2, 3]` for impact results and shows the "pick Regional or Country" hint when the stored scope is outside the list. Nothing is preselected and nothing is written until the user saves.
  - **Evidence:** `rd-evidences` `alertStatus()` gets a `=== 9` branch with the MELIA `<li>` (placeholder text, confirmed at T-8).
- **Implements:** IRD-R-9, R-10, R-13; IRD-DD-6
- **Files (expected):** `geoscope-management.component.{ts,html,spec.ts}`, `rd-geographic-location.component.{ts,html,spec.ts}`, `rd-evidences.component.{ts,spec.ts}`
- **Depends on:** IRD-T-1
- **Blocks:** IRD-T-8
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - For type 9: Global, Sub-national or TBD is offered in either question.
    - The options of other callers of `geoscope-management` change (IPSR included).
    - A stored Global is auto-changed without a save.
    - The evidence copy for type 5 or other types changes.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="geoscope-management|rd-geographic-location|rd-evidences"`
- **Definition of done:** green; lint is clean.

### IRD-T-7 — Impact result labels and type-change warning — `[x]`

- **Type:** client (UI)
- **Description:**
  - **Sidebar badge:** `result-sections.service.ts` (~:120) runs the type name through `resultTypeDisplayName`, uppercased in the template.
  - **Header:**
    - `result-header` shows the type label and `Impact · Impact Area <names>` from `principalImpactAreaNames`, or just `Impact` when there are none.
    - First confirm the header's data carries the five tag columns. If it does not, read them from the general-info data already loaded, and record which.
  - **Results Center:** `results-list` runs the type cell through the helper.
  - **SP Results (`programme-results`):**
    - The row mapper sets category "Impact result" for type 9.
    - The filter service lists it after the RF five and before `Other`.
    - `Other` excludes type 9.
    - A `category=Impact contribution` deep link still resolves (alias).
    - Check the Overview "Other" count source and record in `execution.md` whether it includes type 9 (DD-8); do not change the Overview.
  - **Type-change warning:** `change-result-type-modal` shows the warning line when the current type is 9.
  - **Docs:** update the `programme-results/CLAUDE.md` Category gotcha and other touched folder guides, and re-stamp them.
- **Implements:** IRD-R-11, R-12, R-13; IRD-DD-7, DD-8, DD-9
- **Files (expected):** `result-sections.service.ts`, sidebar template, `result-header.component.{ts,html,spec.ts}`, `results-list.component.{ts,html,spec.ts}`, `programme-results` service/filter + specs, `change-result-type-modal.component.{ts,html,spec.ts}`, folder `CLAUDE.md` files
- **Depends on:** IRD-T-1
- **Blocks:** IRD-T-8
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any of these fails.
    - Any label changes for a non-9 type.
    - The header shows a wrong or missing area for the 0/1/2-Principal cases.
    - A type-9 row still lands in `Other`.
    - An existing `programme-results` category spec must be edited for a non-9 reason.
    - The warning shows for a non-9 type.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern="result-sections|result-header|results-list|programme-results|change-result-type-modal"`
- **Definition of done:** green; lint is clean; Overview finding recorded.

### IRD-T-8 — HITL: visual, copy and PRTest walk-through — `[ ]`

- **Type:** HITL (user)
- **Description:**
  - **Pre-push:** run `--findRelatedTests` on all changed files, then push qa-dev → perf, with the user's go-ahead for each commit.
  - **The user checks on PRTest:**
    1. Visual vs guide v2 (steps 2–7), confirming or replacing the three placeholder copies (contributors, evidence, definitions placement); the agent applies the final text.
    2. Keyboard through the picker.
    3. An impact result, e.g. 10039 or a new one from the card:
       - fill all 5 sections;
       - the sidebar reaches 5/5 green with no ToC data;
       - Submit works.
    4. Labels in the sidebar, header, Results Center and SP Results.
    5. A P25 non-impact result and a P22 type-9 result look unchanged.
- **Implements:** all IRD-R; IRD-NFR-1, NFR-2, NFR-5
- **Depends on:** IRD-T-3..T-7
- **Estimate:** S (agent) + user time
- **Review:** user sign-off recorded in `execution.md` (screenshots / result ids)
- **Definition of done:** the user confirms points 1–5. Then `family.md` row 3 becomes `done` and P2-3901 is ready for `/akili-archive` of the family.

---

## 4. Dependency graph

```text
T-1 ─┬─ T-2 ─ T-3 ─ T-4 ─┐
     ├─ T-5 ─────────────┤
     ├─ T-6 ─────────────┼─ T-8 (HITL)
     └─ T-7 ─────────────┘
```

**Parallel-safe after T-1:** T-5, T-6 and T-7 touch disjoint files. T-2 → T-3 → T-4 is a chain. Run at most 2 Implementers at once, and only one Jest run at a time.
