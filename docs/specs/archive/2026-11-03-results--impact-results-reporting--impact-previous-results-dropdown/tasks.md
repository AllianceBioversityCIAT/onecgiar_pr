# Tasks — Impact previous-results dropdown

## 1. Scope

Frontend only, `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/`. Budget: 3 tasks · ~550 LOC · 2 review rounds (design §13). Commit tag `[SPEC:results/impact-results-reporting/impact-previous-results-dropdown]`.

## 2. Pre-flight

- [ ] On `qa-development-2026-ss`; quick change `quick/impact-previously-reported-label` committed or knowingly carried in the tree.
- [ ] Test rules: Jest `--maxWorkers=2` scoped; Cypress CT in batch, never alongside Jest; free RAM ≥ 4 GB.

## 3. Task list

### IPD-T-1 — Turn the picker into the inline dropdown

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M |
| Depends on | — |
| Requirements | IPD-R-1 (all rows; Sc 1.1 "current result not listed", "no dialog"; Sc 1.2; Sc 1.3), IPD-R-2 (Sc 2.1 incl. BUT Reset; Sc 2.2 incl. AND IT MUST NOT Load more on last page; Sc 2.3), IPD-R-3 Sc 3.2, IPD-NFR-1 (inside panel), NFR-2 (styles), NFR-4, NFR-5 |
| Design | §6.1, §6.3, IPD-DD-1, DD-2, DD-3 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` |

**Scope:** `previous-results-picker.component.{ts,html}` + new `.scss` (styles copied from Contributors), rewritten `.spec.ts`. Remove `BrnDialogRef` / dialog context / Hlm dialog imports; add inputs `resultId`, `selection`, output `selectionChange`; open signal; portfolio segment (distinct `obj_portfolio` from versioning; All sends no `portfolioId`; never `versionId`); typology chips → `typeIds`; Load more append; Reset; Clear selection; Escape/Close/outside-click close with focus to field; first load on first open.

**Tests (Jest, `--testPathPattern=previous-results-picker`, `--maxWorkers=2`):**
- params: `excludeResultId` always = input; chip toggle → `typeIds`; P25 → `portfolioId` = that portfolio id and no `versionId`; typing burst → one call after 300 ms.
- stale: two loads, first response arrives last → list shows the second.
- Load more appends page 2; on `page === totalPages` button absent.
- Reset clears q, chips, portfolio and reloads page 1; Clear emits `[]`.
- row toggle emits added/removed array; error shows Retry and emits nothing; 0 items shows empty text.
- no E5 call before first open.

**Fails if:** a dialog import remains; `versionId` is sent; Load more replaces instead of appending; a stale response overwrites the latest; selection emits on filter change.
**Disqualifier:** tests that only assert template text presence do not prove params — each param assertion must read the mocked `GET_impactPreviousResultsSearch` call args.
**Done:** spec green; `npx eslint <touched files> --quiet` clean.

### IPD-T-2 — Wire the page and the Contributors-style selected list

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | IPD-T-1 |
| Requirements | IPD-R-1 (field header + required marker, "no Add results"), IPD-R-3 (list; Sc 3.1 incl. focus fallback), IPD-R-4 (Sc 4.1 incl. BUT Cancel), IPD-R-5, Sc 1.1 "section marked unsaved" |
| Design | §6.2, §6.3, IPD-DD-4 |
| Skills | `angular-developer`, `spartan`, `tdd` |

**Scope:** `impact-level-info.component.{ts,html,scss,spec.ts}`; drop `HlmDialogService` + `openPreviousResultsPicker`; `onSelectionChange`; focus fallback → dropdown field; feedback marker label "Please select a result"; module `CLAUDE.md` contract section updated.

**Tests (Jest, `--testPathPattern=impact-level-info.component`, `--maxWorkers=2`):**
- `selectionChange` → `previousResults` replaced, `hasUnsavedChanges()` true, save body ids match.
- remove first of 2 → focus on next remove button; remove last remaining → focus on dropdown field.
- Yes→No confirm clears list + hides dropdown; Cancel keeps Yes + both rows (existing specs adapted, not deleted).
- read-only: no `app-previous-results-picker`, no remove buttons, rows visible.
- no `HlmDialogService` injected (provider absent from TestBed and component still creates).

**Fails if:** removing a row mutates the array in place (dirty check misses it); read-only renders the field; the confirm revert test no longer clicks the real "No" `.choice`.
**Done:** spec green; eslint touched files clean; `CLAUDE.md` no longer mentions the dialog.

### IPD-T-3 — Browser proof: keyboard, width, visual parity

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | IPD-T-2 |
| Requirements | IPD-NFR-1 (Tab/Enter/Space/Escape + focus return), NFR-3, NFR-2 (visual), Sc 1.3 Escape |
| Design | §10, IPD-DD-4 rows 1 and 5 |
| Skills | `angular-developer` |

**Scope:** rewrite `impact-level-info.picker.cy.ts` (1280 + 900 px): open with Enter on the field, Tab to a chip and Space toggles `aria-pressed`, Space on a row selects it, Escape closes and focus is on the field, `scrollWidth <= clientWidth` on the document. Then a 1280 px screenshot of the open dropdown next to the Contributors one.

**Verification:** `npm run test:ct:batch` limited to this spec (no Jest running). Visual: screenshots attached at the HITL pause → user / T6 review.
**Fails if:** focus lands on `body` after Escape; any width overflows by ≥ 1 px.
**Disqualifier:** a CT run that uses `.click()` instead of real keys does not prove IPD-NFR-1; a screenshot with the panel closed proves nothing about parity. jsdom results are not accepted for this task.
**Done:** CT green at both widths; user approves the screenshot pair.

## 4. Dependency graph

`IPD-T-1 → IPD-T-2 → IPD-T-3` (sequential; T-2 consumes T-1's inputs/outputs).

## 5. Clause coverage

| Clause | Task |
|---|---|
| R-1 Sc1.1 current result not listed / no dialog / unsaved | T-1 / T-1, T-2 / T-2 |
| R-1 Sc1.2, Sc1.3 (Close, field toggle, Escape) | T-1 (Escape focus also T-3) |
| R-2 Sc2.1 one request, latest only, BUT Reset | T-1 |
| R-2 Sc2.2 append, AND IT MUST NOT Load more on last | T-1 |
| R-2 Sc2.3 error+Retry, empty text | T-1 |
| R-3 Sc3.1 remove + focus order | T-2 |
| R-3 Sc3.2 Clear selection + footer | T-1 |
| R-4 Sc4.1 confirm, BUT Cancel | T-2 |
| R-5 read-only | T-2 |
| NFR-1 keyboard | T-1 (Jest attrs), T-3 (real keys) |
| NFR-2 visual | T-1 (styles), T-3 (screenshot) |
| NFR-3 width | T-3 |
| NFR-4 debounce/stale | T-1 |
| NFR-5 announce | T-1 |

## 6. Rollout

Client only, no migration. qa-dev → performance-refactor → PRTest smoke on a P25 Impact contribution result (open, filter P25 + one type, select 2, save, reload, remove 1, save).

## 7. Roll-back

Revert the spec commits; stored links are unaffected.
