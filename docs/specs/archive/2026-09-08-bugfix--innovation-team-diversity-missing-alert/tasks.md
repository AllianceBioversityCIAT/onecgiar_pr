# Module Spec — Tasks: Innovation Team Diversity question never counted as missing

## 1. Scope of this task list

- **Module / feature:** `results` — `innovation-team-diversity` (bugfix)
- **Linked spec:** `docs/specs/bugfix/innovation-team-diversity-missing-alert/requirements.md` + `design.md`
- **Depth:** Lite · **Mode:** Bug
- **Owner / driver:** result submitter-facing bug
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (`ITD-OQ-1` — resolved in `design.md` §1, no free-text follow-up branch exists)
- [x] No conflicting in-flight spec touching `innovation-team-diversity/` (checked `docs/specs/results/`, `docs/specs/bugfix/` — none found)
- [x] No migration involved — `migration:check` unaffected

---

## 3. Task list

### `ITD-T-1` — Add completeness tracking to Innovation team diversity question [x]

- **Type:** `client`, `tests`
- **Description:** In `InnovationTeamDiversityComponent`, add an `isComplete` getter that returns `!!this.options?.innovation_team_diversity?.['radioButtonValue']`. In `innovation-team-diversity.component.html`, append `<div appFeedbackValidation labelText="Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?" [isComplete]="isComplete"></div>` after the existing `app-pr-radio-button` block. Add regression tests.
- **Implements:** `ITD-R-1`, `ITD-R-2`, `ITD-R-10`, `ITD-AC-1`, `ITD-AC-2`, `ITD-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.spec.ts`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `tdd`, `systematic-debugging` (already applied during propose/specify — cite for continuity, no re-diagnosis needed)

**Regression test plan (Bug Mode — mandatory, red before fix / green after):**

1. `component.isComplete` with `options.innovation_team_diversity['radioButtonValue']` unset (`undefined`/empty string) → assert `false`. **Fails on current code** because the getter does not exist yet (compile error) — first add the test against the getter's intended contract, confirm it fails (missing member / assertion false-vs-true) before the fix, then confirm green after.
2. `component.isComplete` with `options.innovation_team_diversity['radioButtonValue']` set to a real `result_question_id` → assert `true`.
3. Template/DOM test: render `InnovationTeamDiversityComponent` with `options` set and no `radioButtonValue`; assert the element carrying `appFeedbackValidation` reports incomplete (no `.complete` class), matching the same assertion style already used in sibling spec files (e.g. `gesi-innovation-assessment.component.spec.ts` if it has one — otherwise assert directly on the `isComplete` input binding via `fixture.debugElement`).
4. No existing test in `innovation-dev-info.component.spec.ts` or `innovation-team-diversity.component.spec.ts` breaks (run the full `innovation-dev-info` test path, not just the new file).

**No-pass clause:** if test 1 passes against the pre-fix component (i.e. accessing `component.isComplete` does not error and happens to already return `false` for an unrelated reason), the test is not exercising the new code — re-verify it references the actual getter name and fails to compile/resolve before the fix lands, not just happens to assert `false`.

**Disqualified evidence:** a passing Jest suite alone does NOT prove the "STILL MISSING" popup actually lists the field — per `requirements.md` §11, the popup is driven by a section-wide DOM scan (`someMandatoryFieldIncompleteResultDetail`) that Jest does not exercise end-to-end for this section. That is closed by the manual browser check below, not by this task's automated tests.

- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` — e.g. `🔧 fix(innovation-team-diversity): flag question as missing when unanswered` (pending user commit)
  - [ ] Lint + format clean (`npx ng lint --quiet`)
  - [ ] Unit tests added per the plan above; run scoped: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-team-diversity|innovation-dev-info"`
  - [ ] Client coverage thresholds (50/60/60/60) still met (no exclusions touched)
  - [ ] No migration involved — N/A
  - [ ] No secret/token in logs (`.cursorrules`) — N/A, no logging touched
  - [ ] No API surface changed — N/A
  - [x] **Manual browser check (accepted gap, not automated):** open a fresh Innovation Development result with question 112 never answered; confirm "Innovation team diversity" now appears in the "STILL MISSING" popup and the "N fields missing" count increases by 1. Answer it, confirm it disappears from both. Confirm every other question in the popup (the 3 originally reported) is unaffected. **Done — user validated manually in a real result: green checks and the missing-fields alert both behave correctly.**
  - [x] `.../innovation-dev-info/CLAUDE.md` re-stamped (`**Verified:**` line) in the same commit per repo convention (`docs/COMPONENT-DOCS.md`), noting `innovation-team-diversity/` now has completeness tracking.

---

## 4. Dependency graph

```
ITD-T-1   (single task — no dependents, no dependencies)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ITD-TEST-1` | unit (client, Jest) | `ITD-R-1`, `ITD-AC-1` | `.../innovation-team-diversity/innovation-team-diversity.component.spec.ts` |
| `ITD-TEST-2` | unit (client, Jest) | `ITD-R-2`, `ITD-AC-2` | same file |
| `ITD-TEST-3` | manual (browser) | `ITD-AC-1`, `ITD-AC-2`, `ITD-AC-3` (visual confirmation of the popup) | Result Detail, staging/local |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/CLAUDE.md`).

---

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, tests, build) — no `migration:check:ci` impact.
- [ ] Manual QA per `ITD-TEST-3` above.
- [ ] No bilateral/platform-report payload touched — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] No new cross-cutting UX pattern introduced — nothing to promote to `docs/ux-ui/design.md`.
- [ ] File a follow-up ticket for `intellectual-property-rights` sharing the same completeness gap (see `design.md` §10), if confirmed.
- [ ] No `docs/prd.md` Open Question resolved by this fix.

---

## 8. Roll-back plan

1. Revert the merged PR.
2. No migration to revert.
3. No feature flag involved.
4. N/A — no bilateral/platform-report payload shape touched.
5. N/A — no downstream consumers to notify.

---

## Required cross-references

- `docs/specs/bugfix/innovation-team-diversity-missing-alert/requirements.md`, `design.md` (this folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/CLAUDE.md` (commit convention), `.../innovation-dev-info/CLAUDE.md` (section traps, re-stamp convention).
