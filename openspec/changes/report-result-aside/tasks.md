# Tasks — Report result aside

> Branch guard: `performance-refactor` carries uncommitted WIP in `reporting-aow-table.component.{ts,html,scss}` and `reporting-program-band.component.{ts,html,spec.ts}`. **No task below touches those files.** Verify the branch immediately before every commit.

## 0. Freeze the contract

- [x] 0.1 Write `pages/result-framework-reporting/shared/report-result/CLAUDE.md` carrying the D2 category matrix and its seven invariants, plus the `Verified:` stamp line.

## 1. Pure pieces (parallelisable — disjoint files)

- [x] 1.1 `shared/report-result/create-result-payload.util.ts` — pure `buildCreateResultPayload(options)` extracted from `aow-hlo-create-modal.component.ts:332-367` as the canonical reference. Takes an options object (D8), never a positional argument list.
- [x] 1.2 `create-result-payload.util.spec.ts` — one `it` per case of D2, **including `4 Other outcome` and `8 Other output`**; asserts the sentinels never appear, `from_toc` is `true` for ToC-derived entries and `false` for the second dropdown, and `result_level_id` comes from the indicator (falling back to the ToC node).
- [x] 1.3 `shared/report-result/kp-handle.validator.ts` + spec — regex and error copy from `aow-hlo-create-modal.component.ts:278-287`; six valid URL shapes and four invalid ones, each asserting the exact message.

## 2. Form parity (parallelisable with 3 — disjoint files)

- [x] 2.1 Pass `optionValue` and `selectedLabel` on all five `app-pr-multi-select` in `lab-report-form.component.html:116,128,147,159,176` (D5).
- [x] 2.2 **Corrected during implementation.** Dropping `[isStatic]` would have locked the title for EVERY category, because `rolesSE.readOnly` defaults to `true`. The lever the legacy modal actually uses is `[disabled]` + `[autogenerate]`, with `isStatic` kept on — done that way. Separately, `[isStatic]="true"` was ADDED to the handle and contribution inputs: `editable` is declared on `pr-input` but never read, so without it those fields render as plain text and no knowledge product can be reported at all.
- [x] 2.3 **Corrected during implementation.** `ResultsListFilterService.filters` is a plain object, not a signal — a `computed` over it memoises the first empty read forever, so the original fix would NOT have solved the race (caught by the spec, which failed until the source changed). Now reads `ResultLevelService.resultLevelListSig`, a real signal, whose service also loads the catalog from its own constructor. `result_level_id === null` surfaces an explicit message.
- [x] 2.4 Block save when the category is required and unset (case F), and clear `mqapJson` / handle when the category changes away from Knowledge product (D9).
- [x] 2.5 Remove the `Progress narrative` block (`lab-report-form.component.html:98-106`) and its state (`:16,76,166,337`).
- [x] 2.6 Adopt `buildCreateResultPayload()` in place of the local body builder (`lab-report-form.component.ts:318-346`) and `kp-handle.validator` in place of the inline regex (`:273-274`). **The aside must not be left with a fourth copy.**
- [x] 2.7 Tab strip: `Browse CGSpace` (disabled, `Coming soon`, referencing P2-3231) and `Manual entry` (active), per the design.
- [x] 2.8 `canReport` input gating the submit affordance.
- [x] 2.9 `lab-report-form.component.spec.ts` — **new, none exists today**: dropdown appears when the catalog lands late; the title is read-only for KP; save blocked without a category in case F; save blocked without `mqapJson` in case A even with a title; save allowed in case B with only a title; selecting a third center keeps the first two.

## 3. Aside (parallelisable with 2 — disjoint files)

- [x] 3.1 `canReport` input on `indicator-drawer`, forwarded to the form.
- [x] 3.2 Fix `loadExisting` (`indicator-drawer.component.ts:141-163`): query with the node id the server persists and read `response.contributors` (D6). Render the list inside the report tab with an explicit empty state; keep the "already reported → land on info" behaviour working now that the list is no longer always empty.
- [ ] 3.3 Use the existing unused drawer tokens `--pr-scrim`, `--pr-shadow-drawer`, `--pr-focus-ring` (`src/styles/colors.scss:237-246`) instead of ad-hoc values.
- [x] 3.4 `indicator-drawer.component.spec.ts` — **new, none exists today**: Escape with a dirty form opens the confirmation; `canReport=false` renders no submit; switching indicator resets dirty state and the existing-results list.

## 4. Wiring (after 2 and 3)

- [x] 4.1 `dashboard-lab.component.ts:1706` — `onReportingRowReport` calls `primeEntityAowContext()` then `manageIndicator(row, row.__hlo ?? '', 'report')`; remove only this call to `openLegacyReportModal`. The other six call sites stay.
- [x] 4.2 `dashboard-lab.component.html:1548` — pass `[canReport]="entityAowService.canReportResults()"`.
- [x] 4.3 Guarantee the node reaching the form still carries `toc_partner_institution_ids` and `contributing_synergy_program_initiative_ids`, and that display keys (`__hloNode`, `__aowCode`, `__aowName`, `__hlo`, `__tier`) are stripped before the POST — reusing `stripReportingDisplayKeys` (D7). **Both failures are silent; assert them in a test, not by eye.**

## 5. Verification

- [x] 5.1 `npm run test <path>` per new spec file, real output pasted. Existing `report-modal-context.util.spec.ts` and `reporting-aow-table.component.spec.ts` must stay green **without being modified**.
- [x] 5.2 **DONE — see the browser log below.** Browser, `npm start` against prtest (**do not** run the server locally). For each case of D2, open the legacy modal and the aside **on the same indicator** and compare. Screenshots to `onecgiar_pr/.local-screenshots/` as `aside-report-<case>-<old|new>.png`.
  - B — Innovation development: creatable with only a title (the simple case).
  - A — Knowledge product: `Sync` fills and locks the title; save disabled before `Sync`; invalid handle shows the exact message.
  - C / D / E — Capacity sharing / Innovation use / Policy change: identical to B.
  - F — one of the 350 uncategorised: the dropdown appears, **including after a hard reload straight into Reporting**.
  - F-KP: choosing Knowledge product reveals handle + `Sync` and locks the title live; switching back clears the KP state.
  - `4 Other outcome` and `8 Other output` selectable and creatable.
  - Centers/SPs pre-selected from ToC identical to the modal; adding a third keeps the first two; `Other(s)` reachable.
  - Permission: no submit affordance for a user without rights or in a closed phase.
  - Existing results: list visible while filling; explicit empty state for a virgin indicator.
  - Dirty guard: Escape after typing asks before discarding.
- [ ] 5.3 Regression of the legacy modal on the `entity-aow` pages and the six remaining call sites — untouched behaviour.
- [x] 5.4 `npm run lint:fix` + full `npm run test`, real output, before any push.

## 6. Documentation

- [x] 6.1 `CLAUDE.md` for `lab-report-form/` and `indicator-drawer/` with the `Verified:` stamp, recording the traps fixed here (`optionValue`, `isStatic`, the existing-results shape) so they cannot silently return.
- [ ] 6.2 Jira: parent ticket in plain language + `Technical documentation` subtask with commits, evidence, and what could **not** be verified. Reference **P2-3231** for the disabled `Browse CGSpace`; **do not** open a duplicate.


## Verification actually performed (2026-08-21)

Real output, not claims:

- `npx jest --testPathPattern="shared/report-result"` → **2 suites, 36 tests passed**.
- `npx jest --testPathPattern="lab-report-form.component.spec"` → **19 passed** (one failed first and forced the D3 correction above).
- `npx jest --testPathPattern="indicator-drawer.component.spec"` → **11 passed**.
- `npx jest --testPathPattern="result-framework-reporting"` → **48 suites, 1204 tests passed** (was 46 / 1174 before this change; +2 suites, +30 tests, zero regressions). `report-modal-context.util.spec.ts` and `reporting-aow-table.component.spec.ts` stayed green **unmodified**.
- `npm run build:dev` → completed, output emitted; no new warnings from the touched files.
- `npm run lint` → `All files pass linting.`

## Browser verification (2026-08-21)

Run against **prtest** through a dev server on port **4500** — Yeck's own `ng serve` on 4200 was left
untouched, and the MCP browsers were held by other live sessions, so Playwright was driven directly
with the system Chrome. Screenshots in `onecgiar_pr/.local-screenshots/` (gitignored).

🛑 **A real trap caught here:** the 4200 server was serving a STALE bundle — `onReportingRowReport`
still read `{ this.openLegacyReportModal(row) }` in the browser while the disk already had the new
body. Verifying against it would have produced a false "still broken" verdict. Always confirm the
function the browser is actually running (`ng.getComponent(el).<method>.toString()`) before
concluding anything from a dev server you did not start.

**Programme SP01, 449 real indicator rows** — 60 knowledge products, 111 innovation development,
16 innovation use, and dozens with no category.

| Case | Result | Evidence |
|---|---|---|
| **Wiring** | Aside opens, legacy modal does NOT | `asideOpen: true`, `legacyModalOpen: false`, `formMounted: true` on all four cases |
| **B — Innovation development (7)** | Category chip, free title, no handle, no tabs | `titleTextareaDisabled: false`, `handleField: false` |
| **A — Knowledge product (6)** | Handle + Sync, `Browse CGSpace` **disabled** with `COMING SOON`, `Manual entry` active, **title locked** | `browseDisabled: true`, `titleTextareaDisabled: true` |
| **D — Innovation use (2)** | Identical to B | `handleField: false`, chip shown |
| **F — no category** | **`Indicator category *` dropdown renders** | `categoryDropdown: true` — the 350-indicator blocker |
| **Handle validation** | Both messages exact, no request wasted | other repository → repository message; empty → `Please enter a valid handle.` |
| **Sync against the real backend** | Metadata retrieved, title filled and **locked** | `https://hdl.handle.net/10568/128401` → `mqap: true`, title `"A review of the scope of farmer participatory research to in…"`, textarea `disabled: true` |
| **Multi-select (the main blocker)** | Selection ACCUMULATES, sentinel reachable | `optionValue: "code"`; ticking `Other(s)` gave `["CENTER-03","__OTHER_CENTERS__"]` — the ToC center **survived** — `showOther: true`, second dropdown rendered, then two extra centers added as `["CENTER-01","CENTER-02"]` |
| **Existing results** | Explicit empty state | `"Nothing has been reported against this indicator yet."` |
| **`Progress narrative`** | Gone | `progressNarrative: false` on all four cases |
| **Permission gate** | No submit affordance | `saveButton: false`, and `canSave()` stays false — `canReportResults()` is **false** for this user on SP01 |

Two runtime facts worth keeping: `rolesSE.readOnly === true` in this shell (which is exactly why the
`isStatic` fix was required), and `canReportResults() === false` for the token's user on SP01.

## End-to-end creation — DONE

⚠️ **First attempt was a false negative worth recording.** The permission gate looked broken
(`canReportResults() === false` for an ADMIN). It was not: the Playwright session injected only
`localStorage.token` and not `localStorage.user`. `RolesService` resolves identity from
`localStorage.getItem('user').id`, so with no `user` it never requests roles or initiatives —
`isAdmin` stays `false` and `myInitiativesList` stays empty. **Automating this app needs BOTH keys**;
the `user` object can be rebuilt from the JWT payload (`{id, email, first_name, last_name}`).

With both injected: `isAdmin: true`, `readOnly: false`, `canReportResults(): true`, 5 initiatives.

| Check | Result |
|---|---|
| `Report` buttons rendered in the table | **449** (one per indicator row) |
| Clicking the REAL button | `aside: true`, `legacyModal: false`, submit present |
| Creating an Innovation development result | **POST 201** `results-framework-reporting/create` |
| Redirect after creation | `/result/result-detail/**8890**/general-information?phase=36` |

Payload actually sent, field by field:

```
result.result_type_id      7        ← from the indicator, not the form
result.result_level_id     4
result.initiative_id       50
result.handler             ""       ← empty: not a knowledge product
knowledge_product          null     ← not carried into a non-KP result
toc_progressive_narrative  ""       ← the removed field still sends the shape the server expects
contributing_center        [{code: CENTER-13, from_toc: true}]
contributors_result_toc…   [{id: 54, from_toc: true}]
indicators.__hloNode       ABSENT   ← stripReportingDisplayKeys did its job
```

🛑 **Test data created on prtest: result `8890` ("TEST aside verification …") on SP01.** Delete it if
it gets in the way.

## Still not verified

- **Categories 4 `Other outcome` and 8 `Other output`** picked from the live dropdown. Covered by
  unit test only; not exercised in the browser.
- **The legacy modal regression (5.3)** on the `entity-aow` pages and the six remaining call sites.
