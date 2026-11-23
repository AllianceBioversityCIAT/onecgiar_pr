# Tasks — ToC KPI dropdown readability (`changes/toc-kpi-option-readability`)

## 1. Scope of this task list

Implements `requirements.md` TKR-R-1..3 and TKR-NFR-1..4 per `design.md` (TKR-DD-1..6). Client only. Budget: 3 tasks · ~180 LOC · 4 review rounds (`design.md` §12).

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-19, Phase 1 gate)
- [x] `design.md` approved (2026-11-19, Phase 2 gate, no judgment-day requested)
- [x] No migration, no API, no payload change
- [x] Free RAM ≥ 4 GB before Cypress CT (`Get-CimInstance Win32_OperatingSystem`); Jest and Cypress never at the same time (serialized by a scratchpad lock; see execution.md)

Test rules for every task: Jest `--maxWorkers=2 --testPathPattern=<touched>`; Cypress CT via `npm run test:ct:changed` (batched); lint only touched files (`npx eslint <files> --quiet`); templates `npx ngc -p tsconfig.app.json --noEmit`.

## 3. Task list

### TKR-T-1 — `app-pr-select`: opt-in `wrapOptions` (two-line options, no sideways scroll)

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | none |
| Implements | TKR-R-1 (S-1.1, S-1.2, S-1.3, S-1.4), TKR-R-3 (S-3.1), TKR-NFR-2, NFR-4 |
| Design | §8.1, TKR-DD-1, DD-2, DD-3; Premise P-1..P-6, P-12 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |
| Review | `full` — shared custom-field used by 50+ call sites |

**Scope**
- `pr-select.component.ts`: `wrapOptions = input<boolean>(false)`; `virtualOptionItemSize` = 50 when `extraInformation() || wrapOptions()`.
- `pr-select.component.html`: row height binding follows the same condition; panel gets a modifier class only when `wrapOptions()`.
- `custom-fields.scss`: under the modifier only — `.label` `white-space: normal`, 2-line clamp, `overflow-wrap: anywhere`; `.virtual_scroll` `overflow-x: hidden`.
- `pr-select.cy.ts`: new cases (below). No change to existing cases.
- Design route: existing control, no new direction; follows the `extraInformation` 50 px row pattern.

**Tests / verification (Cypress CT, two viewport widths: 1280 and 900 px)**
1. Wrap on, 3 options of 1,500+ chars (SP09-like strings) + 1 short: every `.option` height = 50; every `.label` `scrollWidth <= clientWidth + 1`; `.virtual_scroll` `scrollWidth <= clientWidth + 1`; long labels' `clientHeight` ≤ 2 × 18 px + 1; the short label shows whole (S-1.2).
2. Wrap on, 40 long options: scroll the viewport to the end → the last option is visible and clickable (row height stays fixed).
3. Wrap on: the long label's `innerText` equals the full source string (S-1.1 BUT; settles P-12 — if false, add `aria-label` with the full text and record it).
4. Wrap on, type a word present only after char 1,000 of one option → that option is listed (S-1.3).
5. Wrap on, one option `disabledd: true` with `disableOptionsText` → prefix shown, click does not select (S-1.4).
6. Default (no input): `.option` height = 30, `.label` computed `white-space: nowrap`, `.virtual_scroll` computed `overflow-x: scroll` (S-3.1).
- Existing `pr-select.cy.ts` + `pr-select.contract.cy.ts` + `pr-select.component.spec.ts`: same result as baseline (compare to a run on `262dfcf38`; pre-existing reds are not regressions).
- `npx ngc -p tsconfig.app.json --noEmit`; `npx eslint` on the touched `.ts`.

| Verification field | Value |
|---|---|
| Falsifier | Remove the modifier's `white-space: normal` → case 1 fails on `scrollWidth <= clientWidth` for the long labels; remove `overflow-x: hidden` → case 1 fails on `.virtual_scroll`; make the item size ignore `wrapOptions` → case 2 fails (last option not reachable / misaligned). Fixture must have labels longer than the panel width at 900 px, or the falsifier cannot diverge |
| Red run | predicted — greenfield artifact (observed in TKR-T-1): cases 1–5 fail on the assertion before the SCSS/size change (input added first, styles second); quote the first red verbatim in `execution.md` |
| Disqualifier | A green in jsdom is not evidence (layout). A CT red caused by font loading, mount error or timeout is not the red. If the two viewports disagree, report both readings instead of passing |
| Consumers | `src/app/custom-fields/pr-select/pr-select.cy.ts`, `pr-select.contract.cy.ts`, `pr-select.component.spec.ts`; `cypress/e2e/result-detail/contributors-and-partners.cy.ts:81-146`, `save-contract.cy.ts:317-338` (read `.option .label` — multiselect; unaffected while default is off); `inno-dev-content.component.html:9` (`extraInformation`, unchanged) |

**Done criteria**: cases 1–6 green at both widths; baseline CT unchanged; falsifiers executed and observed red; `ngc` + lint clean.

---

### TKR-T-2 — `app-clamped-text`: N-line text with Show more / Show less

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | none (parallel with T-1) |
| Implements | TKR-R-2 (S-2.1 clamp + toggle + keyboard + aria, S-2.2, S-2.3 reset), TKR-NFR-1, NFR-2, NFR-4 |
| Design | §8.2, TKR-DD-5; Premise P-11 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` |
| Review | `checklist` — new isolated component, no consumers yet |

**Scope**
- `src/app/shared/components/clamped-text/clamped-text.component.{ts,html,spec.ts,cy.ts}` — standalone, OnPush; inputs `text`, `lines` (default 3); `expanded` signal reset when `text` changes; `overflows` measured after render (`afterRenderEffect` + `ResizeObserver`); `<button type="button">` with `aria-expanded`, shown only when `overflows() || expanded()`; `whitespace-pre-line`; Tailwind utilities; focus ring token.
- `src/app/internationalization/clamped-text.copy.ts` — "Show more", "Show less", "KPI statement".
- Design route: shared presentational primitive; same Show more pattern as `dashboard-lab/.../indicator-drawer.component.html:95`.

**Tests / verification**
- Jest (`clamped-text.component.spec.ts`): expanded resets to false when `text` input changes; button label switches with `expanded`; `aria-expanded` mirrors state.
- Cypress CT (`clamped-text.cy.ts`), width 600 px: (a) 2,000-char text, lines=3 → rendered height ≤ 3 × line-height + 1 and button visible; click → height > 3 lines, label "Show less", `aria-expanded="true"`; (b) 80-char text → no button; (c) keyboard: Tab focuses the button, Enter toggles; (d) change `text` while expanded → collapsed.
- `ngc` + lint.

| Verification field | Value |
|---|---|
| Falsifier | Render the button unconditionally → CT (b) fails; drop the reset on text change → Jest + CT (d) fail; drop the clamp style → CT (a) height assertion fails |
| Red run | predicted — greenfield artifact (observed in TKR-T-2): the spec files are written first against a stub that renders the raw text only; quote the first assertion red in `execution.md` |
| Disqualifier | A Jest pass on the "button visible" logic proves nothing about clamping (jsdom has no layout; `scrollHeight` is 0) — only CT (a)/(b) count for overflow |
| Consumers | none (new symbol); T-3 becomes the first consumer |

**Done criteria**: Jest + CT green; falsifiers observed red; copy only from `clamped-text.copy.ts`.

---

### TKR-T-3 — KPI select uses both: wrap the options, show the chosen KPI in full

| Field | Value |
|---|---|
| Status | [x] |
| Size | S |
| Depends on | TKR-T-1, TKR-T-2 |
| Implements | TKR-R-1 (wiring), TKR-R-2 (S-2.1 placement + BUT payload/dirty, S-2.3 KPI change, S-2.4 pre-2026), TKR-NFR-3, NFR-4 |
| Design | §3, §8.3, TKR-DD-6; Premise P-7, P-8, P-9 |
| Skills | `angular-developer` |
| Review | `checklist` |

**Scope**
- `multiple-wps-content.component.html:88-101`: `[wrapOptions]="true"` on the KPI select.
- `multiple-wps-content.component.html:117-122`: inside the existing `@if (isCP2026() && selectedIndicatorData())`, before Unit of measurement, a bold "KPI statement:" label + `<app-clamped-text [text]="selectedIndicatorData()?.indicator_description" [lines]="3">`.
- Import `ClampedTextComponent` where `MultipleWPsContentComponent` is declared/imported.
- Update `rd-contributors-and-partners/CLAUDE.md` (short entry + Verified stamp).
- PR description line: "W3/bilateral payload: no impact (view-only)".

**Tests / verification**
- Jest (`cpmultiple-wps-content.component.spec.ts`): (a) 2026 + selected indicator → `app-clamped-text` present with that indicator's text, before the Unit row; (b) `isCP2026()` false → absent (S-2.4); (c) switching `selectedIndicatorData` to another indicator → the bound text changes (S-2.3); (d) `partnersBody` / `activeTab` deep-equal before and after rendering and toggling (S-2.1 BUT); (e) the KPI `app-pr-select` receives `wrapOptions = true`, and the Level/HLO selects do not.
- `ngc` + lint on touched files.
- Manual (validation pause, PRTest, after deploy): result #953 (SP09, HLO 5.5.1) — open KPI list: two lines, no sideways scroll; pick a KPI: full text with Show more; Save draft payload unchanged (DevTools network). Never click write buttons beyond what the check needs (shared DB).

| Verification field | Value |
|---|---|
| Falsifier | Move the block outside the `isCP2026()` gate → Jest (b) fails; bind `wrapOptions` on every select in the template → Jest (e) fails; write the expanded state into `activeTab` → Jest (d) fails |
| Red run | predicted — greenfield artifact (observed in TKR-T-3): (a), (e) target `app-clamped-text` / `wrapOptions`, which T-1/T-2 create; quote the first red from running the new cases before the template edit |
| Disqualifier | A Jest pass with `NO_ERRORS_SCHEMA` and a stubbed `app-clamped-text` proves placement, not rendering — the rendered look is covered only by T-1/T-2 CT plus the PRTest check |
| Consumers | `cpmultiple-wps-content.component.spec.ts`; `rd-contributors-and-partners.zoneless.spec.ts` (renders the real section — must stay green); `result-review-drawer.component.spec.ts` (stubs `app-cp-multiple-wps`); `share-request-modal.zoneless.spec.ts` (`NO_ERRORS_SCHEMA`); `ipsr-contributors` specs |

**Done criteria**: Jest green (touched + consumer specs, `--findRelatedTests` on the changed files); `ngc` clean; PRTest check recorded at validation.

## 4. Dependency graph

```
TKR-T-1 ─┐
         ├─> TKR-T-3
TKR-T-2 ─┘
```

T-1 and T-2 are independent (different files); run their Cypress CT one after the other, never together.

## 5. Coverage (scenario / clause → task)

| Clause | Task |
|---|---|
| S-1.1 two lines, no sideways scroll, MUST fixed height, BUT full DOM text | T-1 (cases 1, 2, 3) |
| S-1.2 short option whole | T-1 (case 1) |
| S-1.3 search beyond line 2 | T-1 (case 4) |
| S-1.4 disabled prefix | T-1 (case 5) |
| S-2.1 clamp 3 lines + toggle + MUST keyboard/aria | T-2 (CT a, c) |
| S-2.1 placement above Unit / Target | T-3 (Jest a) |
| S-2.1 BUT no payload / dirty change | T-3 (Jest d) |
| S-2.2 no button for short text | T-2 (CT b) |
| S-2.3 reset on KPI change | T-2 (Jest, CT d) + T-3 (Jest c) |
| S-2.4 pre-2026 absent | T-3 (Jest b) |
| S-3.1 default select unchanged, BUT no clamp/scroll change | T-1 (case 6 + baseline CT) |
| NFR-1 copy via internationalization | T-2 |
| NFR-2 Tailwind / SCSS only where needed | T-1, T-2 |
| NFR-3 no payload change, PR note | T-3 |
| NFR-4 ngc + scoped tests | T-1, T-2, T-3 |

## 6. Rollout & verification

qa-development-2026-ss → performance-refactor → PRTest check on #953 → reply to Marc on item 3 in the feedback document → staging/master with the next release.

## 7. Cleanup & follow-ups

- `app-clamped-text` can later replace ad-hoc Show more blocks (dashboard-lab) — not in this spec.

## 8. Roll-back plan

Revert the T-3 commit (removes the wiring); T-1's input defaults off and T-2's component is unused, so both can stay.
