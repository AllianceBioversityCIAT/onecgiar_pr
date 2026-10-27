# Design — Science Program chips in the replicated-result project picker (`PSC`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/project-picker-sp-chips/` |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved (Santiago Sanchez, 2026-10-26) |
| Requirements | `requirements.md` (PSC-R-1..R-5, PSC-NFR-1..4) |
| Budget | **1 task · ~150 LOC (≈60 prod + ≈90 spec) · 1 review round** — tripwire for `/akili-execute` |

## 2. Summary

All logic lives in `BilateralProjectSelectorComponent` (standalone, client-only). It already holds the catalogue (`creationService.projects()`, each with `sciencePrograms[]`) and can read the stored primary (`creationService.selectedPrimarySp()`) and the replicated flag (`creationService.isReplicated()`). The change adds four derived signals, one writable selection signal, and a chip row in the existing dropdown template. Section 0 and the service are untouched.

## 1A. Premise Ledger

| Premise | Verified |
|---|---|
| Catalogue projects carry `sciencePrograms: { programId, programCode, allocation, spName, spShortName }[]` | ✅ `bilateral-creation.interfaces.ts:14-30` |
| Catalogue `programCode` uses the same format as initiative `official_code` | ✅ `bilateral-projects.service.ts:351-357` resolves names via `official_code IN (programCodes)` |
| Stored primary is hydrated with `programCode = official_code` and a CLARISA id that may differ from the mapping id | ✅ `bilateral-creation.service.ts` loadResult; P2-3807 note in `section-zero-dashboard.component.ts` `assignmentPrimary` |
| Catalogue offers only approved mappings with positive allocation; unmapped projects have `sciencePrograms: []` | ✅ `reportableMappings` |
| `isReplicated` is a normalized boolean signal on the service | ✅ `bilateral-creation.service.ts:107,233` |
| Spartan `hlmBtn` (variants `outline`, `brandSoft`, `link`; size `xs`) and `hlmBadge` (`secondary`) exist | ✅ `spartan/button`, `spartan/badge` |

## 2. Architecture Overview

Single component; no new service, route, or request (PSC-NFR-1/2).

Data flow inside the selector:

| Signal | Kind | Derivation | Req |
|---|---|---|---|
| `showProgramChips` | computed | `isInline() && creationService.isReplicated() && programChips().length > 0` | R-1 |
| `programChips` | computed | Flatten `projects()[].sciencePrograms`, dedupe by normalized code, keep first `spShortName`/`spName`, count distinct projects per code, sort by code asc | R-1 S-1.1, S-1.3 |
| `defaultProgramCode` | computed | Normalized `selectedPrimarySp()?.programCode`, only if present in `programChips()`; else `null` | R-2 S-2.1–2.3 |
| `selectedProgramCodes` | `linkedSignal` from `defaultProgramCode` → `Set` with the default or empty | Re-seeds only when the default code changes (i.e. a different primary was saved); user toggles persist across dropdown open/close | R-2 S-2.4 |
| `filteredProjects` (modified) | computed | Text filter (unchanged) ∧ (no chip active **or** chips hidden **or** project maps any selected code) | R-3 |

Normalization: `String(code ?? '').trim().toUpperCase()` — one private helper, used on both sides.

Gating subtlety: when `showProgramChips()` is false the program predicate is skipped entirely, so non-replicated results and the wizard keep exact current behavior even if a selection value exists (S-1.2).

## 3–5. Data Model / API / Server

None. No entity, migration, endpoint, or bilateral payload change (PSC-NFR-2).

## 6. Frontend Plan

### 6.2 Component changes — `bilateral-project-selector`

| Part | Change |
|---|---|
| `.ts` | Add signals above; methods `toggleProgram(code)` and `clearPrograms()`; import `HlmButtonImports`, `HlmBadgeImports` |
| `.html` | Inside `.bps-dropdown`, after `.bps-search`: `@if (showProgramChips())` a `div role="group" aria-label="Filter by Science Program"` containing one `<button type="button" hlmBtn size="xs">` per chip (`variant` = `brandSoft` when selected, `outline` otherwise; `[attr.aria-pressed]`; `title` = full `spName`), label `CODE · spShortName` + `hlmBadge variant="secondary"` count; then a `link`/`xs` *Clear* button when ≥1 selected. Every chip/clear click calls `$event.stopPropagation()` (R-5, S-3.4). Empty branch: when list empty **and** chips active → "No projects for the selected programs" + *Clear filters*; otherwise keep "No projects found" |
| `.scss` | `.bps-chips`: flex-wrap, small gap, horizontal padding matching `.bps-search`, bottom border; no new colors (PSC-NFR-3/4) |
| `.spec.ts` | Extend mock with `isReplicated`, `selectedPrimarySp`; add cases below |

### 6.3 Design system usage

Spartan primitives only, existing tokens (UI rule: visual changes use Spartan). Selected = `brandSoft` (brand border + brand text, AA-measured in `hlm-button.ts`), unselected = `outline`. No new tokens.

## 7–9. Security / Performance / Observability

No auth surface. Catalogue size is tens of projects; derivations are O(projects × mappings) in memory. No logging added.

## 10. Testing Plan

Jest selector spec (`--maxWorkers=2`, scoped), new cases:

| Case | Req / Scenario |
|---|---|
| Replicated inline → chips deduped, counted, sorted | S-1.1, S-1.3 |
| Not replicated / wizard / no mappings → no chip row, list unchanged | S-1.2, S-1.3 |
| Default SP06 pre-selected; list = SP06 projects | S-2.1 |
| Stored id 52 code SP06 vs mapping id 269 code SP06 → SP06 selected; mapping id 52 with code SP02 not selected | S-2.2 |
| Primary missing / code absent → nothing selected, full list | S-2.3 |
| Toggle then close/reopen keeps selection; changing `selectedPrimarySp` code re-seeds | S-2.4 |
| SP01+SP03 → union, no duplicates; + search narrows; deselect last → full list | S-3.1–3.3 |
| Chip click → dropdown still open, `projectSelected` not emitted, `setLeadProject`/`selectProject` not called | S-3.4 |
| Empty state text + *Clear filters* clears | S-4.1 |
| `aria-pressed` reflects state; group `aria-label` present (presence only) | R-5 |

Manual browser check (layout, which jsdom cannot see): local stack, a replicated CIP result in Section 0 — open dropdown, verify chip wrap/scroll, toggle chips. **Never click Save** (shared prdb).

## 11. Backwards Compatibility

Additive and gated; wizard and non-replicated results are byte-for-byte the same path through `filteredProjects`. Rollback = revert the single commit.

## 12. Design Decisions

### PSC-DD-1 — Client-side filter in the selector, not a server param

Catalogue already in memory with mappings; a server filter adds a contract change and round-trips for no gain. (Proposal Option A; B rejected.)

### PSC-DD-2 — Match default by program code, not id

CLARISA initiative id ≠ W3 mapping id for the same program (P2-3807). Code is the shared identity; mirrors `assignmentPrimary`'s rule. An id fallback is deliberately **not** used (an equal id can belong to another program).

### PSC-DD-3 — `linkedSignal` seeded from the default code

Keeps the reporter's choice while the result stays open (S-2.4) and re-seeds automatically when a newly saved primary changes the default — no manual effect/reset code.

### PSC-DD-4 — Selector reads service state directly; no new inputs

Both Section 0 branches render the same selector; reading `isReplicated`/`selectedPrimarySp` from the shared service avoids touching `section-zero-dashboard` twice. Gate on `isInline()` keeps the wizard out.

### PSC-DD-5 — Default follows current stored primary

Per OQ-4: if the primary was already changed in 2026, the default follows it (`selectedPrimarySp`), not a reconstructed 2025 value. Staged-but-unsaved `pendingPrimary` in Section 0 is ignored.

### Reversion challenge (Step 2.3)

No DD removes or inverts shipped behavior — all additions behind a gate. Challenge not triggered.

## 13. Open Gaps & Follow-ups

- Widening to non-replicated results / wizard (OQ-2) — follow-up only if requested.
- Layout is verified manually only (accepted, recorded in requirements §8).
