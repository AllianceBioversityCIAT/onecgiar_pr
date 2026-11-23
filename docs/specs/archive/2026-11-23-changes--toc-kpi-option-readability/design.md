# Design — ToC KPI dropdown readability (`changes/toc-kpi-option-readability`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-kpi-option-readability` |
| Type / Deliverable / Depth | Change / software / Lite |
| Approval Mode | gated |
| Status | draft |
| Verified at | `262dfcf38` (qa-development-2026-ss) |
| Requirements | `requirements.md` (TKR-R-1..3, TKR-NFR-1..4) |

## 2. Executive Summary

Two small pieces, both client-only:

1. **`app-pr-select` opt-in `wrapOptions`** — 50 px rows (the height `extraInformation` already uses), labels clamped to two lines, no sideways scroll. Off by default. The KPI select turns it on.
2. **New presentational `app-clamped-text`** (shared, standalone) — text clamped to N lines with a Show more / Show less button that appears only when the text really overflows. Used in the existing selected-KPI block, above Unit of measurement and Target.

No server, DB, API or payload change.

## 3. Architecture Overview

```
rd-contributors-and-partners.html:76  <app-cp-multiple-wps>
  └ multiple-wps.component.html:41    <app-multiple-wps-content>
      ├ html:88   <app-pr-select optionLabel="indicator_description" [wrapOptions]="true">   ← TKR-R-1
      └ html:117  @if (isCP2026() && selectedIndicatorData())                               ← TKR-R-2
                    <app-clamped-text [text]="selectedIndicatorData().indicator_description" [lines]="3">
                    Unit of measurement · Target (unchanged)
```

Same chain is reached from IPSR contributors, the review drawer and the share-request modal (they render `app-cp-multiple-wps`), so they get both changes automatically.

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `src/app/custom-fields/pr-select/pr-select.component.ts` | + `wrapOptions` input; item size 50 when `extraInformation() \|\| wrapOptions()` |
| `src/app/custom-fields/pr-select/pr-select.component.html` | row height binding + a panel modifier class when `wrapOptions()` |
| `src/app/custom-fields/custom-fields.scss` | modifier rules: label `white-space: normal` + 2-line clamp; `.virtual_scroll` `overflow-x: hidden` — only under the modifier |
| `src/app/custom-fields/pr-select/pr-select.cy.ts` | new CT cases (wrap on / default off) |
| `src/app/shared/components/clamped-text/` | **new** standalone component + `.spec.ts` + `.cy.ts` |
| `src/app/internationalization/clamped-text.copy.ts` | **new** copy: "Show more", "Show less", "KPI statement" |
| `…/multiple-wps-content/multiple-wps-content.component.{ts,html}` | turn on `wrapOptions`; render `app-clamped-text` in the selected-KPI block |
| `…/multiple-wps-content/cpmultiple-wps-content.component.spec.ts` | Jest: block renders / absent pre-2026 / payload untouched |
| `…/rd-contributors-and-partners/CLAUDE.md`, `custom-fields` notes in client `src/CLAUDE.md` if needed | doc stamp (COMPONENT-DOCS convention) |

## 5. Data Model

None. Reads `IndicatorItem.indicator_description` already in `selectedIndicatorData()`.

## 6. API Design

None. PATCH/GET of Contributors & partners unchanged. W3/bilateral payload: no impact.

## 7. Backend Module Design

None.

## 8. Frontend / UX Component Architecture

### 8.1 `app-pr-select` — `wrapOptions` (TKR-R-1, TKR-R-3)

| Aspect | Decision |
|---|---|
| Row height | 50 px (= 2 × 18 px line of `body-2` + padding; `fonts.scss:90-92`). Fixed, so `cdkVirtualFor` item size stays exact |
| Label | `white-space: normal`, 2-line clamp (`-webkit-line-clamp: 2` + `overflow: hidden`), word-break for very long tokens |
| Scroll | sideways scroll off for this list (`overflow-x: hidden`) |
| Default | `wrapOptions = false` → no class, no CSS change, item size 30/50 as today |
| Search / disabled prefix | unchanged: the filter pipe matches `optionLabel` on the full string (`pr-select.component.html:71`); the prefix is concatenated before the label (`:85-91`) and is simply the start of line 1 |
| Selected value (closed field) | unchanged; the full text now lives in the block below |

### 8.2 `app-clamped-text` (TKR-R-2)

Standalone, OnPush, signals. Inputs: `text`, `lines` (default 3). Internal `expanded` signal; `overflows` signal computed after render by comparing the clamped element's `scrollHeight` with `clientHeight` (`afterRenderEffect`, re-measured on text change and on resize via `ResizeObserver`). Button rendered only when `overflows() || expanded()`; it is a real `<button type="button">` with `aria-expanded` and visible focus. When `text` changes, `expanded` resets to false (TKR-S-2.3). Tailwind utilities only (`line-clamp-[n]` via a style binding for the dynamic count), `whitespace-pre-line` so the ToC's line breaks survive.

### 8.3 Selected-KPI block (TKR-R-2)

Inside the existing `@if (isCP2026() && selectedIndicatorData())`, before Unit of measurement: a bold label "KPI statement:" and `app-clamped-text` with 3 lines. Inherits the block's existing gate, so pre-2026 is untouched (TKR-S-2.4) and read-only hosts show it too. Writes nothing to `partnersBody`.

## 9. Shared Contracts or Package Extensions

`app-pr-select` gains one boolean input (default false). `app-clamped-text` is a new shared component, available for future long-text fields.

## 10. Design Decisions

| ID | Decision | Why | Rejected |
|---|---|---|---|
| TKR-DD-1 | Opt-in input, not a global change | 50+ `app-pr-select` call sites; their tests read `.label` single-line (`cypress/e2e/result-detail/*.cy.ts`) | Global wrap: unbounded regression surface |
| TKR-DD-2 | Fixed 50 px rows + 2-line clamp, keep the virtual scroll | `cdkVirtualFor` needs a fixed item size; 50 px already exists for `extraInformation` | Variable-height rows (needs a custom virtual strategy or no virtual scroll) — proposal option C |
| TKR-DD-3 | No hover tooltip with the full text | Texts up to 3,969 chars; client guide rule 16 ("a 40-word tooltip is worse than truncation"); `design.md:300` (hover fails on touch / screen readers) | `title` on each option — reverses nothing shipped, but delivers an unreadable tooltip |
| TKR-DD-4 | No code parsing | Only 273/10,251 descriptions start with a code; where they do, it is already the first token, so the 2-line clamp shows it | Regex to split code / PoD name — fragile on free text with several formats |
| TKR-DD-5 | Overflow detection by measurement, in a small standalone component | Only a measurement knows whether 3 lines overflow at the current width; isolating it makes it mountable in Cypress CT (jsdom cannot measure) | Character-count threshold: wrong at other widths |
| TKR-DD-6 | Full text in the existing selected-KPI block, above Unit/Target | Block already exists, already gated by year, already shows in read-only hosts | New field-card: more chrome, one more marker for the mandatory scan to ignore |

Reversion challenge (Step 2.3): **n/a** — no DD removes, disables or inverts shipped behavior; `overflow-x: hidden` applies only under the new opt-in.

## 11. Premise Ledger

Count: 11 verified · 1 UNVERIFIED (Impact: 0 High, 1 Low).
Blast-radius triggers: `live-path` (names a user action: picking a KPI), `shared-state` (`app-pr-select` + `multiple-wps-content` rendered by several hosts), `consumer` (changes `.option .label` styling used as a DOM hook).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | The sideways scroll comes from `.virtual_scroll { overflow-x: scroll }` | location | `src/app/custom-fields/custom-fields.scss:166-170` | 262dfcf38 | DD-2 scroll fix misses (Low) | — |
| P-2 | Option labels never wrap | location | `custom-fields.scss:191-192` (`.label { white-space: nowrap }`) | 262dfcf38 | Clamp rule targets the wrong node (Low) | — |
| P-3 | Item size is a computed 30/50 from `extraInformation`, mirrored in the row style | location | `pr-select.component.ts:62-63`; `pr-select.component.html:73` | 262dfcf38 | DD-2 must change both places (Low) | — |
| P-4 | `extraInformation` is used by one call site only | consumer | `grep -rn "extraInformation" src/app --include=*.html` → `inno-dev-content.component.html:9` only | 262dfcf38 | Reusing 50 px affects nobody else either way (Low) | — |
| P-5 | `body-2` is 12 px / 18 px line, so two lines fit in 50 px | data-env | `src/styles/fonts.scss:89-92` | 262dfcf38 | Row height must change (Low) | — |
| P-6 | Search filters on the full `optionLabel` string | location | `pr-select.component.html:71` (`listFilterByTextAndAttr: optionLabel()`) | 262dfcf38 | TKR-S-1.3 needs extra work (Low) | — |
| P-7 | Live path: KPI pick → `rd-contributors-and-partners.html:76` `app-cp-multiple-wps` → `multiple-wps.component.html:41` `app-multiple-wps-content` → `multiple-wps-content.component.html:88` `app-pr-select` | live-path | the three `file:line` above, grep `app-cp-multiple-wps` / `app-multiple-wps-content` | 262dfcf38 | Change lands off the user's path (High) | — |
| P-8 | `app-cp-multiple-wps` hosts: rd C&P (`:76`, `:566`), IPSR contributors (`ipsr-contributors.component.html:45`, `:267`), review drawer (`result-review-drawer.component.html:265`, `:540`), share-request modal (`share-request-modal.component.html:65`) | shared-state | `grep -rn "app-cp-multiple-wps" src/app --include=*.html` | 262dfcf38 | Missing host shows the block unexpectedly (Low) | — |
| P-9 | Selected KPI is held in `selectedIndicatorData`, set in `updateSelectedIndicatorData` and rendered in the year-gated block | location | `multiple-wps-content.component.ts:57`, `:400-415`; `.html:117-122` | 262dfcf38 | DD-6 needs another source (Low) | — |
| P-10 | E2E suites read `.options .option .label` text (multiselect cases) | consumer | `grep -rn "\.label" cypress/` → `contributors-and-partners.cy.ts:81,87,131,146`; `save-contract.cy.ts:317-338` | 262dfcf38 | Clamping hides text from `innerText` (Low: those target `pr-multi-select`, and clamp keeps DOM text) | — |
| P-11 | `afterRenderEffect` is available (Angular ^21.2.18) | data-env | `package.json:37` | 262dfcf38 | Use `afterNextRender` + `effect` (Low) | — |
| P-12 | Clamped (`overflow: hidden`) rows still expose full `innerText` to Cypress and screen readers | data-env | `UNVERIFIED — confirm at source before relying on it` | — | TKR-S-1.1 "BUT" clause needs `aria-label` (Low) | TKR-T-1 (CT asserts full text in the row) |

## 12. Budget (tripwire)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 3 | ~180 (incl. ~100 test) | 4 (one per task + one margin; T-1 touches a shared control) |
