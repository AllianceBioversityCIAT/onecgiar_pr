# Execution Log — IPSR Lead contact person save guard parity

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Depth · Mode | Lite · Bug |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Leader | Claude Code session (Opus 5.5) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers |
| Budget (design §11) | 2 tasks / ~60 LOC / 1 review round — tripwire: >2 tasks, >~120 LOC, or a 2nd rework round |
| Started | 2026-09-28 |

## Task Execution History

### `IPSR-LCG-T-1` — Regression tests for the save guard and tooltip binding (RED)

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-09-28
- **Skills / effort:** `angular-developer`, `tdd` · medium (per tasks.md, no deviation)
- **Requirements covered:** `IPSR-LCG-R-1` (1.1, 1.2), `IPSR-LCG-R-2` (2.1, 2.2, 2.3), `IPSR-LCG-R-3` (3.1), `IPSR-LCG-DD-2`

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/ipsr-general-information.component.spec.ts` (+160 / −2)
- **Cases added:** 1.1 (P25), 1.2 (P22), DD-2 (child undefined, P25), 2.1 P22/P25, 2.2 P22/P25, 2.3 picked (P25), 2.3 blank `'   '` (P25), 3.1 flag on / flag off (reads `properties.guidanceAsTooltip` off the `app-lead-contact-person-field` DebugElement).
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="ipsr-general-information.component.spec"` → **6 failed, 92 passed, 98 total** — the expected RED:
  - RED: 1.1 P25 (PATCH called 1×), DD-2 (PATCH called 1×), 2.1 P22 (PATCH 0×), 2.2 P22 (PATCH 0×), 3.1 on (expected `true`, received `undefined`), 3.1 off (expected `false`, received `undefined`).
  - GREEN (over-correction guards, expected): 1.2, 2.1 P25, 2.2 P25, 2.3 picked, 2.3 blank, and all pre-existing tests incl. `:495`.
- **Reviewer verdict:** `STATUS: PASS` — all T-1 rows + DD-2 implemented as specified with isolated per-test mock state (fresh mocks in top-level `beforeEach`); RED set matches tasks.md; neither disqualifier triggers; `:483` inversion correct, `:495` kept; tests will go GREEN under the design §8 guard (onSaveSection tests never call `detectChanges`, so the future `@ViewChild` does not overwrite the stub).

#### Test inversion record (tasks.md T-1 / proposal R1)

- **Before:** `should skip contact validation when isP22 is false` — `isP22` false (P25), typed unpicked `'invalid user'`, asserted `PATCHIpsrGeneralInfo` **was called**. It pinned the defect (P25 data-loss path).
- **After:** `IPSR-LCG-R-1 Scenario 1.1` — same field state plus child stub `queryCameFromHydration: false` and a seeded stored contact; asserts PATCH **not called**, `showContactError === true`, `hasValidContact === false`, stored `lead_contact_person` untouched. This is not a weakened test: it now asserts the requirement instead of the bug.

#### ADVISORY (4R, non-gating)

- READABILITY: 2.1 and 2.2 bodies are identical (same `queryCameFromHydration` mechanism per design); a one-line comment or `it.each` would prevent a future "duplicate" deletion.
- RELIABILITY: 2.1 checks the call, not the payload carrying the free-text name; `toHaveBeenCalledWith(expect.objectContaining(...))` would pin it cheaply.

- **Decisions:** `leadContactPersonField` assigned via `(component as any)` so the spec compiles before and after T-2.
- **Issues:** none.

### `IPSR-LCG-T-2` — Mirror the Results guard, bind the tooltip, fix docs (GREEN)

- **Final status:** Reviewer PASS (attempt 1 of 3) — task held at `[~]` until the manual HITL check (reproductions A/B) is reported by the user (tasks.md DoD: not marked passed without it)
- **Date:** 2026-09-28
- **Skills / effort:** `angular-developer` · medium (per tasks.md, no deviation)
- **Requirements covered:** `IPSR-LCG-R-1..3`, `IPSR-LCG-DD-1..3`

#### Attempt 1

- **Files changed:**
  - `…/ipsr-general-information/ipsr-general-information.component.ts` — `@ViewChild(LeadContactPersonFieldComponent) leadContactPersonField?`; guard `isP22() && searchQuery.trim() && !selectedUser` → `searchQuery.trim() && !selectedUser && !leadContactPersonField?.queryCameFromHydration` (+ `@akili-spec` rationale comment); `isLeadContactPersonRequired` doc comment corrected (no shared `validation_general_information_P25`; points to OQ-1)
  - `…/ipsr-general-information/ipsr-general-information.component.html` — `[guidanceAsTooltip]="guidanceAsTooltip()"`
  - `custom-fields/lead-contact-person-field/lead-contact-person-field.component.html` — comment only (IPSR opts in, Bilateral does not)
  - `custom-fields/lead-contact-person-field/CLAUDE.md` — `Verified:` re-stamped; Traps entry: Results and IPSR share one save-guard rule
- **Verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(ipsr-general-information.component|lead-contact-person-field.readonly).spec"` → **2 suites passed, 105/105 tests passed** (T-1 RED set now GREEN)
  - `npx ng lint --quiet` → All files pass linting
- **Reviewer verdict:** `STATUS: PASS` — guard textually identical to `rd-general-information.component.ts:390-394` with same side effects and no portfolio check; `@ViewChild`, import path and `CustomFieldsModule` wiring resolve; tooltip binds to the field's existing `@Input`; doc edits match T-2; scope exactly the four listed files; T-1 cases exercise the new condition.
- **ADVISORY:** none.

#### Pending — manual HITL check (no automated gate; requirements "Defect Classes")

- **A** (P25): type a name without picking → Save blocked with "not found"; stored contact kept after reload.
- **B** ("use this name anyway") → Save stores the free-text name.
- Status: **verified by the user** (santiago.sanchez@cgiar.org, 2026-09-28, local build) — A and B behave as expected. Budget overrun accepted implicitly with the go-ahead to push.

## Summary

Both tasks PASS on attempt 1. IPSR General information now applies the Results W1/W2 Lead contact person save guard on every portfolio (P25 no longer erases a stored contact mid-search; P22 saves accepted/loaded free-text names) and shows the 2026 guidance in the ⓘ tooltip. Client-only; no server, SQL or contract change. OQ-1 (green-check divergence) remains open for a separate spec.

#### Budget tripwire (design §11)

- Estimate ~60 LOC / tripwire ~120 LOC. Actual: **+196 / −10** across 5 files (spec.ts +160/−2; production ≈ 8 code lines; the rest are rationale comments and docs). Tasks 2/2, review rounds 1 per task — within budget. Overrun is test volume (7 case rows × portfolio variants) and comments, not production scope. Escalated to the user at the gate.
