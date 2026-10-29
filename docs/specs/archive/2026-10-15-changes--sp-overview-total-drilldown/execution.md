# Execution — SP Overview: Total General reconciles + drill-down

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-total-drilldown` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-15 |
| Leader | Claude Code session (opus) · Implementer `akili-implementer` · Reviewer `akili-reviewer` |
| Budget (design §11) | 5 tasks · ~350 LOC · 1–2 review rounds |

Machine policy applied: Jest `--maxWorkers=2`, scoped; T-1 and T-2 ran in parallel (disjoint folders) and serialised their Jest runs with an atomic `mkdir` lock in the session scratchpad.

## Task Execution History

### T-1 — Results tab Replication filter

| Field | Value |
|---|---|
| Final status | PASS (attempt 1 of 3) |
| Date | 2026-10-15 |
| Requirements | STD-R-4 (S-4.1 … S-4.5), §7 Compatibility |
| Skills | `angular-developer`, `tdd` (as listed) · effort medium |

**Attempt 1**
- Files (all `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/`): `services/programme-results-query-params.ts`, `services/programme-results-filter.service.ts`, `services/programme-results-filter.service.spec.ts`, `programme-results.component.ts`, `programme-results.component.html`, `programme-results.component.spec.ts` (≈ +245 / −15).
- Verification: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="programme-results|my-work-board"` → 12/12 suites, 476/476 tests. Lint: `npx eslint` unusable (ESLint 9, no flat config) → `npx ng lint --quiet --lint-file-patterns <programme-results ts/html>` → "All files pass linting."
- Reviewer: **PASS** — predicate correct incl. both-values = all; hydration whitelists `new`/`replicated` (`foo` → `[]`, `new,foo` → `['new']`); empty writes `null`; old links unchanged; My results board never reads/writes `replication`; S-4.1 asserts row ids.

**Implementer disclosures (verbatim summary of `Not Done / Assumptions`)** — judged disclosures, not outstanding scope:
- Six existing `toEqual` assertions on full `queryParams` objects in `programme-results.component.spec.ts` now include `replication: null` (forced by the new URL key per design §8.5). Deviation from "Done when: existing specs untouched" recorded here — accepted, nothing weakened (same precedent as `section: null`).
- Tests written first but never observed red.
- A row with no `isReplicated` flag counts as New (`toProgrammeResultRow` always sets it).
- Chips after Funding source, before Center.
- Replication control placed in its own popover row after "Created by" (2-column rows full) — to confirm at T-5 HITL.

**ADVISORY (4R, non-gating)**
1. RISK — "untouched" wording vs six edited assertions (recorded above).
2. READABILITY — control placement after "Created by" rather than directly after Funding source; confirm at T-5.
3. RELIABILITY — service test "S-4.3 unknown stored values are inert" sets `[]`, never an unknown value; `['foo']` would cover it.
4. READABILITY — component test "S-4.4 badge counts the replication chip" compares `activeFilterCount()` to `activeChips().length` (near-circular); an explicit count would pin it.
5. Reminder — `programme-results/CLAUDE.md` contract line needs `selectedReplication` / `?replication=` (already T-4 scope).

Decisions: none beyond the above. Issues: client ESLint 9 has no flat config — `npx eslint` from tasks.md cannot run as written.

### T-2 — Total General headline, composition bar, row/segment intent

| Field | Value |
|---|---|
| Status | `[~]` in progress — attempt 1 FAIL; rework paused on budget tripwire (see below) |
| Date | 2026-10-15 |
| Requirements | STD-R-1 (S-1.1, S-1.3), STD-R-2 (S-2.1 … S-2.6), STD-R-3 (S-3.5, emit side) |
| Skills | `angular-developer`, `tailwind-design-system`, `tdd` · effort medium. Deviation: `frontend-design` dropped (native buttons inside an existing card, styling governed by DD-4 + folder guide; no new visual language) |

**Attempt 1**
- Files (`dashboard-lab/components/program-overview/`): `program-overview.component.ts` (+≈33), `.html` (+≈60/−25), `.spec.ts` (+≈110/−35).
- Verification: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="program-overview.component.spec"` → 1/1 suite, 80/80 tests. Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint <ts> <html> <spec> --quiet` → exit 0. No `ng build`.
- Implementer disclosures: tests written after code (never red); existing loading test `animate-pulse` count 3 → 4 (new bar skeleton); existing "only Total General and Areas of Work KPI cards" exclusion list extended with `-bar`, `-dot-`, `-segment-`; segment aria-label "View N <label>"; no host handler until T-3; guide stale until T-4.
- Reviewer: **FAIL** (verbatim issue):
  1. **Discovered Issue:** The segment focus ring cannot be seen. The track `<div data-testid="overview-kpi-total-bar">` has `overflow-hidden`. Each segment is `h-full` and draws focus as `focus-visible:ring-2 focus-visible:ring-white/60`, which is an outer box-shadow. `overflow:hidden` clips the parts of that shadow above and below the bar and at both ends. Only the 2px gaps between segments can show any of it, and a single-segment bar (e.g. 0/7/0) shows none. jsdom tests cannot catch this, and T-5's visual check only covers contrast and the 6px width, not focus.
     * **Violated Rule:** `requirements.md` §7 NFR Accessibility: "focus ring visible on the purple card". Also S-2.4 "AND IT MUST still be a focusable … target", and `onecgiar-pr-client/CLAUDE.md` UI rule 4 ("Every interactive control has a visible focus ring").
     * **Remediation Suggestion:** Remove `overflow-hidden` from the track (segments are already `rounded-full`; widthPct + flex-shrink keep the bar inside). An inset ring is not a good alternative (white/60 vanishes on the white Replicated segment). Add a test asserting the track does not have `overflow-hidden`, and add "focus ring visible on a segment (Tab)" to T-5's screenshot checklist.
- Reviewer confirmed: headline r+n+p and tooltip; segment math/order/zero-drop/no divide-by-zero; skeleton; dot = segment color; `min-w-[6px]` buttons; emit for rows and segments; no `setActiveSection`/`aria-pressed` in KPI 1; "KPI 1 is a DIV" and heading-order tests untouched; both edited existing assertions legitimate.

**ADVISORY (4R, non-gating)**
- READABILITY — row aria-labels hard-coded in the template duplicate `TotalSegment.label`; one map keyed by kind would prevent drift.
- RISK — trailing `pi pi-arrow-right` follows design §8.3 verbatim but conflicts with client UI rule 21 ("Icons from @ng-icons/lucide only. No new primeicons") → spec-vs-constitution conflict, escalated to user.
- READABILITY — folder guide still describes the old behavior; do not commit T-2 without T-4 (client "Folder docs" rule).
- RELIABILITY — `:not([data-testid*="-bar"])` exclusion is broad; `-bar-` or exact ids would be tighter.

## Budget Tripwire — after T-1 + T-2 attempt 1

| Metric | Budget (design §11) | Actual so far |
|---|---|---|
| LOC (prod + tests) | ~350 for 5 tasks (prod ~150, tests ~200) | +416 / −50 for T-1 + T-2 only (T-3 ~60 still pending) |
| Review rounds | 1–2 | 1 per task so far; T-2 needs a 2nd |

Cause: tests dominate (T-1 specs ≈ +160, T-2 spec ≈ +110); T-1 also needed six existing-assertion edits; prod code is close to plan (~200 vs ~150). Escalated to user before T-2 rework / T-3.

**User decisions (2026-10-15, at tripwire gate):**
- Budget overrun accepted → continue T-2 rework, then T-3 → T-4 with normal gates.
- Row arrow: use Lucide `arrow-right` (client UI rule 21) instead of design §8.3's `pi-arrow-right` — recorded design deviation, applied in T-2 attempt 2.

### T-2 — attempt 2 (rework, effort high) → **PASS**

- Files: same three program-overview files. Track `div[data-testid=overview-kpi-total-bar]` loses `overflow-hidden` (card root keeps its own); rows' trailing `pi pi-arrow-right` → `<ng-icon name="lucideArrowRight" … aria-hidden="true">` with the same hover/focus opacity; `lucideArrowRight` added to `provideIcons`. +2 tests (track has no `overflow-hidden` and segment keeps `focus-visible:ring-2`; rows carry `ng-icon[name="lucideArrowRight"]`, no `.pi-arrow-right`).
- Verification: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="program-overview.component.spec"` → 1/1 suite, 82/82. `ESLINT_USE_FLAT_CONFIG=false npx eslint <3 files> --quiet` → no errors.
- Reviewer: **PASS** — FAIL #1 resolved; no ancestor between track and card root, card `p-[18px]` covers the 2px ring; `gap-[2px]` prevents neighbour overpaint; segments cannot overflow (TS widths sum 100 %, flex-shrink absorbs gaps, min-w floor ≤ 22px); Lucide deviation meets conditions; no regression of attempt-1 items.
- Leader spec edit: `tasks.md` T-5 step 3 added (Tab onto a segment incl. single-segment bar; ring visible) — per Reviewer remediation.
- ADVISORY: (RELIABILITY) the no-`overflow-hidden` test only proves class absence — T-5 must not close on Jest evidence; cover single-segment bar and the white Replicated segment. (READABILITY) guide still stale → T-4, same commit as T-2 per folder-docs rule.

T-2 final: **PASS on attempt 2 of 3.** Not committed (user commits; T-2 should ship with T-4's guide update).

### T-3 — Host navigation for total segments

| Field | Value |
|---|---|
| Final status | PASS (attempt 1 of 3) |
| Date | 2026-10-15 |
| Requirements | STD-R-3 (S-3.1 … S-3.4, S-3.5 regression), STD-R-1 (S-1.1 program-wide, S-1.2) , NFR no new HTTP |
| Skills | `angular-developer`, `tdd` · effort medium |

**Attempt 1**
- Files (`dashboard-lab/`): `dashboard-lab.component.ts` (+43/−5: `effectivePhaseLabel()` extracted from `onOverviewLink`; `onTotalSegment(kind)`; imports `BILATERAL_REVIEW_QUERY_PARAM_MAP`, `type TotalSegmentKind`), `.html` (+1 `(openTotalSegment)` binding), `.spec.ts` (+60, `describe('onTotalSegment …')` inside the OVW-T-1 navigation block).
- Red run: .ts/.html stashed, `-t onTotalSegment` → 6 failed / 80 skipped (`component.onTotalSegment is not a function`). A first red run was invalid (wrong describe block / fixture), disclosed and redone.
- Green: `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="dashboard-lab.component.spec"` → 86/86 (incl. existing `overviewTotalBreakdown` S-1.1/S-1.2 and `onOverviewLink` regressions). Lint `ESLINT_USE_FLAT_CONFIG=false npx eslint <ts + spec> --quiet` → clean. No `ng build`.
- Reviewer: **PASS** — extraction behavior-preserving (same 4-step fallback, same short-circuit); no `section` key (own queryParams, never calls `onOverviewLink`, AOW01 exact-match test); param names from both maps; `'pending'` valid status; route base identical to `onOverviewLink` (tasks.md's two-element form resolves to the same URL); `output<TotalSegmentKind>()` ↔ handler types match; no new service injection/call; S-3.3 computed-override sound for that instance.
- Implementer disclosures: `phase` omitted when label empty; pending phase = `String(effectiveVersionId())`, omitted when null; early return without initiative code; S-3.4 uses default fixture {0,0,0}.

**ADVISORY (4R, non-gating)**
- RELIABILITY — no spec covers the no-initiative-code early return.
- READABILITY — S-3.4 relies on the default {0,0,0} fixture (asserted, uncommented).
- RISK — pending link sends numeric `phase=<versionId>` vs label on Results links (per spec table); T-5 should confirm Bilateral review reads it.
- Housekeeping — `dashboard-lab/CLAUDE.md` not updated. Reviewer assumed T-4 covers it; **T-4 scope names only the program-overview and programme-results guides** → raised to the user as a scope question at the T-4 gate.

**User decision (2026-10-15, T-4 gate):** T-4 scope widened to also update `dashboard-lab/CLAUDE.md` (`onTotalSegment` note + `Verified:` re-stamp) — client folder-docs rule.

### T-4 — Component guides

| Field | Value |
|---|---|
| Final status | PASS (attempt 1 of 3) |
| Date | 2026-10-15 |
| Requirements | traceability for STD-R-1..4 |
| Skills | `cognitive-doc-design` · effort medium |
| Scope | widened by user decision to include `dashboard-lab/CLAUDE.md` (see above) |

**Attempt 1**
- Files (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/`): `dashboard-lab/components/program-overview/CLAUDE.md` (KPI 1 headline r+n+p status-5 program-wide; drill-down replaces "rows are section buttons"; composition-bar paragraph incl. no-`overflow-hidden` track; Lucide arrow deviation; section switch only in Filter popover / `?section=`), `programme-results/CLAUDE.md` (Replication filter contract bullet), `dashboard-lab/CLAUDE.md` ("Añadido 2026-10-15": `onTotalSegment`, `effectivePhaseLabel()`). `Verified:` re-stamped on line 3 in all three; no AGENTS.md twins exist.
- Verification: `grep -n "replicated + new only\|Total General rows are section buttons" <3 guides>` → no output. Phrase-family sweep: old-behavior wording survives only in the `Verified:` "prior:" history (head entry states the supersession); `dashboard-lab` line 153 (`overviewTotalBreakdown` inputs) still true.
- Reviewer: **PASS** — every new claim spot-checked against the working tree (ts/html/spec line refs); no contradicting sentence in the full guides; only the three guides touched; advisory block suppressed (< 50 lines).
- Disclosure: `program-overview` and `dashboard-lab` guides were already over the 120-line cap of `docs/COMPONENT-DOCS.md` before this task (not trimmed — out of scope).

### T-5 — Live parity + visual check (HITL)

| Field | Value |
|---|---|
| Status | evidence recorded — awaiting user sign-off |
| Date | 2026-10-15 |
| Environment | local client `localhost:4200` + local server (user-confirmed running), shared dev DB; read-only — only navigation clicks, no write buttons |
| Executor | Leader via `claude-in-chrome` (HITL task; no code written) |

**1. Parity — SP05, effective phase "Reporting 2026 - P25" (versionId 36).** Dev data, not prod (proposal evidence "Test SP05: 1 + 6 + 2"):

| Row | Overview | Destination | Destination count | Chips / state | Parity |
|---|---|---|---|---|---|
| Replicated | 1 | `/SP05/results?origin=W1/W2&replication=replicated&phase=Reporting 2026 - P25` | 1 result | Phase · Funding source: W1/W2 · Replication: Previously reported (no other chip) | ✅ |
| New | 6 | `/SP05/results?origin=W1/W2&replication=new&phase=Reporting 2026 - P25` | 6 results (5 Editing · 1 Submitted) | Phase · Funding source: W1/W2 · Replication: New (no other chip) | ✅ |
| Awaiting review | 2 | `/SP05/bilateral-review?phase=36` | Pending review 2 | "Pending review" pill `aria-pressed=true` | ✅ |

Headline 9 = 1 + 6 + 2; tooltip "Program-wide: W1/W2 replicated + W1/W2 new + W3/Bilateral awaiting review". No `section` key in either Results URL (S-3.1 AND IT MUST).
Observation: the Bilateral review tab drops `status=pending` from its URL after hydration (pending is its default/written-as-absent value); the filter is applied (pill pressed). Not a defect of this spec.

**2. Visual (desktop 1280px):**
- Rendered segment widths 76.2 / 457.5 / 152.5 px of a 690.8 px track (−4 px gaps) = 1/9 · 6/9 · 2/9 ✅ (S-2.1 rendered).
- Contrast (WCAG relative luminance, computed from rendered colours) vs gradient ends `#4a1d96` / `#793ce8`: white 11.01 / 5.79 · cyan-300 (`rgb(83,234,253)`) 7.63 / 4.02 · amber-300 (`rgb(255,210,48)`) 7.61 / 4.00 → all ≥ 3:1 ✅.
- **Delta reported (not hidden):** cyan-300 vs amber-300 luminance contrast = 1.00:1. Design §8.2 says colours were "chosen for ≥3:1 … vs each other"; that claim is false for this pair. Mitigations already in place: 2px gap between segments, distinct hues, each row carries count + label (information not colour-only, NFR). T-5 pass criterion (vs gradient ends) is met; flagged for user decision.
- Tiny segment (DOM harness probe: replicated forced to 0.5 % width): rendered 6.9 px ≥ 6 ✅ (S-2.4 real width), still a focusable `<button>`.
- Focus ring (keyboard Shift+Tab, `:focus-visible` true, box-shadow 2px white/60): visible around the white Replicated segment; single-segment probe (other segments hidden, cyan at 100 %): ring visible on all four sides, not clipped ✅ (T-5 step 3).
- Narrow: window resize did not take (viewport stayed 1280, maximized window) → fallback probe: card constrained to 320px (rendered 368 incl. padding/min): bar 325 px, segments 35.6 / 213.8 / 71.3 (11.1 / 66.7 / 22.2 %), last segment ends exactly at track right, card `scrollWidth` 343 < 368 → no overflow / horizontal scroll ✅. True ~360px-viewport screenshot not taken.

Screenshots (local, not committed): `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Xv8vMm\` — `screenshot-1792084951743-0.png` (card desktop), `-1792084978157-1.jpg` (Results New), `-1792085055267-2.jpg` (Bilateral pending), `-1792085118032-3.png` (focus ring white segment), `-1792085141071-4.png` (single-segment focus), `-1792085186837-6.png` (card at 320px).

**User sign-off (2026-10-15):** T-5 approved. Cyan-300 vs amber-300 1:1 luminance accepted as is (2px gap + distinct hue + count/label on every row). Execute-time spec correction: `design.md` §8.2 line 77 no longer claims "≥3:1 … vs each other"; now records the measured values and the accepted exception. Correction-closure sweep: `grep "each other"` over the spec folder → only design.md:77 (fixed) and this log.

T-5 final: **PASS (HITL, user-approved).**

## Summary

| Task | Result | Attempts |
|---|---|---|
| T-1 Results tab Replication filter | PASS | 1 |
| T-2 Total General headline, bar, row/segment intent | PASS | 2 (focus ring clipped → fixed; Lucide arrow per user) |
| T-3 Host navigation | PASS | 1 |
| T-4 Component guides (+ dashboard-lab guide, user-widened) | PASS | 1 |
| T-5 Live parity + visual (HITL) | PASS — user sign-off | — |

- Budget: tripwire fired after T-1 + T-2 (+416 / −50 LOC vs ~350 for 5 tasks, mostly tests); user accepted the overrun. Review rounds: T-2 needed 2.
- Spec deviations (all user-approved, recorded above): Lucide `lucideArrowRight` instead of `pi-arrow-right`; T-4 scope widened to `dashboard-lab/CLAUDE.md`; design §8.2 colour-vs-colour contrast claim corrected.
- Pending for `/akili-archive`: open advisories (T-1 #3/#4 test tightening, T-2 aria-label map / `-bar` exclusion, T-3 no-initiative-code spec); client ESLint 9 has no flat config (tasks.md `npx eslint` commands need `ESLINT_USE_FLAT_CONFIG=false`); CodeGraph re-index; flag the SR-164368 row-toggle removal to Nicoleta (design reversion table).
- Not committed — awaiting user instruction. T-2 must ship in the same commit as T-4's guides.
