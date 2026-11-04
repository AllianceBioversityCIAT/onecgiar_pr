# Requirements — Overview Replicated/New Badges

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** Center Overview tab — "Total results" KPI hero
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** draft
- **Ticket(s):** none

---

## 2. Context

The center Overview tab (`onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/`) is the phase-aware dashboard PMU/center leads read to track submission progress (`docs/prd.md` **US-P1**). Its "Total results" hero KPI currently shows a source split (`63 W3/Bilateral · 203 W1/W2`) that a user reasonably — but incorrectly — read as a New-vs-Replicated split. It is not: `w3Count` (`bilateral-overview.aggregate.ts:139-153`) is computed from `row.source === 'API'`, independent of whether the result was carried into this phase via duplication.

The **New/Replicated** distinction already exists in this module, computed per-project on the Reporting tab's Projects Catalog (`bilateral-projects-panel.component.ts:104-137`, badges in `.component.html:265-299`) from `BilateralCenterResult.is_replicated` — a general `result` table column (not innovation-specific; confirmed via `result.entity.ts` and migration `1694618798352-addedIsReplicatedIntoResult`). This spec extends that same concept, computed **center-wide**, to the Overview tab's hero KPI, reusing the existing badge visual pattern so the two screens read consistently (`proposal.md` §4).

This is a **Change**, `Lite` depth: one existing pure-function aggregate gains two derived counts from a field already present on every row, and one existing card gains a badge row copied from an already-shipped pattern. No new API, no schema change, no new screen.

---

## 3. In Scope / Out of Scope

### In scope

- Two new center-wide derived counts — **replicated** and **new** — computed in `bilateral-overview.aggregate.ts` from the phase-filtered result rows already loaded for the Overview tab.
- A badge row on the "Total results" KPI hero card showing these two counts, visually matching the Reporting tab's pill style (icon + count + label, amber `pi-sync` "replicated" / emerald `pi-plus-circle` "new").
- Updated `aria-label` on the "Total results" card reflecting the new figures.
- Jest coverage for the new aggregate function and the new markup; a Cypress CT layout check if the card's height/wrap changes at the documented breakpoints.

### Out of scope

- Any change to the Reporting tab's existing per-project badges (`bilateral-projects-panel`) — they are the reference pattern, not a target of this change.
- Redefining `w3Count`/`w1w2Count` (`row.source`) — that split stays as-is; this spec only adds a second, independent split alongside it.
- Adding a New/Replicated breakdown to the Pending review, Approved, or Needs attention KPI cards.
- Any server-side change — `is_replicated` is already delivered on every `BilateralCenterResult` row.
- Resolving the Reporting tab's own `BIL-POM-OQ-1` open question beyond reusing its already-settled normalization rule (`Number(row.is_replicated) === 1`).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| PMU / portfolio lead (`US-P1`) | Reading the center Overview no longer requires guessing whether the W3/Bilateral count reflects replicated innovations — the new/replicated split is now a separate, explicit figure. |
| Result submitter (center reporting user) | No workflow change; read-only dashboard figure. |

---

## 5. User Stories

- **`BOV-US-1`** — As a PMU/portfolio lead, I want the center Overview's Total results card to show how many results are new this phase vs carried over (replicated) from a prior phase, so that I stop misreading the existing W3/Bilateral split as that distinction. *(Refines `US-P1`.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`BOV-R-1`** The system MUST compute a center-wide `replicatedCount` — the count of phase-filtered results where `Number(row.is_replicated) === 1` — as part of the Overview's `OverviewTotalResultsKpi` model, derived from the same row set (`filterCenterResults` output) used by every other Overview KPI (COV-R-13 reconciliation invariant, inherited from `bilateral-overview/CLAUDE.md`).
- **`BOV-R-2`** The system MUST compute a center-wide `newCount` — the count of phase-filtered results where `Number(row.is_replicated) !== 1` — as part of the same model. `replicatedCount + newCount` MUST equal `overview.kpis.totalResults.count` (mutual exclusivity, mirrors `BIL-POM-AC-3`'s pattern at the per-project level, but unconditional — see `BOV-R-2.1`).
- **`BOV-R-2.1`** Unlike the Reporting tab's per-project "new for review" count (which additionally requires `status_id === pending`), the Overview tab's `newCount` MUST be an unconditional partition (`not replicated`, regardless of status) — because status is already covered by the separate Pending review / Approved / Needs attention KPI cards, and a status-gated `newCount` here would not sum with `replicatedCount` to the total, breaking `BOV-R-2`'s invariant.
- **`BOV-R-3`** The "Total results" KPI hero card MUST render both counts as badges, using the existing Reporting tab pill markup/tokens (`bilateral-projects-panel.component.html:265-299`) as the visual reference: amber `pi-sync` icon for replicated, emerald `pi-plus-circle` icon for new.
- **`BOV-R-4`** The card's `aria-label` MUST include both new figures so the accessible name stays accurate (WCAG 2.1 AA, `docs/ux-ui/design.md` §10).
- **`BOV-R-5`** The existing `w3Count`/`w1w2Count` line MUST remain unchanged in position and computation — this spec is additive, not a replacement.

### Should (SHOULD)

- **`BOV-R-10`** The badge row SHOULD wrap gracefully at the narrowest KPI-deck breakpoint (single-column, `<640px`) without exceeding the card's existing `min-h-[120px]` in a way that breaks deck row alignment, falling back to a second line if needed.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Both new counts are derived in the same single pass already performed by `buildTotalResultsKpi` over the existing (already-fetched) row array — no new HTTP call, no new query. |
| **Backwards compatibility** | Additive only: `OverviewTotalResultsKpi` gains two new fields; no existing field is removed or renamed (`BOV-R-5`). |
| **Accessibility** | New badges MUST meet WCAG 2.1 AA contrast and be included in the card's accessible name (`BOV-R-4`). |
| **Internationalization** | New badge labels ("replicated", "new") MUST go through `src/app/internationalization/` if they differ P22 vs P25; if identical across portfolios, plain English is acceptable per existing convention (`onecgiar-pr-client/CLAUDE.md` §11 rule: hardcoded English is fine for non-domain-varying copy, but "replicated"/"new" here IS domain copy describing bilateral module behavior — default to a `TermKey` unless confirmed identical across P22/P25 during design). |
| **Data correctness** | `is_replicated` MUST be normalized via `Number(...) === 1`, never `=== true`/`=== false` (wire delivers a raw MySQL tinyint; documented gotcha in `BilateralCenterResult.is_replicated` docstring and `bilateral-overview/CLAUDE.md`). |

**Defect classes this spec can produce, and their gate:**

| Defect class | Catching command |
|---|---|
| `replicatedCount + newCount !== totalResults.count` (a row miscounted or double-counted) | `bilateral-overview.aggregate.spec.ts` — a new assertion on the invariant, with fixture rows covering `is_replicated` as `1`, `0`, `'1'` (string), and `undefined`. |
| Wrong normalization (`=== true` instead of `Number(...) === 1`) silently classifying every row as "new" | Same aggregate spec — a fixture row with `is_replicated: 1` (number) and one with `is_replicated: true` (boolean) must both count as replicated. |
| Badge markup diverges visually from the Reporting tab pattern (wrong icon/color/token) | No automated check — visual comparison is a **human check at the HITL pause** (Step 2.5/3.3 review), since neither Jest/jsdom nor a class-presence assertion can verify visual match to the reference pattern. Record as an accepted risk if skipped. |
| Card layout breaks at a KPI-deck breakpoint (the documented `sm:`/`min-[Npx]:` cascade trap) | `bilateral-overview.cy.ts` (real Chromium, already asserts KPI column count at 4 widths) — extend it only if the card's height changes; otherwise the existing spec already covers the deck layout. |
| Accessible name (`aria-label`) missing the new figures | `bilateral-overview.component.spec.ts` — assert the rendered `aria-label` string contains both new counts. This is a presence-assertion, not a proof that a screen reader announces it correctly; full AT verification is out of scope for this Lite spec and recorded as an accepted risk. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BOV-AC-1` | A center's phase-filtered result rows include 5 with `is_replicated` truthy (`1`, `'1'`, or `true`) and 3 with it falsy (`0` or `undefined`), out of 8 total | `buildTotalResultsKpi` runs | `replicatedCount === 5`, `newCount === 3`, and `replicatedCount + newCount === count` |
| `BOV-AC-2` | The Overview tab has loaded successfully for a center/phase with a non-zero result count | The "Total results" card renders | Two new badges are visible with the correct counts and icons/colors matching the Reporting tab pattern |
| `BOV-AC-3` | The same scenario as `BOV-AC-2` | A screen reader reads the card | The `aria-label` includes both the replicated and new counts alongside the existing total |
| `BOV-AC-4` | A phase with zero results (`isEmptyPhase()`) | The Overview tab renders | The KPI deck is not shown at all (existing empty-phase behavior, `bilateral-overview.component.html:204-218`) — the new badges introduce no new empty-state handling since they render only inside the already-guarded `@else` branch |

Cross-cutting project ACs that already apply: `AC-4` (bilateral/platform-report stability — not touched, client-only change), `AC-9` (no secrets — n/a here).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `BilateralCenterResult.is_replicated` — already delivered on every row by the existing `GET_bilateralCenterResults` endpoint; no server change needed.
- `filterCenterResults` / `bilateral-query-params.ts` — the single filter contract this spec's counts MUST derive from (COV-R-13).

### Downstream consumers

- None — this is a read-only UI figure with no consumers beyond the rendered page.

### Assumptions

- The Reporting tab's badge visual pattern (`bilateral-projects-panel.component.html:265-299`) is stable and is the correct reference to copy from (confirmed in `proposal.md`).
- `newCount`'s unconditional definition (`BOV-R-2.1`) is the one the user wants; this was the proposal's recommendation and is treated as accepted unless the user raises it at the Phase 1 approval gate below.

---

## 10. Open Questions

- **`BOV-OQ-1`** — Confirmed direction (recommended in `proposal.md` §11, encoded as `BOV-R-2.1`): `newCount` is unconditional ("not replicated"), NOT status-gated like the Reporting tab's per-project definition. **Flagging for explicit user confirmation at this phase's approval gate** — if the user instead wants the status-gated definition, `BOV-R-2`'s sum invariant must be dropped or reworded before `design.md`.

---

## 11. Out-of-Band Notes

None.

---

## Required cross-references

- `docs/prd.md` — `US-P1` (phase-aware dashboard for submission progress).
- `docs/ux-ui/design.md` §10 (accessibility), §7/§8 (badge/pill tokens — reusing existing, no new tokens introduced).
- `docs/trd/trd.md` — bilateral module (no new API/data-model surface introduced by this spec).
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md` — invariants `COV-DD-1`, `COV-R-13` this spec must preserve.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/` — visual/computation reference pattern (`BIL-POM-T-3`, `BIL-POM-AC-3`, `BIL-POM-OQ-1`).
