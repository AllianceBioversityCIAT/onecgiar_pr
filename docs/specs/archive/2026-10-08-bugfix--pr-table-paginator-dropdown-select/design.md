# Module Spec — `pr-table-paginator-dropdown-select` — Design

Linked: `requirements.md` (same folder) · `proposal.md` (same folder, Bug Diagnosis source).

## 1. Summary

Replace the `<select [value]="effectiveRows()">` binding in the two shared table components' paginator with a `[selected]` binding on each dynamically-generated `<option>`. This makes the rows-per-page dropdown visually track the component's real page size at all times, regardless of that value's position in `rowsPerPageOptions`. The fix is two small template edits plus a DOM-level regression test; no component logic, inputs, or consumer files change. Biggest accepted trade-off: the control stays a bare native `<select>` (a pre-existing, separately tracked design-system violation) — replacing it is explicitly out of scope.

## 1A. Premise Ledger

**Count:** 6 premises — 5 verified, 1 `UNVERIFIED` (1 High impact, 0 Low).
**Blast-radius triggers:** `live-path` fires (design names the user action of opening a table with a non-first-option default); `shared-state` fires (the defect and the fix both apply to a pattern shared by two components' templates); `consumer` fires (the design touches a shared component's internal template markup read, indirectly, by every consumer table and by 5 spec files).

| # | Premise | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | `bilateral-results-list.component.html` renders its table via `<app-pr-table>`, whose own template is `pr-table.component.html` — the file diagnosed as root cause is on the live path for the reported symptom | `live-path` | `grep -n "app-pr-table" onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html` → line 364 | `2e1d63f65` | Impact High — root cause not confirmed, diagnosis reopens |
| P-2 | `pr-group-table.component.html` carries the byte-identical defect pattern as `pr-table.component.html` (native `<select [value]>` + `@for`-generated `<option>`, same `effectiveRows()` computed signal) | `shared-state` | Both files read in full this session: `pr-table.component.html:52-61`, `pr-group-table.component.html:53-63` — markup identical bar whitespace; `effectiveRows()` defined identically at `pr-table.component.ts:105` / `pr-group-table.component.ts:118` | `2e1d63f65` | Impact High — fix would need to diverge per component, or does not apply to the group table |
| P-3 | 26 distinct consumer-table files route through `app-pr-table`/`app-pr-group-table` and require no code change of their own; no Cypress/E2E spec references the paginator's DOM hooks | `consumer` | `grep -rl "app-pr-table\|app-pr-group-table" onecgiar-pr-client/src --include=*.html` (excluding the `pr-table/` folder) → 26 files; `grep -rl "pr-paginator__size\|Rows per page\|effectiveRows" onecgiar-pr-client --include="**/*.{ts,cy.ts}"` → only the 2 component files + 3 `.spec.ts` files (`pr-table.component.spec.ts`, `pr-group-table.component.spec.ts`, `bilateral-results-list.component.spec.ts`); zero Cypress hits | `2e1d63f65` | Impact Low — scope section needs a note if a non-conforming consumer surfaces; fix location unchanged |
| P-4 | No existing commit on any branch already fixes the paginator `<select>` visual-value defect | `existence` | `git log --all --oneline -- onecgiar-pr-client/src/app/shared/components/pr-table/pr-table.component.html onecgiar-pr-client/src/app/shared/components/pr-table/pr-group-table.component.html` → only `0a6550569` (scaffold), `50710ea38` (PrimeNG removal), `712fea2f7` (bilateral paginate feature); none touch the `<select>`/`[value]`/`[selected]` logic | `2e1d63f65` | Impact High — spec would be unnecessary, stop and report instead |
| P-5 | Neither `pr-table.component.spec.ts` nor `pr-group-table.component.spec.ts` (nor `bilateral-results-list.component.spec.ts`) asserts the rendered `<select>`'s DOM value today — only the internal `effectiveRows()` signal | `other` | `grep -n "effectiveRows\|select" pr-table.component.spec.ts` → lines 74, 77, 232, all `table.effectiveRows()`; `bilateral-results-list.component.spec.ts:1611-1617` same pattern (`tableCmp.effectiveRows()`) | `2e1d63f65` | Impact Low — a DOM-value regression test already does not exist; nothing to reconcile |
| P-6 | Binding `[selected]="opt === effectiveRows()"` on each `@for`-generated `<option>` reliably drives the native `<select>`'s visible selection in both jsdom (Jest) and a real browser, independent of the options' render order | `other` | `UNVERIFIED — confirm at source before relying on it` (standard documented Angular/DOM behavior for dynamic native `<select>` options, not yet executed against this repo's own test harness) | `—` | Impact High — Option A (recommended fix) would not work; `PTD-T-1` would need to fall back to the ViewChild+effect alternative (Approach Option B in `proposal.md` §10) |

Settled by: P-6 is settled by `PTD-T-1` itself — its Red run (§10 below) is written and executed **before** the template edit, so the premise is proven or refuted by the task's own red→green transition, not assumed.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/shared/components/pr-table/` only — `pr-table.component.ts`/`.html` and `pr-group-table.component.ts`/`.html`, plus their `.spec.ts` files.
- **No server modules, no external integrations, no API surface.**

### 2.2 Interaction (unchanged, for orientation only)

```
[Any consumer page template]
  └── <app-pr-table [rows]="N" [rowsPerPageOptions]="[...]">
        └── pr-table.component.html paginator block
              ├── effectiveRows() computed signal (unchanged)
              ├── @for over rowsPerPageOptions → <option> elements (unchanged list)
              └── (change) → setPageSize(+value) (unchanged)
```

Only the binding that decides which `<option>` is visually marked selected changes — nothing above or below it in this chain.

## 3–5. Data Model / API Surface / Server Workflow

Not applicable — no entities, migrations, endpoints, or server logic touched.

## 6. Frontend Plan

### 6.1 Routes / modules

No routes or modules change. `shared/components/pr-table/pr-table.module.ts` (and the group-table equivalent, if separately moduled) need no import changes — same component, same selector, same `@Input`s.

### 6.2 Components & services

- **`pr-table.component.html`** (paginator block, current lines 52-61): remove `[value]="effectiveRows()"` from the `<select>` element; add `[selected]="opt === effectiveRows()"` to the `<option>` generated by the existing `@for (opt of rowsPerPageOptions; track opt)`. The `(change)="setPageSize(+$any($event.target).value)"` handler, `aria-label="Rows per page"`, and `class="pr-paginator__size"` stay exactly as they are.
- **`pr-group-table.component.html`** (current lines 53-63): identical edit, same reasoning (per P-2).
- **`pr-table.component.ts` / `pr-group-table.component.ts`:** no change. `effectiveRows()`, `setPageSize(...)`, `rowsPerPageOptions` all stay as-is — this is a template-only fix.
- No new component, no new service, no new state boundary.

### 6.3 Design system usage

- No token, color, spacing, or typography change — the fix is a selection-binding correction, not a visual redesign. The `.pr-paginator__size` SCSS class and its visual appearance are untouched.
- The native `<select>` itself remains (documented as accepted debt in `requirements.md` §11 / `proposal.md` §6) — not re-opened by this spec.
- No i18n keys touched (the dropdown shows numeric values, not copy).

### 6.4 Real-time / notification UX

Not applicable.

## 7–9. Security / Performance / Observability

Not applicable — no auth surface, no new queries, no logging changes. Presentation-only fix with zero data exposure or performance impact (same DOM node count, same change-detection graph shape).

## 10. Testing Plan (forward-looking)

- **Unit (Jest), both components:** extend `pr-table.component.spec.ts` and `pr-group-table.component.spec.ts` with a case that sets `rowsPerPageOptions` to a list where the bound `rows` value is **not** first (mirroring the real bilateral configuration, `[10,25,50,100]` with `rows=100`), renders the fixture, and reads the **actual DOM**: the `<select>` element's `.value` (or the `<option>` with `.selected === true`) — never `component.effectiveRows()` alone. This is the regression test Bug Mode requires: it must be observed **red** against the current (pre-fix) template, then **green** after the template edit.
- **Regression guard for the unaffected majority:** a second case keeps a first-option default (e.g. `rowsPerPageOptions=[10,25,50]`, `rows=10`) and asserts the dropdown still shows `"10"` — proving the fix does not disturb the 25 tables that already happened to work.
- **No Cypress/E2E addition needed** — P-3 confirms no E2E spec touches this surface; Jest/jsdom is sufficient to observe a native `<select>`'s `.value`/`.selected` property.
- **No coverage-threshold risk** — `shared/components/pr-table/` is not in the client's coverage-exclusion list (`custom-fields/`, `rd-contributors-and-partners/`); the two edited template files are already exercised by their existing spec suites.

## 11. Backwards Compatibility & Migration Plan

- Purely additive/corrective at the template level — no API contract, no data migration, no feature flag.
- **Rollback:** revert the single commit; the pre-fix markup returns, with the dropdown's display bug (not a regression, the original defect) as the only consequence.

## 12. Design Decisions (ADRs)

### `PTD-DD-1` — Drive `<select>` option selection via per-`<option>` `[selected]`, not the `<select>`'s own `[value]`

- **Context:** a native `<select>`'s `[value]` binding can only select an `<option>` already present and matched in the DOM at assignment time; when the bound value is not the first of the `@for`-generated options, the browser silently shows the first option instead, while the component's internal signal state stays correct (root cause, `proposal.md` §9).
- **Decision:** remove `[value]="effectiveRows()"` from the `<select>`; add `[selected]="opt === effectiveRows()"` to each `<option>` in the same `@for`. Each option's own selected state is then set directly as that option renders, independent of list completeness or render order elsewhere in the list.
- **Alternatives considered:**
  - *(B) `ViewChild` + `effect()`/`afterRenderEffect()` imperative sync* — rejected: solves the same problem with added lifecycle machinery (`ViewChild`, an effect, manual `.value` assignment) for something the declarative `[selected]` binding already does idiomatically.
  - *(C) Migrate to `app-pr-select`/Spartan select* — rejected for this spec: correct long-term direction (closes the "never a bare native control" rule violation too), but a materially larger, higher-visual-risk change across all 26 consumer tables; tracked separately as tech debt (`requirements.md` §11).
- **Consequences:** the dropdown now reflects true state unconditionally. The control remains native HTML (accepted, pre-existing debt — not reopened here). The regression test must read the rendered DOM, not the component signal, to actually prove this (P-6, settled by `PTD-T-1`'s own red→green run).

**Step 2.3 reversion challenge:** N/A — `PTD-DD-1` corrects a defect, it does not remove, disable, or invert any already-delivered, intentionally-shipped behavior. No challenge required.

## 13. Open Gaps & Follow-ups

- **Follow-up (not this spec):** migrate the native `<select>` to `app-pr-select`/Spartan across `pr-table`/`pr-group-table` to close the design-system rule violation — larger change, own proposal.
- **Accepted risk:** no automated visual-regression tool in this repo for paginator styling; a manual spot-check of bilateral (non-first-option case) and one first-option-default table (e.g. `results-list`) is required at task Done criteria, per `requirements.md`'s defect-class table.

## Budget (Step 2.4)

- **Expected tasks:** 1 (both template edits + both regression tests are one coordinated, atomically-reviewable change).
- **Expected LOC:** ~15-25 (2 one-line template edits + 2 new Jest test cases per spec file, ~4-6 lines each).
- **Expected review rounds:** 1 (low risk, narrow diff, no shared-symbol/contract change beyond the already-enumerated consumer sweep).

Depth check: `Lite` was chosen in the proposal and matches this estimate — no upgrade or downgrade recommended.

## Required cross-references

- `docs/specs/bugfix/pr-table-paginator-dropdown-select/requirements.md` (same folder).
- `docs/specs/bugfix/pr-table-paginator-dropdown-select/proposal.md` (same folder) — source of the confirmed root cause and Blast Radius this design's Premise Ledger inherits.
- `docs/prd.md` `G4`; `docs/ux-ui/design.md` §5; `onecgiar-pr-client/CLAUDE.md` §5 (Interactive controls rule — noted, not resolved here).
