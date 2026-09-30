# Execution — Bilateral External partners: optional, in Full metadata

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/contributors-partners-optional/` |
| Ticket | P2-3821 |
| Branch | `JuanGuzman-io/p2-3821-us-understanding`, fast-forwarded to `origin/performance-refactor` @ `f70d25801` (2026-09-29; the 11 new upstream commits touch neither `section-contributors/` nor `bilateral-result-creator/`) |
| Approval Mode | gated |
| Leader model | opus (T1) · Implementer: `akili-implementer` wrapper (T2) · Reviewer: `akili-reviewer` wrapper (T3) |
| Environment | `onecgiar-pr-client/src/environments/` copied from the main checkout; `node_modules` symlinked to the main checkout (same `package-lock.json`) |
| Baseline | `npx jest … section-contributors bilateral-result-creator` → 3 suites, 269 tests, all passing (pre-change) |
| Budget | 2 tasks · ~120 LOC · 1 review round per task |

## Task Execution History

### BCP-T-1 — Drop the tracker item; add the Full metadata gate; count partners in the hidden-fields note

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-09-29 |
| Attempts | 1 |
| Requirements covered | BIL-R-2, R-3, R-4, R-6, R-10 (`.ts`) · BIL-AC-1..7 |
| Skills | `angular-developer`, `tdd` (per task) · effort `medium` |

**Attempt 1**
- Files changed: `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts`, `…/section-contributors.component.spec.ts` (+148/−51 across both, comments included).
- Red run (pre-change code): 16 failed / 164 passed, all on behavioural assertions:
  - tracker key list `toEqual(['lead-center'(,'lead-project')])` received `+ 'external-partners'`, and `toBeUndefined()` received the item;
  - `showFullMetadata` cases: `TypeError: component.showFullMetadata is not a function` (allowed for the gate cases only);
  - hidden count `toBe(1)` received `0` (partners-only, box ticked, type 2), and `toBe(2)` received `1` (type 1, partners + linked answer).
- Falsifiers, executed against the post-change code and reverted:
  1. Restoring `external-partners` in `updateContributorsMds()` turned the tracker tests red on the key list.
  2. `showFullMetadata = computed(() => this.showLinkedResultQuestion())` turned the type-2/7 cases red.
- Implementer verification:
  - jest (section-contributors + bilateral-result-creator): 3 suites, 279 passed;
  - `tsc -p tsconfig.app.json --noEmit`: clean;
  - `ng lint --quiet`: all pass;
  - `readonly.spec.ts` (T-2 consumer): 23/23 passed.
- Evidence re-run (Leader-inline, non-author): **VERIFIED**. Same jest result (3 suites / 279 passed), `tsc` exit 0, `ng lint --quiet` "All files pass linting."
- Reviewer verdict: **PASS** (`akili-reviewer`, lens checklist). The diff does what BCP-T-1 asks. No `external-partners` item is published in any state; `showFullMetadata` has no type rule; the hidden count is the linked count plus the partner count; the payload, hydration and handlers are untouched; the payload specs were not edited (the disqualifier does not apply).
- runtime events: none

**ADVISORY (4R lens, non-gating)**
- READABILITY: the doc comment above `hiddenFieldsWithValues` (`.ts:381-390`) still says the note "stays at 0" for types 2/7. Only the linked part is 0 there now.
- READABILITY: the nested ternary for the linked count could be a small helper. Optional.
- RELIABILITY: keeping `updateContributorsMds()` in the load-failure handler is correct; removing it would be an unrequested behaviour change.
- RISK: `section-contributors/CLAUDE.md` still says `external-partners` is published to the tracker (lines 28-30, 93, 117, and the P2-3443 🛑 item). The package convention requires updating it in the same commit.

**Decisions made**
- The branch was fast-forwarded to `origin/performance-refactor` (`f70d25801`) instead of creating a new branch. It was unpushed and already an ancestor, so this is equivalent to step 0.
- **Commit deferred to BCP-T-2.** The package convention requires the `CLAUDE.md` update in the same commit as the code change, and T-2 owns `CLAUDE.md` and carries the commit done-criterion. T-1's changes stay uncommitted until T-2 closes.
- **Forward pointer → BCP-T-2:** the `CLAUDE.md` rewrite must also cover the P2-3443 🛑 item that says "if persistence breaks, take the item out again", which a later reader could use to restore the item.

**Issues encountered:** none. A bare `npx eslint <files>` fails (no flat config at the client root); `ng lint` is the contract command and passed.

**Final verification:** 3 suites / 279 tests passing · tsc clean · lint clean.

### BCP-T-2 — Move the partner block into Full metadata in the template; real-template spec; docs

**Attempt 1 — Reviewer FAIL**
- Files changed:
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html`
  - `…/section-contributors.readonly.spec.ts`
  - `…/section-contributors/CLAUDE.md`
- Red run (pre-change `.html`):
  - "absent for type 1/2 while collapsed" failed with `expect(received).toThrow()`, received "function did not throw";
  - "no required marker / no red hint" failed with `.fch_required` `toBeNull()`, received `<span class="fch_required">Required</span>`;
  - the other 26 cases passed.
- Falsifiers, executed and reverted:
  - (a) block back inside `@if (showLinkedResultQuestion())`: "present for type 2" went red, because `pickerFor` threw "is not rendered at all";
  - (b) block left in Block 1: "absent while collapsed" went red, because the function did not throw;
  - (c) centres banner inside Full metadata: "banner while collapsed" went red, because `toBeTruthy()` received null.
- Implementer verification:
  - section-contributors: 2 suites / 186 passed;
  - `ng lint --quiet`: all pass;
  - `tsc --noEmit`: clean.
- Evidence re-run (Leader-inline): **VERIFIED**.
  - section-contributors + bilateral-result-creator: 3 suites / 285 passed;
  - `tsc` exit 0;
  - lint all pass.
- Template type-check: `tsc --noEmit` does not type-check Angular templates, which the Implementer flagged. The Leader closed the gap after the review: `npx ng build --configuration development` passed ("Application bundle generation complete", exit 0; output went to the scratchpad, not the tree).
- Not Done / Assumptions (Implementer):
  - The manual visual check (step 4) is deferred to the Leader/user HITL pause by design.
  - Adjacent `CLAUDE.md` sentences made stale by this change were corrected: the "Qué es" summary, the test counts and the banner adjacency note. The Reviewer judged these within the step-3 / BIL-R-10 deliverable.
- Reviewer verdict: **FAIL** (verbatim):
  1. **Discovered Issue:** In the Contrato → Progreso / Submit paragraph, `section-contributors/CLAUDE.md` still says "Los tres ítems de `partners` **sí** siguen contando." The three were `lead-center`, `lead-project` and `external-partners`. After T-1, `section-contributors.component.ts:735-747` publishes only `lead-center`, plus `lead-project` when the result has a lead project. So "three" again implies that External partners counts toward the Submit gate. The same paragraph, a few lines earlier, says it does not.
     - **Violated Rule:** `requirements.md` BIL-R-10: "Comments and copy that describe External partners as mandatory … SHOULD be updated to cite this decision (P2-3821), so the next reader does not restore the requirement." Also the tasks.md BCP-T-2 step 3 intent, "so they no longer state that `external-partners` is published to the tracker", and the brief's check that "`CLAUDE.md` is accurate".
     - **Remediation Suggestion:** Replace it with something like "Los ítems de `partners` (`lead-center`, y `lead-project` cuando hay proyecto líder) **sí** siguen contando; `external-partners` ya no (P2-3821)." This is a doc-only change. No re-test is needed.
- ADVISORY (non-gating):
  - RISK: z-index nesting. `sc-block--partners` (20) now sits inside the Full metadata `.sc-block` (10), above the linked "Select a result" picker. When that picker opens upward (P2-3737), the partner chips could paint over its list (a P2-3776-style defect). jsdom cannot detect this, so it was added to the HITL visual check.
  - RELIABILITY: the collapsed-absent cases rely on the default `noExternalPartners()` being false. An extra `not.toContain('This result has no external partners')` assertion would cover the checkbox too.
  - READABILITY: the `CLAUDE.md` `isStatic` trap says the checkbox has a hard `[isStatic]="true"` ("línea 168"). The template binds `!readOnly()`. That was stale before this task; recorded, not absorbed (advisories never widen a task).
  - RELIABILITY: run `ng build` before the commit. Done by the Leader: it passed.
- runtime events: none
- Leader adjudication: the FAIL is in scope (step 3 / BIL-R-10) and consumes attempt 1. Attempt 2 is limited to the one sentence, at effort `high` (one-level bump).

**Attempt 2 — Reviewer PASS**
- Files changed: `…/section-contributors/CLAUDE.md` only, one sentence:
  - before: "Los tres ítems de `partners` **sí** siguen contando."
  - after: "Los ítems de `partners` (`lead-center`, y `lead-project` cuando hay proyecto líder) **sí** siguen contando; `external-partners` ya no (P2-3821)."
- Evidence re-run (Leader-inline): **VERIFIED**.
  - The full T-2 diff before and after attempt 2 differs only in that sentence (plus hunk offsets).
  - `grep -n "tres ítems\|external-partners" CLAUDE.md` → lines 33, 45, 102, 133, 240. All say the item is not tracked.
  - The attempt-1 jest / tsc / lint / `ng build` results stand, because no code or spec file changed.
- Reviewer verdict: **PASS** (`akili-reviewer`, effort high). The new sentence matches `updateContributorsMds()`. A whole-file sweep found no remaining claim that External partners is tracked, required or counted. The P2-3443 forward pointer from T-1 is covered at lines 133-148.
- runtime events: none

**Status after attempt 2:** conformance PASS. The task stays `[~]` until the user confirms the manual visual check (done criterion; `Not Done`: step 4 HITL).

## Budget tripwire: BCP-T-2

- Expected: 1 review round per task. Actual for T-2: **2** (attempt 1 FAIL, attempt 2 PASS). T-1 used 1. Tasks: 2 of 2 as planned.
- Cause: a missed stale sentence in `CLAUDE.md`, with the rework limited to that doc. No code impact.
- Escalated to the user at the T-2 HITL pause, together with the visual check.

**Visual check (step 4, HITL): confirmed by the user ("Todo bien", 2026-09-29)**

The Leader drove the check in Chrome at `localhost:4200`, with the local server on `:3400` running from this worktree. No saves were made; the Full metadata toggle was left collapsed.

| Result | Type · status | Collapsed | Expanded |
|---|---|---|---|
| #9503 | Innovation Use · Pending Review (read-only) | No partner block, no hidden-fields note, "Section complete", rail 5/5 | Intro line, disabled checkbox, selector with no Required marker or hint, no linked question |
| #9545 | Innovation Use · Editing | "1 hidden field has values…" (partner count for type 2); Submit enabled | Partner selector + chips; no Required marker; no linked question |
| #9563 | Capacity Sharing · Editing | "1 hidden field…" (box ticked) | Checkbox ticked, then the linked question underneath |

- **Observation, not a defect of this change:** #9545 chips read "89" and "88". Those institution ids are absent from the partner catalogue (9,253 loaded), so `getPartnerDisplayName` falls back to the id. The chip markup is unchanged.
- **Observation (cosmetic, accepted by the user):** the intro line sits tight against the checkbox.
- **Not verified:** partner chips overlapping an upward-opening "Select a result" list (Reviewer ADVISORY). No IITA result that isn't type 2/7 had partners selected, and making one would have required editing data. The user accepted the check without it.
- A Policy result was replaced by #9563, because the IITA list has no Policy result. The linked-question type rule is the same for every type other than 2/7.

**Final status: PASS** (2 attempts). Requirements covered: BIL-R-1, R-2, R-5, R-6, R-10 · BIL-AC-3, 4, 8, 9.

## Summary

| Task | Status | Attempts | Reviewer |
|---|---|---|---|
| BCP-T-1 | PASS | 1 | PASS |
| BCP-T-2 | PASS | 2 | FAIL (stale `CLAUDE.md` sentence), then PASS |

- Final verification:
  - jest (section-contributors + bilateral-result-creator): 3 suites / 285 passing;
  - `tsc` clean;
  - `ng lint` clean;
  - `ng build --configuration development` passes;
  - visual check confirmed by the user.
- Budget: 2/2 tasks, 3 review rounds against 2 expected (the tripwire was reported to the user at the T-2 pause). LOC over the ~120 estimate, mostly in specs and `CLAUDE.md` prose.
- Open items for `/akili-archive`:
  - the stale `isStatic` note in `section-contributors/CLAUDE.md`;
  - the `hiddenFieldsWithValues` doc comment ("stays at 0");
  - the untested z-index case;
  - partner ids 88/89 missing from the catalogue on the test data.
