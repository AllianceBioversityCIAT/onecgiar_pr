# Module Spec — Tasks: Innovation Geo Focus, "other geographic areas" question

## 1. Scope of this task list

- **Module / feature:** `results` — `rd-geographic-location` (bugfix)
- **Linked spec:** `docs/specs/bugfix/innovation-geo-other-areas/requirements.md` + `design.md`
- **Depth:** Lite · **Mode:** Bug
- **Owner / driver:** result submitter-facing bug
- **Status:** GEO-T-1 complete (PASS, attempt 2) — see `execution.md`

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (none — see proposal Decision Log)
- [x] No conflicting in-flight spec touching `rd-geographic-location/` (checked `docs/specs/results/`, `docs/specs/bugfix/` — none found)
- [x] No migration involved — `migration:check` unaffected

---

## 3. Task list

### `GEO-T-1` — Fix null-coercion on the "other geographic areas" answer and its completeness check [x]

- **Type:** `client`, `tests`
- **Description:** In `RdGeographicLocationComponent.fillExtraGeographicLocationBody()`, replace `Boolean(response.has_extra_geo_scope)` with a direct assignment that preserves `null`/`true`/`false` as sent by the server. Widen `ExtraGeographicLocationBody.has_extra_geo_scope`'s type to `boolean | null`. In `rd-geographic-location.component.html`, change the `appFeedbackValidation [isComplete]` expression for this field from `!== undefined` to a check that also treats `null` as incomplete. Add regression tests.
- **Implements:** `GEO-R-1`, `GEO-R-2`, `GEO-R-3`, `GEO-AC-1`, `GEO-AC-2`, `GEO-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/models/extraGeographicLocationBody.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.spec.ts`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `tdd`, `systematic-debugging` (already applied during propose/specify — cite for continuity, no re-diagnosis needed)

**Regression test plan (Bug Mode — mandatory, red before fix / green after):**

1. `fillExtraGeographicLocationBody({ has_extra_geo_scope: null, ... })` → assert `component.extraGeographicLocationBody.has_extra_geo_scope` is `null` (not `false`). **Fails on current code** (asserts `false`, current code produces `false` too — so first confirm this test is written to fail pre-fix by asserting `toBeNull()` rather than `toBe(false)`; current `Boolean(null)` yields `false`, which would make `toBeNull()` fail as expected pre-fix, and pass post-fix).
2. `fillExtraGeographicLocationBody({ has_extra_geo_scope: false, ... })` → assert value stays `false` (unchanged, regression guard).
3. `fillExtraGeographicLocationBody({ has_extra_geo_scope: true, ... })` → assert value stays `true` (unchanged, regression guard).
4. Component/template test (or an extracted predicate if the directive input isn't easily unit-testable in isolation): given `has_extra_geo_scope === null`, the `[isComplete]` expression evaluates to `false`. Given `false` or `true`, it evaluates to `true`.

**No-pass clause:** if the Jest run reports the `toBeNull()` assertion in test 1 *passing on the pre-fix codebase* (i.e. before the `Boolean()` line is removed), the test was written wrong — it must be re-checked against actual pre-fix code once, confirmed red, before trusting the post-fix green.

**Disqualified evidence:** a passing test suite alone does NOT prove the fix — per `requirements.md` §11, the *visual* absence of a pre-checked radio in a real browser is not observable in Jest/jsdom (known project trap, `onecgiar-pr-client/CLAUDE.md` §9). That is closed by the manual check below, not by this task's automated tests.

- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` — e.g. `🔧 fix(rd-geographic-location): stop coercing unanswered other-geo-areas answer to No` (pending user commit)
  - [x] Lint + format clean (`npx ng lint --quiet`)
  - [x] Unit tests added per the plan above; run scoped: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-geographic-location"` — 31/31 passed
  - [x] Client coverage thresholds (50/60/60/60) still met (no exclusions touched)
  - [x] No migration involved — N/A
  - [x] No secret/token in logs (`.cursorrules`) — N/A, no logging touched
  - [x] No API surface changed — N/A, DTO already nullable
  - [ ] **Manual browser check (accepted gap, not automated):** open a fresh Innovation Development or Innovation Use result (P25, non-P22) with main geo focus = Regional/National/Sub-national and `has_extra_geo_scope` never answered; confirm no radio is pre-selected and the section's "fields missing" count includes it. Confirm re-loading a result with a real prior "Yes"/"No" answer still shows it correctly and does NOT count as missing. **Still outstanding — do during PR review.**
  - [x] Confirm `onSaveSection()` still sends the correct value when the question was answered — verified via `ng build --configuration development` (clean, no narrowing error at the PATCH call site).

---

## 4. Dependency graph

```
GEO-T-1   (single task — no dependents, no dependencies)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `GEO-TEST-1` | unit (client, Jest) | `GEO-R-1`, `GEO-AC-1` | `onecgiar-pr-client/.../rd-geographic-location/rd-geographic-location.component.spec.ts` |
| `GEO-TEST-2` | unit (client, Jest) | `GEO-R-2`, `GEO-AC-2` | same file |
| `GEO-TEST-3` | unit (client, Jest) | `GEO-R-3` | same file |
| `GEO-TEST-4` | manual (browser) | `GEO-AC-1`, `GEO-AC-2`, `GEO-AC-3` (visual confirmation) | Result Detail, staging/local |

Client coverage MUST stay above 50/60/60/60 (`onecgiar-pr-client/CLAUDE.md`).

---

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, tests, build) — no `migration:check:ci` impact.
- [ ] Manual QA per `GEO-TEST-4` above.
- [ ] No bilateral/platform-report payload touched — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after merge.
- [ ] No new cross-cutting UX pattern introduced — nothing to promote to `docs/ux-ui/design.md`.
- [ ] No deferred work from `design.md`.
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

- `docs/specs/bugfix/innovation-geo-other-areas/requirements.md`, `design.md` (this folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
- `onecgiar-pr-client/CLAUDE.md` (Jest/jsdom radio limitation, commit convention).
