# Execution Log — IPSR empty-state check counts unsaved rows

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/ipsr-empty-state-active-check/` |
| Depth · Mode | Lite · Bug |
| Approval Mode | gated |
| Budget | 6 tasks / ~110 LOC / 3 review rounds (design §11, revised after Pivot 2 2026-09-28 — originally 2 tasks / ~30 LOC / 1 round) |
| Leader model | Sonnet 5 (registry recommends `opus` for T1 — user notified, continuing on Sonnet per default) |

## 2. Task Execution History

### `IPSR-ESC-T-1` — Regression tests for the three affected files (RED)

- **Final status:** PASS
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`, `tdd` (as recommended by tasks.md)
- **Effort:** medium

**Attempt 1:**

- **Files changed:**
  - `onecgiar-pr-client/.../step-n1/step-n1.component.spec.ts` — +8 lines (1 new case)
  - `onecgiar-pr-client/.../step-n1/components/step-n1-experts/step-n1-experts.component.spec.ts` — +8 lines (1 new case)
  - `onecgiar-pr-client/.../step-n3/components/step-n3-current-use/step-n3-current-use.component.spec.ts` — +7 lines (1 new case)
- **Implementer verification:**
  - Command: `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - Result: `Test Suites: 3 failed, 3 total / Tests: 3 failed, 58 passed, 61 total` — the 3 failures are exactly the 3 new cases (`Expected: 1, Received: 0` each), all 58 pre-existing tests stayed green. This is the correct, expected RED per task definition.
- **Reviewer verdict:** PASS
  - Summary: all three new cases match the tasks.md fixture table exactly (readOnly=false, specified list/attr, expect 1); `is_active` omitted by plain omission (not explicit `undefined`); no existing test modified; no production `.ts` file touched; RED confirmed as the correct outcome for this task. Diff-only-additions, under 50 lines — single-pass review, no ADVISORY block.
- **ADVISORY findings:** none.

**Requirements covered:** `IPSR-ESC-R-1` scenario 1.1 (regression scaffolding across all three affected surfaces: Facilitators, Experts, Actors/Organizations/Other).

**Decisions made:** none beyond the spec — Implementer followed tasks.md fixtures verbatim.

**Issues encountered:** none.

**Final verification result:** 3/3 new cases RED as expected; 58/58 pre-existing cases green; task complete.

### `IPSR-ESC-T-2` — Apply the `!= false` fix in the three files (GREEN)

- **Final status:** `[~]` — code change reviewed PASS, task held open pending outstanding manual HITL check (see below)
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`
- **Effort:** low

**Attempt 1:**

- **Files changed:**
  - `onecgiar-pr-client/.../step-n1/step-n1.component.ts:61` — `item.is_active` → `item.is_active != false`
  - `onecgiar-pr-client/.../step-n1/components/step-n1-experts/step-n1-experts.component.ts:37` — same change
  - `onecgiar-pr-client/.../step-n3/components/step-n3-current-use/step-n3-current-use.component.ts:40` — same change
  - readOnly branch (`item[attr]`) byte-identical/untouched in all three files.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"` → `Test Suites: 3 passed, 3 total / Tests: 61 passed, 61 total`
  - `npx ng lint --quiet` → `All files pass linting.`
- **Reviewer verdict:** PASS (spec conformance)
  - Summary: exactly one line changed per file matching design.md §8's Before/After table and DD-1's per-file approach; readOnly branch untouched; no other production file touched; 61/61 green covers R-1 scenarios 1.1, 1.2, 1.3. No ADVISORY findings (diff too small to warrant the block).
- **Not Done / Assumptions (Implementer report):** the manual HITL browser check named in tasks.md's `IPSR-ESC-T-2` Definition of Done — reproduce scenario 1.1 (add a Facilitator row in IPSR Step 1, fill it in, confirm "No facilitators provided" no longer shows; same for Experts and Step 3 Actors/Organizations/Other) — was explicitly not performed by the Implementer or the Reviewer (out of scope for both by design).

**Leader disposition:** per `/akili-execute` Step 2.3 rule 0, an outstanding Not Done item holds the task open even after a Reviewer PASS. This one specifically needs a live editable IPSR package and an authenticated session — genuinely HITL, matching the requirement doc's own "Defect Classes" row ("No automated gate in this spec... Substitute: manual check at the HITL pause"). Probed cheaply first: confirmed a local client dev server is reachable at `localhost:4200` (HTTP 200), but the check itself needs a specific editable package + login, which the Leader will not attempt without the user. Task left at `[~]`; escalating to the user rather than closing silently or attempting an authenticated browser flow unprompted.

**Requirements covered:** `IPSR-ESC-R-1` (code-level: all scenarios 1.1–1.3 via automated tests); the DOM-render half of scenario 1.1 is still unverified pending the manual check.

**Decisions made:** none beyond the spec — Implementer followed the design.md table verbatim.

**Issues encountered:** manual HITL check pending (see above).

**Final verification result:** code change PASS (automated); task held at `[~]` pending manual verification.

## Pivot Record: `IPSR-ESC-T-2`

- **Date:** 2026-09-28
- **Discovered by:** Leader, while investigating the user's report during the pending manual-check discussion (not by an Implementer/Reviewer inside the rework loop).
- **Trigger:** the user reported that after the T-2 fix, "No actors provided" / "No organizations provided" / "No facilitators provided" effectively never show, because empty fields for Actors/Organizations/Facilitators are always visible.
- **Root cause found:** `getSectionInformation()` in `step-n1.component.ts:110-127` and `step-n3.component.ts:82-87` unconditionally pushes a blank placeholder row (`new ExpertWorkshopOrganized()`, `new Actor()`/`new ActorN3()`, `new Organization()`/`new OrganizationN3()`) whenever the corresponding array's length is 0 — on initial load AND after every save (`onSaveSection` → PATCH → `.subscribe(() => this.getSectionInformation())`). That placeholder's `is_active` is `undefined`, structurally identical to a genuine unsaved user row. Before this spec's fix, that placeholder was correctly excluded (old `item.is_active` truthy filter), so the empty-state text showed correctly (if inconsistently alongside a visible-but-untyped row). After the approved `is_active != false` fix, the placeholder now also counts as "present," so the empty state effectively never shows again once a section has been saved once.
- **Scope of the actual defect** (traced every `hasElementsWithId` call site in the three in-scope files):

  | List | File | Auto-pushed blank placeholder? | Needs more than `is_active != false`? |
  |---|---|---|---|
  | Facilitators (`result_ip_expert_workshop_organized`) | `step-n1.component.ts` | Yes | Yes |
  | Experts (`experts`) | `step-n1-experts.component.ts` | No | No — current fix stands unchanged |
  | Actors | `step-n3-current-use.component.ts` | Yes | Yes |
  | Organizations | `step-n3-current-use.component.ts` | Yes | Yes |
  | Other quantitative measures | `step-n3-current-use.component.ts` | No | No — current fix stands unchanged |

- **Alternatives considered (presented to user):**
  1. Accept as-is (matches the literal approved requirement) — rejected by user.
  2. Check for real, user-entered data in addition to `is_active != false` (chosen).
  3. Remove the auto-push-blank-row behavior entirely — rejected as out of scope (bigger UX change across 4+ sites, not requested).
- **Revised technical direction (approved by user 2026-09-28):** add an optional third parameter `significantFields?: string[]` to `hasElementsWithId(list, attr, significantFields?)`. Edit-mode branch becomes: `item.is_active != false && (!significantFields || significantFields.some(f => !!item[f]))`. Only passed at the 3 affected template call sites, using each row's primary/gating field:
  - Facilitators: `['first_name', 'last_name', 'email', 'workshop_role']`
  - Actors: `['actor_type_id']`
  - Organizations: `['institution_types_id']`

  Experts and Other quantitative measures call sites are left unchanged (no third argument → identical behavior to the already-reviewed T-2 fix).
- **No ADR affected** — this is a component-level display-logic amendment, not an architecture decision.
- **Correction closure (two-direction sweep):** performed after `requirements.md`/`design.md`/`tasks.md` were revised. Forward grep (`2 tasks|~30 LOC|1 review round|Budget: 2`) found one stale reference in `execution.md`'s own Document Control table — updated to the revised budget. Backward grep (`IPSR-ESC-R-1`, `proposal.md`) found no doc asserting R-1 as the complete/sole requirement; `proposal.md`'s pre-pivot description is left as historical context, pointed to by the new Pivot callout in `requirements.md` §2. Grep for `three files` / `the three` / `all three` across the spec folder confirmed every remaining occurrence still accurately describes `IPSR-ESC-R-1`/T-1/T-2 specifically, not the spec's current overall completeness.

### `IPSR-ESC-T-3` — Regression tests for the blank-placeholder-row gap (RED)

- **Final status:** PASS
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`, `tdd`
- **Effort:** medium

**Attempt 1:**

- **Files changed:**
  - `onecgiar-pr-client/.../step-n1/step-n1.component.spec.ts` — +2 cases (Facilitators: blank placeholder → 0, filled → 1)
  - `onecgiar-pr-client/.../step-n3/components/step-n3-current-use/step-n3-current-use.component.spec.ts` — +4 cases (Actors + Organizations: blank placeholder → 0, filled → 1, each)
- **Implementer verification:**
  - Command: `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"`
  - Result: `Test Suites: 2 failed, 1 passed, 3 total / Tests: 3 failed, 64 passed, 67 total` — exactly the 3 "expect 0" cases (Facilitators, Actors, Organizations blank-placeholder) RED; the 3 "expect 1" cases and all 61 pre-existing cases (including T-1's) green, as expected.
- **Reviewer verdict:** PASS
  - Summary: all 6 cases match tasks.md's `IPSR-ESC-T-3` table exactly; no existing test modified; `step-n1-experts.component.spec.ts` correctly left untouched (R-2 scenario 2.3); no production file touched; RED/GREEN split matches the task's own disqualifier note exactly.
- **ADVISORY findings:** none.

**Requirements covered:** `IPSR-ESC-R-2` scenarios 2.1 and 2.2, regression scaffolding for Facilitators/Actors/Organizations.

**Decisions made:** none beyond the spec.

**Issues encountered:** none.

**Final verification result:** 3/3 "expect 0" cases RED as expected; 64/64 other cases green; task complete.

### `IPSR-ESC-T-4` — Add `significantFields` parameter and pass it at the 3 call sites (GREEN)

- **Final status:** `[~]` — code change reviewed PASS, task held open pending the same outstanding manual HITL check as T-2 (now covering R-2 too)
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`
- **Effort:** medium

**Attempt 1:**

- **Files changed:**
  - `step-n1.component.ts:60` — signature/body updated to design.md §8.1 (folds the already-approved T-2 `!= false` change with the new `significantFields` gate, since this file's edit-mode branch had not yet had T-2 applied when this task started)
  - `step-n3-current-use.component.ts:39` — same
  - `step-n1.component.html:74` (Facilitators) — 3rd arg `['first_name', 'last_name', 'email', 'workshop_role']`
  - `step-n3-current-use.component.html:90` (Actors) — 3rd arg `['actor_type_id']`
  - `step-n3-current-use.component.html:145` (Organizations) — 3rd arg `['institution_types_id']`
  - Confirmed untouched: `step-n1-experts.component.ts`/`.html` (Experts — only the pre-existing T-2 `!= false` change present, no 3rd arg); `step-n3-current-use.component.html:175` (Other quantitative measures — still 2-arg); `readOnly` branch in both `.ts` files.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="(step-n1|step-n1-experts|step-n3-current-use).component.spec"` → `Test Suites: 3 passed, 3 total / Tests: 67 passed, 67 total`
  - `npx ng lint --quiet` → `All files pass linting.`
- **Reviewer verdict:** PASS (spec conformance)
  - Summary: method bodies match design.md §8.1 character-for-character; exactly 3 template call sites carry `significantFields`, matching §8.2's table; Experts and Other-quantitative-measures call sites confirmed untouched (R-2 scenario 2.3); `readOnly` branch untouched; 67/67 green covers R-1 and R-2 scenarios 1.1-1.3 and 2.1-2.3; lint clean; no ADVISORY findings.
- **Not Done / Assumptions (Implementer report):** the manual HITL browser check remains undone (same as T-2) — now also covering: (1) filling in the primary field of Facilitators/Actors/Organizations makes the empty state disappear; (2) an auto-added blank placeholder row (after saving a section down to zero real rows) still shows the empty state; (3) Experts and Other quantitative measures behavior is unchanged.

**Leader disposition:** same rule as T-2 (Step 2.3 rule 0) — task held at `[~]` pending the manual check, not marked `[x]` despite Reviewer PASS.

**Requirements covered:** `IPSR-ESC-R-1` (all scenarios, code-level) and `IPSR-ESC-R-2` (all scenarios, code-level). DOM-render verification for both still pending the manual check.

**Decisions made:** the Implementer combined T-2's `!= false` change and T-4's `significantFields` change into one edit per `.ts` file where T-2's part had not yet landed in that file at task start — both changes are within design.md's prescribed final body, so no scope deviation.

**Issues encountered:** none beyond the still-pending manual HITL check (unchanged from T-2's entry).

**Final verification result:** code change PASS (automated, 67/67 green, lint clean); task held at `[~]` pending manual verification, same as T-2.

## 3. Summary

**Superseded by Pivot Record 2 below** — a second gap was found during manual verification, widening scope to a 4th file (`innovation-use-form.component.ts`) via `IPSR-ESC-R-3`/`T-5`/`T-6`. This summary paragraph described state after `T-4`; see the task list / dependency graph in `tasks.md` for current status of all 6 tasks.

## Pivot Record 2: `shared/components/innovation-use-form/innovation-use-form.component.ts`

- **Date:** 2026-09-28
- **Discovered by:** Leader, during the user's manual verification. User's screenshots of an empty Actor/Organization row with no "No … provided" message did not match any of the 3 files fixed in this spec. Diagnosed live via `window.ng.getComponent` DOM inspection in the user's browser (per `onecgiar-pr-client/CLAUDE.md` §9's documented pattern) — found the mounted component tree includes `app-innovation-use-form`, not `app-step-n3-current-use` or the assumed `app-step-n1-innovaton-use`.
- **Root cause:** `shared/components/innovation-use-form/innovation-use-form.component.ts:507-511` — the component this whole spec's `!= false` pattern was originally copied FROM (cited in `proposal.md`/`requirements.md`/`design.md` as "the reference implementation, already correct") — has the exact same blank-placeholder-row gap `IPSR-ESC-R-2` describes, and was never audited for it because it was assumed correct by definition. It is embedded in IPSR Step 1 (`step-n1.component.html:30`, `<app-innovation-use-form [body]="this.ipsrStep1Body" ... [isIpsr]="true">`, section title "Targeted innovation use") and renders `ipsrStep1Body.innovatonUse.{actors,organization,measures}` — the same arrays `step-n1.component.ts`'s `onSectionInformation()` (lines 110-127, Pivot Record 1) auto-populates with a blank placeholder when empty.
- **Blast radius check:** this component is also used by `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/` (Results module, "Innovation use" result type) — confirmed via grep that this second usage does NOT auto-push blank rows, so passing `significantFields` at these call sites is safe there too (an opt-in parameter; behavior only changes where a value is actually missing, which is the correct universal behavior).
- **`innovation_use_2030.*` (the 2030-projection lists rendered by the same component) are NOT affected** — `step-n1.component.ts` never auto-populates those arrays — so those call sites are left untouched.
- **Extra wrinkle — Measures:** `step-n1.component.ts:110-114`'s auto-pushed blank measure pre-fills `unit_of_measure = '# of hectares'` (a real, non-empty default string), so `unit_of_measure` cannot be the significant field for this list (it would always read as "filled"). `quantity` (which stays `null` on the placeholder) is used instead.
- **Approved revised direction (user, 2026-09-28):** add `significantFields?: string[]` to `innovation-use-form.component.ts`'s `hasElementsWithId` (preserving its existing `Array.isArray` and `item &&` guards), and pass it at exactly 3 of its "current use" call sites:
  - Actors (`innovation-use-form.component.html:249`): `['actor_type_id']`
  - Organizations (`innovation-use-form.component.html:333`): `['institution_types_id']`
  - Other quantitative measures (`innovation-use-form.component.html:369`): `['quantity']`
  The 3 "2030" call sites (lines 641, 726, 766) are left untouched.
- **No ADR affected.**
- **Correction closure (two-direction sweep):** performed after `requirements.md`/`design.md`/`tasks.md` were revised. Forward grep (`4 tasks|~75 LOC|2 review rounds|Budget: 4`) found the Document Control table and the old T-1-T-4 completion summary paragraph both needing an update — both updated to reflect the 6-task scope and Pivot 2.

### `IPSR-ESC-T-5` — Regression tests for `innovation-use-form.component.ts` (RED)

- **Final status:** PASS
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`, `tdd`
- **Effort:** medium

**Attempt 1:**

- **Files changed:** `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.spec.ts` — +6 cases (Actors, Organizations, Measures: blank placeholder → 0, filled → 1, each)
- **Implementer verification:**
  - Command: `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-use-form.component.spec"`
  - Result: `Test Suites: 1 failed, 1 total / Tests: 3 failed, 143 passed, 146 total` — exactly the 3 "expect 0" cases RED; all else green, including the 3 "expect 1" cases and all 143 pre-existing tests.
- **Reviewer verdict:** PASS
  - Summary: all 6 cases match tasks.md's table exactly, including the Measures fixture correctly mirroring the real auto-pushed placeholder (`unit_of_measure` pre-filled, `quantity` unset); no existing test modified; no production file touched; no 2030/Results-module file touched; RED/GREEN split correct.
- **ADVISORY findings:** none.

**Requirements covered:** `IPSR-ESC-R-3` scenarios 3.1 and 3.2, regression scaffolding.

**Decisions made:** none beyond the spec.

**Issues encountered:** none.

**Final verification result:** 3/3 "expect 0" cases RED as expected; 143/143 other cases green; task complete.

### `IPSR-ESC-T-6` — Add `significantFields` to `innovation-use-form.component.ts` (GREEN)

- **Final status:** `[~]` — code change reviewed PASS, task held open pending the same outstanding manual HITL check as T-2/T-4 (now also covering R-3)
- **Date:** 2026-09-28
- **Attempts:** 1
- **Skills used:** `angular-developer`
- **Effort:** medium

**Attempt 1:**

- **Files changed:**
  - `innovation-use-form.component.ts:507` — signature/body per design.md §8.3
  - `innovation-use-form.component.html:249` (Actors) — 3rd arg `['actor_type_id']`
  - `innovation-use-form.component.html:333` (Organizations) — 3rd arg `['institution_types_id']`
  - `innovation-use-form.component.html:369` (Measures) — 3rd arg `['quantity']`
  - Confirmed untouched: the 3 "2030" call sites (~641/726/766); any file under `rd-result-types-pages/innovation-use-info/`; the `readOnly` branch and `Array.isArray`/`item &&` guards.
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-use-form.component.spec"` → `Test Suites: 1 passed, 1 total / Tests: 146 passed, 146 total`
  - `npx ng lint --quiet` → `All files pass linting.`
- **Reviewer verdict:** PASS (spec conformance)
  - Summary: method matches design.md §8.3 character-for-character with guards preserved; exactly 3 call sites carry `significantFields` matching the table (Measures correctly uses `quantity`, not `unit_of_measure`); 2030 call sites and Results-module usage confirmed untouched; readOnly branch untouched; 146/146 green covers R-3 scenarios 3.1-3.3; lint clean; no ADVISORY findings.
- **Not Done / Assumptions (Implementer report):** the manual HITL browser check remains undone — now also covering: in IPSR Step 1's "Targeted innovation use" section, an empty Actor/Organization/Measures row (Measures: Quantity empty, even if Unit of measure already reads "# of hectares") shows the empty state; filling the primary field makes it disappear.

**Leader disposition:** same rule as T-2/T-4 — task held at `[~]` pending the manual check, not marked `[x]` despite Reviewer PASS.

**Requirements covered:** `IPSR-ESC-R-3` (all scenarios, code-level). DOM-render verification still pending the manual check.

**Decisions made:** none beyond the spec.

**Issues encountered:** none beyond the still-pending manual HITL check.

**Final verification result:** code change PASS (automated, 146/146 green, lint clean); task held at `[~]` pending manual verification.

## 4. Summary (supersedes §3 above)

All 6 tasks across 3 Pivots PASSed code review, each on first attempt. `T-1`, `T-3`, `T-5` (regression tests) are fully `[x]`. `T-2`, `T-4`, `T-6` (the actual fixes, across 4 production files: `step-n1.component.ts`, `step-n3-current-use.component.ts`, `step-n1-experts.component.ts` unchanged from its original fix, and `innovation-use-form.component.ts`) are held at `[~]` — all reviewed and correct, each with the same outstanding manual HITL browser check (no automated gate exists for DOM-render verification). No commits were made at any point. All 146+67+... test suites touched by this spec are green; `ng lint --quiet` clean throughout. **Manual HITL check: PASSED (2026-09-28, user-confirmed).** User verified on their local dev server (fresh rebuild) that "Targeted innovation use" Actors/Organizations/Measures now behave correctly — reported "funciona perfecto". `T-2`, `T-4`, `T-6` are flipped to `[x]`. Spec complete — all 6 tasks PASSed, no HALTs, no unresolved Pivots. 3 Pivots recorded (see above) — the spec grew from 3 files / ~30 LOC to 4 files / ~110 LOC across the original scope plus 2 sibling components discovered during manual verification, each confirmed with the user before implementation.
