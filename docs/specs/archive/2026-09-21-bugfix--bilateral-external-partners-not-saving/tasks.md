# Tasks — Bilateral External Partners Not Saving (Lite / Bug)

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `section-contributors`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved (none outstanding — root cause confirmed by code trace).
- [x] No conflicting in-flight spec touching `section-contributors/` found under `docs/specs/`.
- [ ] Migration name and reversibility confirmed — N/A, no migration in this fix.

## 3. Task list

### `BIL-T-1` — Surface a visible error + Retry when the centers catalogue fails to load `[x]`

- **Type:** `client | tests`
- **Description:** In `SectionContributorsComponent`, add a `centersLoadFailed` signal and a `retryLoadCenters()` method so that when `CentersService.getData()` rejects (after its own internal retries are exhausted), the failure is no longer silently swallowed by `loadCenters()`'s `.catch(() => {})`. Reuse the existing `app-alert-status status="error"` + Retry button pattern already present in the template for the sibling `partnersLoadFailed` case (lines 148–163). Add a regression test that reproduces the original bug (stuck `partnersHydrated`/no error signal) failing before the fix and passing after.
- **Implements:** `BIL-R-1`, `BIL-R-2`, `BIL-R-3`, `BIL-AC-1`, `BIL-AC-2`, `BIL-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** Mock `CentersService.getData()` to reject (after retries). Before the fix: `component.centersLoadFailed` does not exist / stays falsy forever, `centersReady()` never becomes `true`, and no template node with the centers-error banner renders — the section is stuck with zero visible signal. After the fix: `centersLoadFailed()` becomes `true` synchronously after the rejection settles, and the error-banner template branch renders. Calling `retryLoadCenters()` with the mock now resolving successfully must flip `centersLoadFailed()` back to `false` and let `centersReady()` become `true`, allowing `hydrateWhenReady` to proceed as in the happy path.
  - **Red run:** `npx jest --testPathPattern=section-contributors.component.spec --silent` — the new regression test (`BIL-T-1` describe block) must fail against pre-fix code and pass after.
  - **Disqualifier:** If reproducing or fixing this turns out to require changing `CentersService` itself (e.g. because `loadedCenters` cannot be made to signal failure without touching the shared service), STOP and re-specify — that is the explicitly out-of-scope Option C from `proposal.md`, with a much larger blast radius (~25 consumer screens) than this Lite spec accounts for.
  - **Consumers:** none (no shared symbol changed — `centersLoadFailed`/`retryLoadCenters` are new, component-local members; `CentersService`'s public API is untouched).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(section-contributors): ...`) — **pending user approval to commit**, not run by the Leader per standing "no auto-commit" instruction.
  - [x] Lint + format clean (`npx ng lint --quiet`).
  - [x] Regression test added and green; existing `section-contributors.component.spec.ts` suite (104 cases) still green (111/111, then 127/127 across both spec files after rework).
  - [x] Migration up/down verified — N/A, no migration.
  - [x] No secret or token leaked in logs or messages.
  - [x] No API surface changed — Swagger/DTOs untouched.
  - [x] i18n: the new error banner text follows the existing `partnersLoadFailed` banner's convention (plain hardcoded English is acceptable here — the sibling banner it mirrors is not routed through `TermKey` either; do not introduce a new i18n pattern inconsistent with its neighbor).
  - [x] `section-contributors/CLAUDE.md` updated (per root `CLAUDE.md`'s folder-doc convention) with a new dated entry noting the `centersLoadFailed` addition and re-stamped `Verified:` line — this folder has its own `CLAUDE.md` and the convention requires updating it in the same commit as any change inside it.

## 4. Dependency graph

```
BIL-T-1  (single task — no dependencies)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-TEST-1` | unit (client, Jest) | `BIL-R-1`, `BIL-R-2`, `BIL-AC-1`, `BIL-AC-2` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts` |
| `BIL-TEST-2` | unit (client, Jest) — regression guard | `BIL-R-3`, `BIL-AC-3` | same file — asserts the existing happy-path save-with-partner test(s) still pass unchanged |

Client coverage MUST stay above 50/60/60/60 (this folder is not in the coverage exclusion list — only `rd-contributors-and-partners/` and `custom-fields/` are excluded).

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build). `migration:check:ci` — N/A, no migration.
- [ ] Manual QA on staging: simulate a centers-load failure (e.g. via DevTools network throttling/blocking `clarisa/centers/get/all`) and confirm the new banner + Retry appear and recover.
- [ ] No downstream consumers to notify (UI-only, local component).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] No new cross-cutting UX pattern introduced (reuses existing banner/retry pattern) — nothing to promote to `docs/ux-ui/design.md`.
- [ ] Follow-up (not in this spec's scope): consider whether `loadProjects()`'s silent fail-open behavior should also get a visible signal in a future spec — flagged in `design.md` § Open Gaps, not actioned here.

## 8. Roll-back plan

1. Revert the PR.
2. No migration to undo.
3. No feature flag introduced.
4. Verify the bilateral PATCH payload shape is unaffected either way (this fix does not touch payload construction, only the surfaced UI error state).
5. No downstream consumers to notify.

## Required cross-references

- `docs/specs/bugfix/bilateral-external-partners-not-saving/requirements.md`, `design.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md` — see `requirements.md` § Required cross-references.
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` — must be updated in the same commit.
