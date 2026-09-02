# Tasks — Unmount the leftover floating footer on Result Detail

## 1. Scope of this task list

- **Module / feature:** `results` Result Detail chrome + shared `footer`
- **Linked spec:** `docs/specs/changes/result-detail-footer-overlap/requirements.md` + `design.md`
- **Depth:** Lite (Bug Mode)
- **Status:** not-started
- **Budget:** 2 tasks · ~40 LOC · 1 review round (`design.md` §14)
- **Pre-flight:** requirements and design approved via specify Continue; `FOVL-OQ-1` hide footer; `FOVL-OQ-2` Jira optional; no footer conflict in active `docs/specs/changes/`

## 2. Task list

### FOVL-T-1 — Add the red regression: footer still mounts on Result Detail `[x]`

- **Type:** `tests`
- **Size:** S
- **Status:** done
- **Depends on:** none
- **Blocks:** FOVL-T-2
- **Skills:** `tdd`, `angular-developer`
- **Description:** In `footer.component.spec.ts`, add a case that drives `Router.url` to a Result Detail path (including a typical section suffix, e.g. `/result/result-detail/9004/general-information`) and asserts `showIfRouteIsInList()` is false and that `.footer` / `.footer-blocker` are absent after `detectChanges()`. On current code this MUST fail (the allow-list still contains `/result/result-detail/`). Do not edit the allow-list in this task.
- **Implements:** FOVL-R-1 (footer not in document; hover trap not in document; MUST NOT reappear — absence is the proof), FOVL-AC-1
- **Design:** FOVL-DD-2 (Jest owns mount)
- **Files:** `onecgiar-pr-client/src/app/shared/components/footer/footer.component.spec.ts`
- **Regression test (Bug Mode, mandatory):** the new case is the red-before / green-after lock. Red on current HEAD; green only after FOVL-T-2.
- **Verification:**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="footer.component.spec"`
  - Pass: the new Result Detail case fails; existing cases still pass.
  - Disqualify: if the new case passes on unfixed code, it is not exercising the allow-list — do not proceed. If only the spec file exists and no run was recorded, presence is not evidence.
  - Input that would FAIL this check: current `footer.component.ts` still listing `/result/result-detail/` — the new test must fail on that input. If you cannot make it fail, the test is worthless.
- **Done criteria:** new case exists; run log shows it red; no allow-list or SCSS change in this task; no secrets in fixtures.

### FOVL-T-2 — Remove the Result Detail allow-list entry and confirm the strip

- **Type:** `client | tests`
- **Size:** S
- **Status:** pending
- **Depends on:** FOVL-T-1
- **Blocks:** none
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Description:** Delete the `/result/result-detail/` entry from `FooterComponent.routes`. Do not set `floating: false` on a leftover entry (FOVL-DD-1). Re-run the footer spec: FOVL-T-1’s case is now green; Results list still mounts; a remaining floating route (e.g. Type-One Report) still sets `isFloating`. Then HITL at `md` (900px) and ~1100px with the sidebar open: action strip matches `visual/wide-action-bar-correct.jpg`; click and Tab to Back / Next / Sync / Save draft. Touch `section-bottom-bar` or Tawk only if that HITL shows a remaining clip.
- **Implements:** FOVL-R-1 (all clauses), FOVL-R-2 (all clauses, via HITL), FOVL-R-3 (other routes + Contact Us / Terms still present), FOVL-AC-1, FOVL-AC-2, FOVL-AC-3
- **Design:** FOVL-DD-1, FOVL-DD-2
- **Files:**
  - `onecgiar-pr-client/src/app/shared/components/footer/footer.component.ts`
  - `onecgiar-pr-client/src/app/shared/components/footer/footer.component.spec.ts` (keep T-1 case; add “other route still mounts” if missing)
  - SCSS / `section-bottom-bar` / Tawk only if HITL forces it
- **Verification (Jest):**
  - Command: `cd onecgiar-pr-client && npm run test -- --testPathPattern="footer.component.spec"`
  - Pass: Result Detail case green; Results list (or equivalent listed path) still renders `.footer`; glossary / Contact Us still present on that listed path.
  - Disqualify: green Result Detail case with the allow-list entry still present (test was rewritten to match the bug). A presence-only assert that the array “was edited” is not evidence.
  - Input that would FAIL: put `/result/result-detail/` back on the allow-list — T-1’s case must go red again.
- **Verification (HITL — FOVL-R-2 / FOVL-AC-2; jsdom cannot do this):**
  - Open Result Detail at 900px and at ~1100px. Compare to `visual/wide-action-bar-correct.jpg`. Hover the bottom-right. Click the four actions. Tab to Save draft and activate it.
  - Pass: no CGIAR footer; all four actions visible and activatable.
  - Disqualify: a single screenshot with no clicks; a desktop-only shot; Jest green treated as “unobstructed.”
  - Input that would FAIL: restore the allow-list entry and reload — the dark footer must cover the strip again (same as `visual/narrow-footer-overlap.png`).
- **What the Jest gate cannot prove:** stacking, hit-testing, keyboard reach, visual match to the wide fixture. HITL is the behavioral proof for those.
- **Done criteria:** allow-list entry gone and no `floating: false` leftover; footer spec green; HITL note recorded (two widths, four actions, hover, Tab); lint clean on touched files; no Tawk / strip change unless HITL named a remaining clip; commit `🔧 fix(footer): stop floating overlay on result-detail`.

## 3. Clause coverage (not ID-level)

| Requirement clause | Owner |
|---|---|
| FOVL-R-1 THEN footer not in document | FOVL-T-1 (red), FOVL-T-2 (green) |
| FOVL-R-1 AND hover trap not in document | FOVL-T-1, FOVL-T-2 |
| FOVL-R-1 BUT action strip still renders | FOVL-T-2 (do not touch strip unless HITL); existing `section-bottom-bar` specs stay green |
| FOVL-R-1 AND IT MUST NOT reappear on hover / scroll / resize | FOVL-T-2 — unmounted footer cannot reappear; HITL hover confirms |
| FOVL-R-2 THEN four actions visible and clickable at `md` / ~1100px | FOVL-T-2 HITL |
| FOVL-R-2 AND strip matches wide fixture | FOVL-T-2 HITL |
| FOVL-R-2 BUT CGIAR footer MUST NOT cover controls | FOVL-T-2 Jest (not mounted) + HITL |
| FOVL-R-2 AND IT MUST Tab to Save draft | FOVL-T-2 HITL (Jest cannot) |
| FOVL-R-3 THEN footer still appears on listed non-detail routes | FOVL-T-2 Jest |
| FOVL-R-3 AND IT MUST NOT lose Contact Us / Terms / License / Glossary | FOVL-T-2 — existing glossary assertion + listed-route mount |

A gap may not be closed by citing a different requirement.

## 4. Dependency graph

```
FOVL-T-1 (red regression)
   └── FOVL-T-2 (remove entry + green + HITL)
```

Not parallel — T-2 must see T-1 fail first.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| FOVL-TEST-1 | unit (Jest) | FOVL-R-1, FOVL-AC-1 | `footer.component.spec.ts` — Result Detail URL → no footer |
| FOVL-TEST-2 | unit (Jest) | FOVL-R-3, FOVL-AC-3 | `footer.component.spec.ts` — listed non-detail path still mounts |
| FOVL-TEST-3 | HITL visual + click + Tab | FOVL-R-2, FOVL-AC-2 | Result Detail at 900px and ~1100px vs `visual/wide-action-bar-correct.jpg` |

Client coverage thresholds unchanged (50/60/60/60). Scope tests to `footer.component.spec` only.

## 6. Rollout & verification

- Single PR (under ~40 LOC). Commit convention: `🔧 fix(footer): …`
- CI: scoped Jest + lint. No migration.
- Manual QA on test env: FOVL-R-2 happy path at tablet width.

## 7. Cleanup & follow-ups

- Spec status → shipped after archive.
- No new `docs/ux-ui/design.md` §12 token. Optional later note: Result Detail does not show the site footer.
- Deferred: Option B handle; `xs`/`sm` Result Detail layout.

## 8. Roll-back plan

1. Revert the PR (restores the allow-list entry).
2. No migration to revert.
3. Confirm Result Detail footer floats again; Results list unchanged.

## 9. PR strategy

**One PR.** Estimate ~40 LOC, two sequential tasks. Split only if HITL forces a Tawk or strip change large enough to exceed the ~80 LOC tripwire — then stop and ask before adding a third task.
