# Design — Overview Replicated/New Badges

Links: `requirements.md` (same folder) · `docs/prd.md` (`US-P1`) · `docs/ux-ui/design.md` §7/§8/§10 · `bilateral-overview/CLAUDE.md` (`COV-DD-1`, `COV-R-13`) · `bilateral-projects-panel` (`BIL-POM-T-3`, `BIL-POM-AC-3`).

## 1. Summary

Add two derived, center-wide counts (`replicatedCount`, `newCount`) to the Overview tab's existing `OverviewTotalResultsKpi` pure computation, and render them as a badge row on the "Total results" hero card — reusing the exact pill markup/tokens already shipped on the Reporting tab's Projects Catalog (`bilateral-projects-panel.component.html:265-299`). No server, API, or data-model change: `is_replicated` is already on every row the Overview tab loads. The only real trade-off: this spec's `newCount` is **unconditional** ("not replicated"), deliberately diverging from the Reporting tab's status-gated "new for review" — accepted so the two new counts always sum to the card's total (see `BOV-DD-1`).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `BOV-P-1` | `BilateralCenterResult.is_replicated` is present on every row the Overview tab already fetches (same endpoint the Reporting tab uses) | `bilateral-center-result.interface.ts:42-52`; both tabs consume `BilateralOverviewService`/`GET_bilateralCenterResults` results signal | Read the interface + `bilateral-overview.component.ts` data flow (`overviewService.entry(...)` → same row shape as `bilateral-projects-panel`'s `results()`) | `verified` | The field would be `undefined` for Overview rows; `Number(undefined) === 1` is `false`, so all rows would silently classify as "new" — add a fixture assertion (see Testing Plan) to catch this at the aggregate-spec level rather than relying on a runtime guess |
| `BOV-P-2` | `is_replicated` wire values are only ever `0`, `1`, `'0'`, `'1'`, `true`, or `false` — no other truthy/falsy shape appears | `bilateral-projects-panel.component.ts:104-119` comment + existing normalization pattern (`Number(row.is_replicated) !== 1`) | Read the existing, already-shipped normalization code and its docstring warning | `assumed` (not queried against live DB for this spec — inherited from the already-accepted Reporting tab pattern) | If a new shape appears (e.g. `null` vs `undefined` behave differently in some ORM path), both would still normalize to "not 1" → "new", which is the safe failure direction (never falsely marks a row replicated) |
| `BOV-P-3` | The Reporting tab's pill markup (icon classes, token names) is copy-paste stable and not mid-refactor | Read `bilateral-projects-panel.component.html:265-299` directly, current on disk | Direct file read, this session | `verified` | If it changes before implementation, the Implementer re-reads the file at task time — no design change needed, just re-copy the current markup |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched only:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/` (`bilateral-overview.aggregate.ts`, `.component.html`, `.component.ts`, `CLAUDE.md`).
- **No server module touched.** No new API call — the counts are derived client-side from data already fetched by the existing `BilateralOverviewService.entry(centerKey, versionId)` flow.
- **Reference-only module (not modified):** `bilateral-home/components/bilateral-projects-panel/` — read for its badge pattern, never edited by this spec.

### 2.2 Sequence / interaction diagram

No new sequence — this inserts into the Overview tab's existing render path:

```
[BilateralOverviewComponent] (unchanged data flow)
  └── overviewService.entry(centerKey, versionId)   (already fetched)
        └── filterCenterResults(rows, params)        (COV-R-13, already applied)
              └── buildOverviewModel(rows, ...)       (bilateral-overview.aggregate.ts)
                    └── buildTotalResultsKpi(rows)     ← EXTENDED HERE (BOV-R-1, BOV-R-2)
                          returns { count, w3Count, w1w2Count, leadCount,
                                    contributingCount, replicatedCount, newCount }
  └── template renders "Total results" card
        └── existing w3/w1w2 + lead/contributing lines (unchanged, BOV-R-5)
        └── NEW badge row: replicated pill + new pill (BOV-R-3)
        └── NEW aria-label including both counts (BOV-R-4)
```

## 3. Data Model Changes

None. `is_replicated` already exists on the `result` entity and is already delivered on every `BilateralCenterResult` row consumed by the Overview tab.

## 4. API Surface

None. No endpoint added or changed.

## 5. Server Workflow / Business Rules

Not applicable — no server change.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Same component: `BilateralOverviewComponent` (`/bilateral/:acronym/overview`).

### 6.2 Components & services

- **`bilateral-overview.aggregate.ts`** (`BOV-DD-2`): extend `OverviewTotalResultsKpi` interface with `replicatedCount: number` and `newCount: number`; extend `buildTotalResultsKpi(rows)` to compute both in the same existing single loop over `rows` (no second iteration — append to the existing `for` loop that already computes `w3Count`/`leadCount`).
- **`bilateral-overview.component.html`**: add a badge row inside the "Total results" `<a>` card (lines 88-106), below the existing `w3Count`/`w1w2Count`/`leadCount`/`contributingCount` line, using the same pill markup as `bilateral-projects-panel.component.html:265-299` (rounded-full border/bg/text token trio, `pi-sync`/`pi-plus-circle` icons). No new component — inline markup in the existing card, matching how the reference panel does it inline too (no shared component extraction needed for two pills; see `BOV-DD-3` for why not).
- **No new API method, no new service.** State boundary unchanged — everything derives from the existing `model()` computed signal.

### 6.3 Design system usage

- **Tokens:** reuse `--pr-color-accents-1`, `--pr-color-accents-2`, `--pr-color-secondary-400`, `--pr-color-accents-4` exactly as the reference pattern uses them (no new token). Icons: `pi-sync` (amber, via `text-amber-600` as the reference already does) and `pi-plus-circle` (`text-emerald-600`), from `primeicons` — already loaded globally, no new icon library.
- **Responsive plan:** the badge row sits inside the existing "Total results" card, which is part of the KPI deck grid (`grid-cols-1 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-5`, `bilateral-overview.component.html:30`). **Hard rule inherited from this folder's `CLAUDE.md`:** never mix a named Tailwind breakpoint (`sm:`) with an arbitrary `min-[Npx]:` on the same property — the new badge row's own responsive behavior (if any wrapping classes are added) MUST use `flex-wrap` (no breakpoint-specific column classes needed; pills wrap naturally at any width, so this risk does not actually apply to the new markup itself — only the outer grid, which is untouched).
- **A11y notes:** the two new pills are inside an `<a>` (the whole card is a link to Results); per `docs/ux-ui/design.md` §10 and the requirement `BOV-R-4`, the accessible name comes from the card's own `aria-label`, not from the pills individually (they are visual reinforcement, not separate interactive targets — unlike the Reporting tab's badges, which ARE separate `<button>`s with their own navigation and `aria-label`s). **Design decision:** the Overview card's badges are non-interactive spans, not buttons (see `BOV-DD-4`).
- **i18n:** per `requirements.md` NFR row, default to adding `TermKey`s for "replicated" / "new" unless design-time check confirms identical P22/P25 copy. **Verified during this design:** the Reporting tab's own reference badges (`bilateral-projects-panel.component.html:276,287`) use plain hardcoded English ("replicated", "new") with NO `term` pipe — confirming this is accepted existing practice for this exact copy in this exact module. This spec follows the same precedent (plain English, no new `TermKey`) for consistency with the pattern it is copying (`BOV-DD-5`).

### 6.4 Real-time / notification UX

None — no socket/notification surface touched.

## 7. Security & Authorization

No change. Read-only, client-derived figure from data already authorized and fetched under the existing Overview tab's JWT-gated flow.

## 8. Performance & Capacity

Negligible: two additional counter increments inside an existing single-pass loop over an already-in-memory array (`rows`, typically well under 1,000 results per center per phase). No new render-blocking work; no new HTTP round trip.

## 9. Observability

None added — no new logging surface; failure modes (empty/error states) are already handled upstream by the existing `resultsLoading()`/`resultsError()` signals this card already gates on.

## 10. Testing Plan (forward-looking)

- **`bilateral-overview.aggregate.spec.ts`** — new test cases for `buildTotalResultsKpi`:
  - Mixed `is_replicated` shapes (`1`, `'1'`, `true`, `0`, `undefined`) → correct `replicatedCount`/`newCount` split, normalized via `Number(...) === 1`.
  - Invariant: `replicatedCount + newCount === count` for every fixture, including the empty-rows case (`0 + 0 === 0`).
- **`bilateral-overview.component.spec.ts`** — assert the rendered "Total results" card contains both new badge counts and that the `aria-label` string includes both figures.
- **`bilateral-overview.cy.ts`** — no new assertion required unless the card's `min-h` changes; if implementation grows the card past its current height at any tracked width (1280×720 / 1280×1000 / 900×800 / 375×800), extend the existing layout spec rather than adding a new one.
- **Human check (accepted per `requirements.md`'s defect-class table):** visual side-by-side comparison against the Reporting tab's badge styling, done at the Phase 3 HITL pause / browser verification step (`onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser") — no automated check can confirm visual-pattern match.

## 11. Backwards Compatibility & Migration Plan

Purely additive: `OverviewTotalResultsKpi` gains two new required fields (both computed, never `undefined`), so no consumer of the existing fields breaks. No migration, no flag, no rollout coordination — same deploy as any other client-only change.

## 12. Design Decisions (ADRs)

### `BOV-DD-1` — `newCount` is unconditional, not status-gated

- **Context:** the Reporting tab's existing "new for review" count additionally requires `status_id === pending` (`BIL-POM-AC-3`). Copying that exact definition to the Overview's center-wide hero would mean `replicatedCount + newCount !== count` whenever any non-replicated result is Approved/Rejected/Editing — breaking the natural reading of a hero KPI card ("this card's numbers should add up").
- **Decision:** `newCount` = "not replicated," full stop, regardless of status (`BOV-R-2.1`). Confirmed with the user as the recommended path in `proposal.md` §11; carried into `requirements.md` as `BOV-OQ-1`, approved at the Phase 1 gate (user selected "Continue" without raising it).
- **Alternatives considered:** (a) copy the Reporting tab's status-gated definition exactly — rejected, breaks the sum invariant on this card; (b) add a third badge for "not replicated, not pending" to make the split exhaustive under the status-gated definition — rejected as scope creep for a Lite spec; two badges cleanly explain the split without a third concept.
- **Consequences:** the Overview tab's "new" and the Reporting tab's "new for review" are **not the same number** for the same center/phase. This is intentional and must be documented in the touched folder's `CLAUDE.md` so a future reader doesn't "fix" one to match the other.

### `BOV-DD-2` — Extend the existing pure function, don't add a parallel one

- **Context:** `buildTotalResultsKpi` already single-passes `rows` to compute `w3Count`/`leadCount`. A second, separate function computing `replicatedCount`/`newCount` would double-iterate the same array for no benefit and violate `COV-DD-1` ("the page computes no figure itself... never in `bilateral-overview.component.ts`") only by adding an extra hop, not a component-side computation.
- **Decision:** append two counters to the same existing loop in `buildTotalResultsKpi`.
- **Alternatives considered:** a new `buildReplicationKpi(rows)` sibling function — rejected, no reuse benefit, adds an extra call site and an extra spec file for a two-field addition.
- **Consequences:** `buildTotalResultsKpi`'s single responsibility widens slightly (still "total results KPI," now with a replication sub-split) — acceptable at this size; if a third related split is added later, reconsider splitting.

### `BOV-DD-3` — Inline markup, no shared badge component

- **Context:** the Reporting tab already has near-identical pill markup, but as inline template markup, not a shared component. Extracting a shared `<app-count-badge>` now would touch a file this spec doesn't otherwise need to change and adds an abstraction for exactly two call sites.
- **Decision:** copy the inline pill markup pattern into the Overview template, matching tokens/classes exactly.
- **Alternatives considered:** extract a shared component first, then use it in both places — rejected per the "don't add abstraction beyond what the task requires" convention; three-plus call sites would justify revisiting this.
- **Consequences:** any future visual tweak to this pill style must be applied in both places by hand until/unless a shared component is justified — acceptable, tracked in §13.

### `BOV-DD-4` — Badges are non-interactive spans on this card, unlike the Reporting tab's buttons

- **Context:** the Reporting tab's badges are `<button>`s that navigate to filtered Results. The Overview's "Total results" card is *already* a single `<a>` linking to Results (`bilateral-overview.component.html:89-106`) — nesting interactive buttons inside an anchor is invalid HTML and a focus-order/a11y hazard.
- **Decision:** render the two new badges as plain `<span>`s (visual only), consistent with how the existing `w3Count`/`w1w2Count`/`leadCount`/`contributingCount` text is already rendered on this same card (also non-interactive spans inside the one card-level link).
- **Alternatives considered:** make the whole card link to a pre-filtered Results view scoped to replicated/new — rejected, out of scope for this spec (would require new deep-link query params) and not requested.
- **Consequences:** clicking a badge does the same thing as clicking anywhere else on the card (navigates to unfiltered Total results) — consistent with the rest of the card, not a regression.

### `BOV-DD-5` — Plain English badge labels, no new `TermKey`

- **Context:** `requirements.md`'s NFR row defaulted to "add a `TermKey` unless confirmed identical across P22/P25." Design-time check of the reference pattern (`bilateral-projects-panel.component.html:276,287`) shows the exact words "replicated" and "new" are already hardcoded English there, with no `term` pipe.
- **Decision:** follow the same precedent — hardcoded English, no new `TermKey`, for consistency with the pattern being copied.
- **Alternatives considered:** add `TermKey`s now and leave the Reporting tab's hardcoded copy as pre-existing debt — rejected, would make the two screens' labels diverge if a future i18n pass touches only one.
- **Consequences:** if a future i18n effort promotes "replicated"/"new" to `TermKey`s, it should do both call sites together — noted in §13.

## 13. Open Gaps & Follow-ups

- The Overview's `newCount` (unconditional) and the Reporting tab's "new for review" (status-gated) are intentionally different numbers for the same center/phase — `bilateral-overview/CLAUDE.md` MUST document this divergence in the same commit (touched-folder convention) so it isn't later "corrected" to match.
- If a third pill/metric is ever added to either screen, revisit `BOV-DD-3` (shared badge component) and `BOV-DD-2` (whether a dedicated aggregate function is warranted).
- Visual-parity check between the two screens' badge styling is a human check at the browser-verification step (§10), not automated — recorded as an accepted risk in `requirements.md`.
- If a future i18n pass touches "replicated"/"new" copy, it should update both `bilateral-overview` and `bilateral-projects-panel` together (`BOV-DD-5`).

## Budget (Step 2.4)

- **Expected tasks:** 1 (single focused task: aggregate + template + specs, all in the same tightly-scoped folder).
- **Expected LOC:** ~60-80 (≈10 in `aggregate.ts`, ≈20 in `.component.html`, ≈2 in `.component.ts` interface passthrough if needed, ≈30-40 across the three spec files, ≈10 in `CLAUDE.md`).
- **Expected review rounds:** 1 (Lite depth, single reviewer pass; visual-parity human check happens inline during browser verification, not as a separate round).

This matches the `Lite` depth chosen at Phase 0 — no re-sizing needed (Step 2.4 signal: **estimate matches**).
