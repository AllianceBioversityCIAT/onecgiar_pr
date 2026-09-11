# Design — Report result aside

All paths relative to `onecgiar-pr-client/src/app/` unless prefixed `onecgiar-pr-server/`.

| Alias | Real path |
|---|---|
| `MODAL` | `pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/aow-hlo-create-modal.component.{ts,html}` |
| `FORM` | `pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.{ts,html}` |
| `DRAWER` | `pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html}` |
| `SHELL` | `pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.{ts,html}` |

## D1 — Reuse the existing aside; do not build a new one

`DRAWER` already provides Escape handling, an unsaved-changes guard, resizing and `prefers-reduced-motion`, and already mounts `FORM`. The other drawers in the app (including `result-review-drawer` in bilateral-results) have less. **The work is raising it to parity, not replacing it.**

Reused as-is: `buildReportModalNode` / `stripReportingDisplayKeys` (`.../reporting-aow-table/report-modal-context.util.ts`, already spec-covered), the `pr-*` custom fields the modal uses, `CentersService`, `ResultsListFilterService`, `ApiService.resultsSE`, `alertsFe`, and `EntityAowService.canReportResults()`.

## D2 — Indicator-category matrix (the contract that must not be lost)

Verified against live data (`GET /api/results-framework-reporting/toc-results`, 1 684 unique indicators) and against `onecgiar-pr-server/src/shared/constants/result-type.enum.ts`.

**There is exactly one branch in the whole form: Knowledge product vs everything else.** No per-type fields exist for Innovation development, Capacity sharing, Policy change or Innovation use. Adding any is new scope.

| Case | Category | Count | Branching code | Fields rendered | Save blocked unless |
|---|---|---|---|---|---|
| A | Knowledge product (`6`) | 688 | `currentResultIsKnowledgeProduct()` — `MODAL.ts:61-66` / `FORM.ts:90-95` | category chip · **handle + `Sync`** · **title locked, filled by Sync** · contribution · centers · SPs | `mqapJson` present **and** title present |
| B | Innovation development (`7`) | 385 | none (`else` of A) | category chip · **free title** · contribution · centers · SPs | title non-empty |
| C | Capacity sharing (`5`) | 182 | none | same as B | same as B |
| D | Innovation use (`2`) | 51 | none | same as B | same as B |
| E | Policy change (`1`) | 28 | none | same as B | same as B |
| F | no category (`NULL`) | 350 | `@if (…indicators[0].result_type_id)` — `MODAL.html:39` / `FORM.html:4` | **required category dropdown** + everything in B | category chosen **(new — see D3)** and title non-empty |
| F-KP | F → user picks Knowledge product | — | `\|\| createResultBody().result_type_id === 6` (`MODAL.ts:64`) | switches to A live | rules of A |
| G | Emerging (no indicator, no ToC node) | — | `emergingCategory()` — `FORM.ts:62-63`, **absent from the modal** | category fixed by the entry card | `canSave()` |

**Dropdown contents.** Options come from `filters.resultLevel.find(id === result_level_id).options`; `result-level.service.ts:143-151` removes only `10` and `11`. Therefore:

- `result_level_id = 4` (OUTPUT) → **5, 6, 7, 8** — includes **`8 Other output`**
- `result_level_id = 3` (OUTCOME) → **1, 2, 4** — includes **`4 Other outcome`**

⚠️ `4 Other outcome` and `8 Other output` are reachable **only** through case F. They behave like B and must appear in the payload spec and the tests; earlier analyses of this flow omitted them.

**Invariants that must survive.**

1. Only one branch: KP vs non-KP.
2. Case B must be creatable by typing the title and nothing else.
3. The category dropdown appears **whenever** the indicator carries no `result_type_id` — see D3.
4. Choosing Knowledge product in that dropdown transforms the form live (F-KP).
5. `result_level_id` is never chosen by the user (`MODAL.ts:335-337`).
6. ToC-derived centers and SPs are sent `from_toc: true`; those from the second dropdown `from_toc: false` (`MODAL.ts:347-352,359-365`).
7. The `__OTHER_CENTERS__` / `id: -999` sentinels never travel in the payload (`MODAL.ts:349,362`).

## D3 — Category catalog: derive, do not snapshot

`FORM.ts:142-159` reads the async catalog once in an `effect`; losing the race leaves 350 indicators unreportable. The fix is a `computed` over the existing signal in `ResultsListFilterService` so the dropdown appears the moment the catalog lands — **not** a new cache with its own copy of the state.

Edge case kept explicit: `result_level_id` can be `NULL` (`onecgiar-pr-server/.../aow-bilateral.repository.ts:433-438` has an `ELSE NULL` branch). A null level finds no options; the form must then say the category cannot be determined instead of silently rendering a read-only chip. Not observed in today's data — reachable by code.

## D4 — Knowledge product: what `Sync` does and what stays disabled

`Manual entry` (working): the user pastes a repository link, `Sync` calls `GET results-knowledge-products/mqap?handle=`, the title is filled from the response and **locked**, and `mqapJson` is stored for the payload. Handle regex and error copy are extracted to `kp-handle.validator.ts` — today duplicated verbatim in `MODAL.ts:278-287` and `FORM.ts:273-274` and already drifted once.

`Browse CGSpace` (disabled): no endpoint exists. Rendered in its place in the tab strip, disabled, with a `Coming soon` tag pointing at **P2-3231** (epic **P2-3230**) — raised by Ángel, already specifying a pre-fetched list of the user's knowledge products with title search and year / repository / type filters. **No duplicate ticket is created.** Nothing is faked and nothing is silently dropped.

Two server behaviours are documented, not worked around: a handle already reported returns **200** (so the UI shows a green alert with an undefined title), and a syntactically valid but non-existent handle currently surfaces a 500. Both are server-side and out of scope.

## D5 — Fixing the five multi-selects

Pass `optionValue` (the key each list is actually identified by) and `selectedLabel`, matching the modal, on all five controls in `FORM.html:116,128,147,159,176`. Without it `pr-multi-select.component.ts:355` matches every option against every value.

Note the failure is the **opposite** of what it looks like: with an empty pre-selection the sentinel does enter (`indexFind = -1`); it is precisely when the ToC pre-loads centers that selection becomes destructive and `Other(s)` unreachable. A fix that only relaxes the `@if` on `showOtherCenters()` would change nothing.

## D6 — Existing results

Single implementation, on the parameter and shape the server implements: query by the node id the modal uses, read `response.contributors`. Shown inside the report tab while the form is being filled, with an explicit empty state (the endpoint answers 404 for a virgin indicator).

## D7 — Wiring

```
[Report]  reporting-aow-table (output reportRow, :132)          ← not modified (WIP)
  └→ SHELL.ts:1706 onReportingRowReport(row)
       before: openLegacyReportModal(row)                        ← removed here only
       after : primeEntityAowContext(); manageIndicator(row, row.__hlo ?? '', 'report')
  └→ SHELL.html:1548 <app-indicator-drawer [canReport]="entityAowService.canReportResults()">
  └→ DRAWER.html:69  <app-lab-report-form [canReport]="canReport()">
```

⚠️ `manageIndicator` (`SHELL.ts:421`) builds its node from `indicatorGroups()`, while `openLegacyReportModal` (`:466`) goes through `buildReportModalNode`. Two consequences must be handled explicitly, because both fail **silently**:

- the node must still carry `toc_partner_institution_ids` and `contributing_synergy_program_initiative_ids`, or center/SP pre-selection quietly comes back empty;
- the row must still be stripped of display keys (`__hloNode` carries every sibling indicator of the HLO) before it reaches the POST body.

## D8 — Bilateral seams (shape only, no behaviour)

- Sections modelled as a list of field groups, not a fixed template.
- `fundingSource = input<'w1w2' | 'w3bilateral'>('w1w2')`, used only to decide which groups render.
- `buildCreateResultPayload()` takes an options object, so bilateral keys are additive.
- Editability as an input (`editable`), not an internal read of the global `RolesService.readOnly`.
- `isKnowledgeProduct(indicator, chosenTypeId)` centralised, so the discriminator can move from `type_name` to `result_type_id` without hunting call sites. Today both agree across all 1 684 indicators, but they are different columns and that agreement is a fact about the data, not a guarantee.

`Contribution %` and `Primary contributing science program` are **not** added.

## D9 — Rejected alternatives

- **Build a new drawer**: discards the guard, resize and reduced-motion behaviour `DRAWER` already has.
- **Migrate all seven entry points now**: multiplies the regression surface; the aside is unproven until the Reporting tab has run on it.
- **A new service owning the category catalog**: a third owner of state that already has one.
- **Reproducing the modal payload "byte for byte" as the acceptance bar**: it would faithfully reproduce a real bug — changing category after a successful Sync leaves `knowledge_product` in the body, and the server silently drops it. Payload equivalence is asserted per case in D2, plus an explicit rule that changing category away from Knowledge product clears the KP state.

## D10 — Visual source of truth for this panel (recorded, because it is not the usual one)

The live Claude Design project (`b6234307-e82b-43d0-b4c4-a2bb13b12242`) **does not expose this panel in anything readable**, verified 2026-08-21:

- `PRMS Reporting.dc.html`: zero occurrences of `Existing`, `Manual`, `Repository`, `Browse`, `Coming soon`, `Knowledge`, `Sync`, `position:fixed` across the 2 427 readable lines. `get_file` caps at 256 KiB and the file exceeds it, so **the tail is unreachable** — the panel may well live there. It cannot be asserted absent, only unreachable.
- `PRMS Reporting Tool.html` is a self-extracting export of the same project (identical thumbnail hash); its template block also falls past the cap. No visual content.
- `screenshots/01-drawer*.png`, `02-drawer*.png`, `03-drawer-probe.png` are **the navigation sidebar**, not this panel. `01-drawer4` and `03-drawer-probe` are byte-identical (JPEG 924×540) and show the Reporting screen with the collapsed AoW cards — useful for the surrounding page, not for the panel.

**Therefore the visual reference for this panel is the screenshot supplied by Yeck in the session** (header `Report result`, context block, `Browse CGSpace` / `Manual entry` tabs, CGSpace cards with `Use this item` / `View details`), plus the legacy modal for behaviour. The design tokens still come from the mock: Manrope + JetBrains Mono, violet `#6B46E5`, radii 8–12, all already 1:1 in `src/styles/colors.scss`.

⚠️ Before implementing the panel's chrome, re-read the design file: if the tail becomes reachable (or the project is split into several files) it supersedes this note.
