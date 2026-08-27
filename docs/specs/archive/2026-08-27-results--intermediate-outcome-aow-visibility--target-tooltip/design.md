# Module Spec — `design.md`

**Depth: Lite.** No new module, service, persistence, or NFR impact — `software-architect` Decision Spine not invoked. No new UI component — `ui-ux-pro-max`/`frontend-design` not invoked; this reuses an existing, already-styled row pattern verbatim.

Linked: `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/requirements.md` (`RES-R-1`, `RES-R-2`, `RES-R-10`, `RES-AC-1`, `RES-AC-2`).

## 1. Summary

Bind the existing `prTooltip` directive to the Target `<button>` in `reporting-aow-table.component.html`'s shared `indicatorRow` template, conditioned on the row's card being the `intermediate` bucket. No new component, no new directive, no server change. The only real decision is **how the row knows its own bucket kind** without threading a new input through every call site.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/` (`.ts`, `.html`; `CLAUDE.md` re-stamp in the same commit per that folder's own convention).
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

Not applicable — no new interaction, only a hover affordance added to an existing static row render (hover-only, not focus — see §6.3, `RES-R-10` superseded 2026-08-26). `reportingGroups()` already tags each card with `kind: 'aow' | 'intermediate'` (`dashboard-lab.component.ts` ~line 1515/1533); this design consumes that tag, it does not add a new data flow.

## 3. Data Model Changes

None. No entity, no migration, no CLARISA implication.

## 4. API Surface

None. No endpoint added or changed.

## 5. Server Workflow / Business Rules

Not applicable.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same component, same module (`ReportingAowTableComponent`, standalone).

### 6.2 Components & services

`indicatorRow` (the `ng-template` shared by both the grouped view's AoW/Intermediate/2030 cards and reused per row) currently receives `row` and `showAow` via `*ngTemplateOutlet` context (`reporting-aow-table.component.html` ~line 408). It does **not** currently receive which bucket it is rendering inside.

**`RES-DD-1` — How the row learns its own bucket kind**

- **Context:** the tooltip (`RES-R-1`/`RES-R-2`) must render only for `intermediate` rows, but `indicatorRow` is one shared template instantiated from three different card loops (AoW cards, the Intermediate card, and — via `bandsOf`/`isBucket` — the same structure for 2030). The template has no per-instantiation bucket flag today.
- **Decision:** add a third context variable to the existing `*ngTemplateOutlet` context, `bucketKind: group.kind`, passed at every call site that already passes `showAow`. The template reads it as `let bucketKind = "bucketKind"` alongside the existing `let showAow = "showAow"`. A new computed helper `isIntermediateRow(bucketKind)` (trivial: `bucketKind === 'intermediate'`) drives the `prTooltip` binding: `[prTooltip]="isIntermediateRow(bucketKind) ? intermediateTargetTooltip : ''"`.
- **Alternatives considered:**
  1. *Read `row.__bucketKind` off the row object itself* (stamp it during `flattenBucketIndicators`/mapping) — rejected: touches `dashboard-lab.component.ts`'s data-shaping code for a fact the template loop already has for free (`group.kind`), widening the diff into a second file for no benefit.
  2. *Duplicate the whole `indicatorRow` template for the Intermediate card only* — rejected: the file's own header comment already treats `indicatorRow` as deliberately shared; duplicating it to add one conditional attribute is the kind of drift this repo's `CLAUDE.md` anti-patterns section explicitly warns against ("re-implementations are the #1 source of UI drift").
- **Consequences:** verified there is exactly **one** `*ngTemplateOutlet="indicatorRow; context: {...}"` call site (`reporting-aow-table.component.html` line 408, inside the `@for (band of bands)` → `@for (hlo of band.groups)` loop nested under the single `@for (group of visibleGroups())` loop at line 229) — `group.kind` is already in scope there for every bucket (AoW, Intermediate, 2030), so this is a one-line context addition, not a multi-site sweep. (Corrected from an earlier draft of this design that assumed multiple call sites without checking; grep `ngTemplateOutlet="indicatorRow"` reconfirms the count if the file changes before implementation.)

**`RES-DD-2`** *(added 2026-08-26, revised same day after live-data verification)* **— How an AoW card's Outcomes-band row learns it is a cross-cutting Intermediate Outcome**

- **Context:** `RES-R-3` needs a per-**row** fact, not a per-**card** fact — an `aow` card's Outcomes band (`__tier === 'outcome'`) is a mix of (potentially) AoW-exclusive outcomes and outcomes that are cross-cutting/program-level. `bucketKind` (from `RES-DD-1`) is `'aow'` for the whole card regardless; it cannot distinguish rows within it.
- **First draft of this decision (superseded within the same day) proposed cross-referencing `indicator_id` between two separately-fetched endpoints** (the AoW's own ToC call and `GET_IntermediateOutcomes`), with a Set-based lookup and a `reportingGroups()` reorder. Live-data verification (via `curl`, see `RES-R-3`) found something better: **the backend already computes and returns the exact fact needed, in the same payload the AoW card already fetches** — no second endpoint, no cross-referencing, no reorder required.
- **Decision:**
  1. The `GET_TocResultsByAowId` response's `tocResultsOutcomes` array carries a **group-level** `is_aow: boolean` per outcome group (verified server-side: `aow-bilateral.repository.ts` `buildTocQuery`, `(wp.toc_id IS NOT NULL) AS is_aow` — `false` when the ToC node has no work package and therefore appears under every AoW). This is not yet read by the client: `dashboard-lab.component.ts`'s `indicatorsByAow()` → `fromTier(groups, tier)` (~line 1408-1420) maps over each group `g` and currently keeps only `g?.result_title` (as `__hlo`), `g?.toc_result_id`, and `g?.__hloNode` — `g?.is_aow` is dropped.
  2. Add one field to that same mapping: for the `'outcome'` tier only, stamp each row `__isIntermediateCrosscut: tier === 'outcome' && g?.is_aow !== true`. (Output/HLO-tier rows never get this stamp — `is_aow` is meaningless for them and the field stays `undefined`.)
  3. Add `__isIntermediateCrosscut?: boolean;` to the `ReportingIndicator` interface (`reporting-aow-table.component.ts`) — the field flows through `reportingGroups()`'s `aowCards` construction untouched, since that function only filters/maps existing indicator objects, it doesn't rebuild them.
  4. In `reporting-aow-table.component.ts`, add `isCrossCuttingIntermediate(row: ReportingIndicator): boolean { return !!row?.__isIntermediateCrosscut; }`.
  5. In the template, widen the Target button's binding from `RES-DD-1`'s `isIntermediateRow(bucketKind)` to `isIntermediateRow(bucketKind) || isCrossCuttingIntermediate(row)` — the row is already `$implicit` in the same `*ngTemplateOutlet` context, no new context variable needed.
- **Alternatives considered:**
  1. *(Superseded first draft)* Cross-reference `indicator_id` between the AoW's outcome rows and a separately-held Intermediate Outcomes row set, with a `reportingGroups()` reorder to build the lookup Set before `aowCards`. Rejected once `is_aow` was found: strictly more code (two data sources, a Set, a reorder) to derive a fact the backend already hands over per-group, and less robust — an `indicator_id` coincidence across two independently-shaped endpoints is a weaker guarantee than the backend's own SQL join truth.
  2. *Cross-reference client-side inside `reporting-aow-table` instead of `dashboard-lab`* — still rejected: `reporting-aow-table` is documented as **presentation-only, no data shaping** (its own `CLAUDE.md`: "Presentación pura — no hace fetch, no inyecta ningún servicio"). With the `is_aow`-based fix, this is even less justified — the stamp is a one-line addition at a mapping `dashboard-lab.component.ts` already performs.
- **Verification (completed, not a follow-up):** confirmed live 2026-08-26 via `curl` against `https://prtest-back.ciat.cgiar.org` with a user-provided token (program `SP02`, AoWs `SP02-AOW01`..`04`; program `SP01`, `SP01-AOW01`) — every outcome group in every AoW response carried `is_aow: false`, and 100% of those indicator sets matched the Intermediate Outcomes bucket's 16 indicators exactly. This also surfaces a secondary fact worth recording: in the sampled test data, **no AoW currently has any genuinely AoW-exclusive outcome** — every Outcomes-band row observed today is cross-cutting. The rule (`is_aow`) is still correct and still needed for when an AoW-exclusive outcome exists (the repository code clearly supports that case: `wp.toc_id IS NOT NULL` branch), it's just unexercised by current data. Do not read "0 AoW-exclusive rows observed" as license to hardcode "always show the tooltip" — implement the actual `is_aow` check, not a constant `true`.
- **Consequences:** touches two files (`dashboard-lab.component.ts` for the one-line stamp in an existing mapping, `reporting-aow-table.component.{ts,html}` for consuming it) — smaller than the superseded first draft (no `reportingGroups()` reorder, no Set, no second endpoint touched), but still one file more than the original `RES-T-1`. Budget revised in §Step 2.4 below.

### 6.3 Design system usage

- No new PrimeNG/Spartan component — reuses the existing `prTooltip` directive (`PrTooltipDirectiveModule`, already imported in `reporting-aow-table.component.ts`).
- No new token — no visual change to the Target figure itself, only an added tooltip trigger (same as the existing `achievedTooltip` pattern one cell over).
- Tooltip copy is a plain string per `requirements.md` `RES-OQ-1` (no `| term` usage exists elsewhere in this template today).
- A11y: unchanged focusability (the Target figure is already a `<button>`); the tooltip attaches to that same element via the shared `prTooltip` directive, which is **hover-only** (`pr-tooltip.directive.ts` has no `focus`/`focusin`/`blur` handling — checked, not assumed). This matches `achievedTooltip`'s actual behavior exactly; `RES-R-10`'s keyboard-reachability clause was superseded 2026-08-26 once that premise was verified false (see `execution.md` Pivot Record). No new a11y pattern introduced, no regression versus the existing pattern — but no improvement either. A directive-level fix (`focusin`/`focusout` handlers) is tracked as a separate follow-up, out of scope here.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

Not applicable — no new data exposure, no new endpoint, static copy only.

## 8. Performance & Capacity

Negligible — one additional attribute binding evaluated per already-rendered row; no new HTTP calls, no new subscriptions.

## 9. Observability

Not applicable — no server-side behavior, nothing to log.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** extend `reporting-aow-table.component.spec.ts` — assert `isIntermediateRow('intermediate')` is `true` and `isIntermediateRow('aow')` / `isIntermediateRow('2030-outcomes' as any)` are `false`; assert the Target button's `prTooltip` input resolves to the expected string for an `intermediate` row and to `''` for an `aow` row (render test via `fixture.debugElement.query` on the compiled template, or a directive-input assertion depending on how existing `achievedTooltip` is tested in that spec file — mirror that existing test's approach for consistency). *(shipped 2026-08-26)*
- **Added 2026-08-26 (`RES-DD-2`, revised same day):** unit-test `isCrossCuttingIntermediate` directly (`{ __isIntermediateCrosscut: true }` → `true`, `undefined`/`false`/missing → `false`); extend `dashboard-lab.component.spec.ts` (or add one if `indicatorsByAow()`/`fromTier` has no existing spec coverage — check first) to assert the `fromTier` mapping stamps `__isIntermediateCrosscut: true` on an outcome-tier row when its group's `is_aow` is `false`, `__isIntermediateCrosscut: false` when `is_aow` is `true`, and that HLO/output-tier rows are never stamped `true` regardless of `is_aow` (§`RES-R-3` scopes the rule to the Outcomes band only — the field is meaningless for output rows). Render-level: Target button's `prTooltip` resolves to the tooltip string for a crosscutting outcome row inside an `aow` card, and to `''` for a non-crosscutting one.
- **No Cypress impact** — `custom-fields/` is untouched.
- **Coverage:** stays within the client's existing 50/60/60/60 thresholds; this addition is small enough to not require a dedicated coverage uplift note.

## 11. Backwards Compatibility & Migration Plan

Not applicable — no data, no API, no flag. Purely additive template change; reverting is a one-file revert.

## 12. Design Decisions (ADRs)

### `RES-DD-1` — see §6.2 above (context propagation via `*ngTemplateOutlet` context, not a row-stamped field or template duplication).

**Step 2.3 Reversion Challenge:** not triggered — this design adds a context variable and a conditional attribute; it removes, disables, or inverts nothing already shipped. No reviewer challenge required.

### `RES-DD-2` *(added 2026-08-26)* — see §6.2 above (row-stamped cross-cutting flag computed in `dashboard-lab.reportingGroups()`, consumed via the existing `$implicit` row context — no new context variable, no data-shaping logic moved into the presentation-only `reporting-aow-table`).

**Step 2.3 Reversion Challenge:** not triggered — additive stamp + additive `||` clause on an existing binding; nothing already shipped is removed, disabled, or inverted.

## 13. Open Gaps & Follow-ups

- If a future request extends this tooltip to the `flat` ("All indicators") table, that table's rows already carry `__aowCode` per row (line ~100 of the template) but no `bucketKind`/`__isIntermediateCrosscut` equivalent — would need the same kind of row flag, scoped as a new task, not folded in here.
- `RES-OQ-1` (i18n vs. plain string) stays open per `requirements.md`; revisit if/when this file is promoted to i18n as a whole.
- **Added 2026-08-26, resolved same day:** `RES-DD-2`'s original `indicator_id`-matching assumption was superseded once live-data verification found the backend's own `is_aow` field — no open risk remains on the matching mechanism itself. The remaining unexercised case (a genuinely AoW-exclusive outcome, `is_aow: true`) has no live example in the sampled test data (`SP01`, `SP02`) as of 2026-08-26; `RES-T-2`'s tests must cover it synthetically (mocked `is_aow: true`) since no real fixture currently demonstrates it.

## Step 2.4 — Budget (sizing check against Lite depth)

| Signal | Estimate | Note |
|---|---|---|
| Expected tasks | 2 | `RES-T-1` (shipped 2026-08-26) + `RES-T-2` (this amendment) |
| Expected LOC | ~15–20 for `RES-T-1` (shipped) + ~25–35 for `RES-T-2` (`reportingGroups()` reorder + stamp, interface field, one helper, one template `||` clause, cross-file test coverage in two spec files) | |
| Expected review rounds | 1 per task | `RES-T-1` took 1 code round + 1 docs-only pivot-closure round (not charged as rework, see `execution.md`) |

**Check against depth:** `RES-T-2` alone no longer fits `/akili-quick` sizing (crosses two files, adds cross-referencing logic, carries a live-data assumption that needs verification) — still **Lite** overall for this spec, but no longer "squarely quick" the way the original single-task version was. The 2026-08-26 amendment is why: what started as a pure template/context change grew a real data-flow decision (`RES-DD-2`) once the actual UI behavior (transversal display) was clarified.

## Required cross-references

- `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/requirements.md` (same folder).
- `docs/prd.md` (G2), `docs/ux-ui/design.md` §10, `docs/trd/trd.md` (not cited — no architectural change).
