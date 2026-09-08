# Requirements — Bilateral review: center chip strip + phase scoping

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/bilateral-review-center-strip-and-phase/` |
| **Module code** | `BRC` |
| **Type** | Change (follow-up to `changes/sp-bilateral-review-tab`, shipped 2026-09-07 on `qa-development-2026`) |
| **Depth** | Standard (compact) |
| **Approval Mode** | pre-approved (owner, 2026-09-07 — "dale, /akili-specify directo con eso como intención aprobada") |
| **Intent source** | Owner message 2026-09-07 (no `proposal.md`): the legacy page showed information **per center**; the tab must take the **phase filter like the other sections**; SP filtering confirmed correct |
| **Status** | approved — Phase 1 gate auto-approved (pre-approved mode); judgment-day one pass, fix-only, applied 2026-09-07 (`judgment.md`) |
| **Date** | 2026-09-07 |
| **Depends on** | `changes/sp-bilateral-review-tab` (done, `116948c88`) |
| **Parallel-safe** | yes (edits only `pages/bilateral-review/**` + the band badge call) |

---

## 1. Module / Feature

- **Module:** `result-framework-reporting` (client only) — page `pages/bilateral-review/`
- **Sub-feature:** per-center chip strip · phase-scoped list and badge
- **Owner:** PRMS product owner

---

## 2. Executive Summary

The new Bilateral review tab lost two things the legacy page had or the sibling tabs have:

1. **Per-center view.** The legacy left rail listed every contributing center with its pending count ("All Centers 143 · IITA 100 · IWMI 20 …"). Today the center is only a multiselect inside the Filter popover, without counts.
2. **Phase scoping.** Results and My results read the shell's current reporting phase; the review tab and its badge call the list without a phase and mix every cycle (SP02 today: 141 rows in Reporting 2025 + 36 in Reporting 2026 → "177 / 143 pending").

Premises verified in code and data on 2026-09-07 (KZ-MWB-1 rule):

| Premise | Where | Fact |
|---|---|---|
| Endpoint supports phase | `result.repository.ts:3283` | `versionId` → `AND r.version_id = ?`; client `GET_ResultToReview(programId, centerIds?, versionId?, statusIds?)` (`results-api.service.ts:1583`) already forwards it |
| Current phase source | `data-control.service.ts:104-135` | `reportingCurrentPhase.phaseId` filled from `GET_versioning(OPEN, REPORTING)` — **as a bigint string on the wire ("36")**; `reportingPhaseVersion()` signal bumps when it loads; `dashboard-lab.effectiveVersionId` reads it and normalizes with `Number()` (`dashboard-lab.component.ts:1509-1516`) |
| Phase catalog | `phases.service.ts:13-64` | `PhasesService.phases.reporting` is a **plain array** filled after `GET_versioning(ALL, ALL)` filtered `app_module_id == 1`; `getPhasesObservable()` is a non-replaying Subject — consumers seed a signal from the array and subscribe (`dashboard-lab.component.ts:2839-2841`); phase options are filtered by the program's portfolio (`:1503-1511`) |
| Results tab phase UX | `programme-results` | has a **phase selector** (`?phase=` param carrying a phase **label**, `filter.selectedPhase`, options from the rows' `phaseName`); this spec's `?phase=` carries the numeric `versionId` — parity of behavior, not of value space |
| My results badge | `my-work-count.service.ts:18` | cache keyed `code::phaseLabel` — one count per program + phase |
| Per-center data | `by-program-and-centers` rows | `lead_center` (acronym) per row; `status_id` loose `== 5` = pending; CLARISA `CenterDto {code, acronym}` maps code ↔ acronym (page already builds `acronymToCode`) |
| Data impact | local DB | SP02: phase 34 → 131 pending + 10 approved; phase 36 → 12 pending + 24 editing. SP13: 34 → 37 pending + 5 approved + 1 editing; 36 → 1 pending + 20 editing |
| Environment note | local DB | shell hero says "REPORTING CYCLE 2026" while the DB's `status=1` phase is 2025 — the shell's resolved `phaseId` is the authority for this spec, whichever it turns out to be; **every expected number in the ACs is stated relative to "the shell's current phase" (P) and its alternative (Q)**, not hard-coded to 36/12. The mismatch is the parked item from 2026-09-07 |

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Current phase** | `reportingCurrentPhase.phaseId` as resolved by the shell (what Results/My results use by default) |
| **Selected phase** | The phase the user picked on the tab (`?phase=`), defaulting to the current phase |
| **Center chip** | A quick-filter pill under the status chips for one lead center, showing its pending count |
| **Pending** | `status_id == 5` (loose equality; wire may send `"5"`) |

---

## 4. In Scope / Out of Scope

**In scope:** center chip strip; phase scoping of list and badge; phase selector in the Filter popover with `?phase=` retention; tests (Jest + CT extension); guide update; design DD-7 of the parent spec superseded.
**Out of scope:** any server change; per-center counts from `pending-review` (still unused); changes to the drawer; the year/phase DB mismatch; Results/My results tabs.

---

## 5. Personas

| Persona | Change |
|---|---|
| Program lead / reviewer | Sees which centers have pending W3 results at a glance and jumps to one; the queue matches the reporting cycle shown in the hero |
| Center submitter | Sees only the cycle being reported |
| Admin | Same as reviewer |

---

## 6. User Stories

- **`BRC-US-1`** As a program lead, I want a strip of centers with pending counts on the Bilateral review tab, so that I can review center by center as I did on the old page. *(Refines US-Q1, US-P1)*
- **`BRC-US-2`** As a program lead, I want the review list and its badge scoped to the reporting cycle the shell shows, so that the numbers match Results and My results. *(Refines US-P1, AC-5)*
- **`BRC-US-3`** As a reviewer, I want to switch the cycle on the tab like I can on Results, so that I can finish last cycle's queue. *(Refines US-Q1)*

---

## 7. Functional Requirements

### Required (MUST)

- **`BRC-R-1` Center chip strip.** Below the status chips the tab MUST render a chip row: **All centers N** followed by one chip per distinct lead center present in the **search-filtered, phase-scoped list** (the same base as the status chips), each showing the center acronym and its **pending** count, ordered by pending count desc then acronym asc. Rows with a blank lead center appear under a final **Not specified** chip so that the chips partition the base.
- **`BRC-R-2` Chip semantics.** Clicking a center chip MUST set the Center filter to exactly that center (replacing any previous selection); clicking the pressed chip or **All centers** MUST clear the Center filter. Exactly one chip is `aria-pressed="true"` when the Center filter holds a single center; **All centers** is pressed when it is empty; none is pressed when the popover holds several centers.
- **`BRC-R-3` Bidirectional sync.** The strip and the popover Center multiselect MUST read and write the same state, persisted in the existing `?center=` param (CLARISA codes, csv).
- **`BRC-R-4` Chip counts.** Chip counts MUST be pending rows per center over the search-filtered list (same base the status chips use), independent of the status chip and popover filters; **All centers N** = total pending over that base (including the Not specified bucket), so N MUST equal the KPI "Pending review" at all times. When the CLARISA centers catalog has not resolved an acronym, the chip value falls back to the acronym exactly as the popover option does today.
- **`BRC-R-5` Phase-scoped list.** Every list request (initial load, retry, post-decision re-fetch) MUST carry `versionId` = the selected phase (a number), defaulting to the current phase; while the current phase is unresolved the tab MUST wait (skeleton), not fetch unscoped. If the phase catalog or the current phase fails to resolve, the tab MUST show its error state with Retry instead of an indefinite skeleton. A phase switch MUST cost exactly one list request (entity details are not re-fetched).
- **`BRC-R-6` Phase-scoped badge.** The tab badge on every SP tab MUST count pending rows of the **current phase** (not the user-selected one), cached per program **and** numeric phase id; hidden while the current phase is unresolved; a decision on the tab refreshes the badge only when the selected phase equals the current phase (numeric comparison — ids arrive as strings).
- **`BRC-R-7` Phase selector.** The Filter popover MUST offer a single-select **Cycle** control listing the reporting phases of the program's portfolio (current first, then by year desc), persisted as `?phase=<versionId>`; unknown or empty values fall back to the current phase; re-picking the shown phase MUST be a no-op (no deselection to an "all" value); changing it re-fetches the list, expands all groups, and keeps search, status chip and center filters.
- **`BRC-R-8` Hero consistency.** When the selected phase differs from the current phase, the tab MUST show a visible indicator near the toolbar ("Showing Reporting 2025") so the hero's cycle line is not misread; the band hero itself is not changed.
- **`BRC-R-9` No regression.** Existing behavior of `changes/sp-bilateral-review-tab` (status chips, KPIs, grouped/flat table, drawer, deep link, redirect) MUST keep passing its suites unchanged except where this spec names a change.
- **`BRC-R-10` Deep link on an empty phase.** When `?reviewResult=` / `?reviewResultId=` are present and the phase-scoped list loads with zero rows (or without the code), the drawer MUST still open through the `{ id, result_code }` fallback once loading settles; the effect fires on load completion, not on "rows non-empty".

### Should (SHOULD)

- **`BRC-R-20`** The center strip SHOULD wrap onto multiple lines below `md` without clipping and never introduce body horizontal scroll.
- **`BRC-R-21`** With more than 12 centers the strip SHOULD collapse the tail behind a "+N more" chip that expands inline.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | No extra request for the strip (derived from loaded rows). Phase switch = one list request. Badge = one memoized request per program+phase per session |
| Security | Unchanged (JWT via `auth` header) |
| Backwards compatibility | `?center=` keeps its meaning; new `?phase=` optional; `/results-review` redirect unaffected |
| Accessibility | Chips are `<button aria-pressed>` with accessible names "IITA, 100 pending"; strip is a `role="group"` with an `aria-label`; no native `disabled` (KZ-REH-2) |
| i18n | Strings in `bilateral-review.copy.ts`, American English |

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BRC-AC-1` | Phase-scoped list with centers IITA (3 pending), CIP (2 pending, 1 approved), IWMI (0 pending, 2 approved) | Strip renders | `All centers 5 · IITA 3 · CIP 2 · IWMI 0`, All pressed |
| `BRC-AC-2` | Same list | Click `CIP` | Rows = CIP only, `?center=<CIP code>`, popover shows CIP selected, CIP chip pressed, All not pressed; click `CIP` again → filter cleared, All pressed |
| `BRC-AC-3` | Popover selects IITA + CIP | Strip renders | No chip pressed; counts unchanged; rows = both centers |
| `BRC-AC-4` | Status chip = Approved | Strip renders | Center counts still show pending numbers (3/2/0), All 5 |
| `BRC-AC-5` | Current phase P resolved (string id on the wire) | Tab loads | Exactly one list request with `versionId=<P as number>`; none before the phase resolved; entity details fetched once |
| `BRC-AC-6` | `?phase=Q` (a known phase ≠ P) in the URL | Tab loads | Request carries `versionId=Q`; Cycle select shows Q's name; indicator "Showing <Q name>" visible |
| `BRC-AC-7` | `?phase=999` (unknown) | Tab loads | Falls back to the current phase; URL rewritten to the current id with `replaceUrl` |
| `BRC-AC-8` | Cycle changed P → Q while search "maize", status Pending, center CIP set | Re-fetch | Search, status and center preserved; all groups expanded (`allExpanded` true + nonce); exactly one new list request and no entity-details request |
| `BRC-AC-8b` | Cycle select showing Q | User re-picks Q | No request, no URL change (no deselection to "all") |
| `BRC-AC-9` | Overview tab, current phase P, program with x pending in P and y ≠ x in Q | Badge renders | Badge = x; switching the review tab's Cycle to Q does not change the badge; with P delivered as `"36"` and compared against `36` the badge still resolves (mixed-type test) |
| `BRC-AC-10` | Selected phase = current, decision approves the last pending row | Propagation | Badge decrements; with selected ≠ current the badge is untouched |
| `BRC-AC-11` | Effective 840 CSS px, 9 centers | Strip renders | Wraps to ≥ 2 lines, no clipped chip, body `scrollWidth <= clientWidth` |
| `BRC-AC-12` | Parent spec suites | `npx jest …/bilateral-review`, band specs, CT | Green, with only the assertions this spec names updated (count-service signature; band `ensure` assertion; band spec `DataControlService` stub) |
| `BRC-AC-13` | `?reviewResult=8273&reviewResultId=91`, phase-scoped list returns zero rows | Load settles | Drawer opens with `{ id: 91, result_code: 8273 }`; params cleared with `replaceUrl` |
| `BRC-AC-14` | Phase catalog request fails / current phase never resolves | Tab | Error state with Retry (no indefinite skeleton); Retry re-attempts the catalog + list |
| `BRC-AC-15` | Two rows with blank `lead_center` (one pending) | Strip renders | A trailing "Not specified 1" chip; All centers equals the KPI Pending |

### Key scenarios

#### Scenario: Review center by center (BRC-R-1..4)

- GIVEN the tab shows the current phase for SP02 with several contributing centers
- WHEN the reviewer clicks the `IITA` chip
- THEN only IITA rows remain, the chip is pressed, the popover shows IITA selected and the URL carries IITA's code in `center`
- AND the chip counts do not change (they describe the search-filtered base, not the current selection)
- BUT it must NOT alter the status chip, the search text or the phase
- AND IT MUST clear back to all centers with one click on the pressed chip or on All centers.

#### Scenario: Numbers match the hero cycle (BRC-R-5, R-6)

- GIVEN the shell resolved the current phase to Reporting 2026
- WHEN the reviewer opens Overview and then Bilateral review for SP02
- THEN the badge and the Pending KPI both read the phase-2026 pending count
- BUT it must NOT fire any list request before the phase id is known
- AND IT MUST keep badge and KPI equal by construction (same request and phase).

#### Scenario: Finishing last cycle's queue (BRC-R-7, R-8)

- GIVEN the tab on the current phase
- WHEN the reviewer picks another cycle Q (e.g. Reporting 2025) in the Cycle select
- THEN the list re-fetches with that phase, the URL gains `?phase=<Q id>`, an indicator reads "Showing <Q name>"
- BUT it must NOT change the badge (current phase) nor reset search/status/center
- AND IT MUST survive a reload (param hydration) and a drawer round trip.

---

## 10. Defect classes and gates

| Defect class | Gate | Substitute |
|---|---|---|
| Chip count arithmetic / ordering | Jest with a fixture where every center count differs and one center has 0 pending | — |
| Chip ↔ popover ↔ URL desync | Jest: click chip → assert `centers()`, `router.navigate` args, popover value; popover multi-select → no pressed chip | — |
| Unscoped or premature request (initial, retry, post-decision) | Jest `HttpTestingController`: every list request carries `versionId=`, none before the phase resolves (FAIL input: resolve rows before the phase); post-decision re-fetch asserted too | — |
| Badge on wrong phase | Count-service Jest: cache key `CODE::<number>` isolates phases, `"36"` and `36` share a key; **page** Jest: `setFromRows` called only when selected === current (the service knows no current phase) | — |
| Strip wrap / body overflow | CT extension at 840/1536 (existing `bilateral-review.cy.ts`) with a 9-center fixture; FAIL input: `white-space: nowrap; min-width: 3000px` on the strip | — |
| Visual parity with sibling chips | **No automated gate** → Leader HITL look in the Orca browser after T-2 | accepted if skipped |
| Indicator copy / chip contrast | Structural CT (accessible names, `aria-pressed`); contrast measured live (oklch via canvas) at the HITL look | — |

---

## 11. Open Questions

- `BRC-OQ-1` Should center chips show **pending** counts (legacy rail semantics) or **total** counts? **Assumed pending** (matches the legacy "pending-count badge" and the review purpose).
- `BRC-OQ-2` Should the badge follow the tab's selected phase? **Assumed no** — badge = current phase, like My results.
- `BRC-OQ-3` Which phase does the shell resolve as current on the test DB (2026 per the hero, 2025 per `status=1`)? **Not a spec decision** — gates are relative to the resolved phase; the Leader records the observed P at execution.

---

## Required cross-references

- `docs/prd.md` US-Q1, US-P1; AC-3, AC-5 · `docs/ux-ui/design.md` §7, §10 · `docs/trd/trd.md` §6.
- Parent spec `docs/specs/changes/sp-bilateral-review-tab/` (`requirements.md` R-3, R-7, R-8, R-15; `design.md` DD-2, DD-7; `execution.md` follow-ups).
