# Evidence Modal Sticky Actions — `tasks.md` (Lite · Bug Mode)

## 1. Scope of this task list

- **Module / feature:** `results/result-detail/rd-evidences` — evidence create/edit popup
- **Linked spec:** `docs/specs/bugfix/evidence-modal-sticky-actions/requirements.md` + `design.md`
- **Owner / driver:** —
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected Continue).
- [x] `design.md` approved (user selected Continue).
- [x] No open questions block execution — `EVM-OQ-1` is explicitly deferred, not blocking.
- [x] No conflicting in-flight spec touching `rd-evidences/` or `pr-dialog/` found in `docs/specs/`.
- [x] No migration involved (client-only CSS/markup fix).

## 3. Task list

### `EVM-T-1` — Make the evidence popup's header and action buttons sticky `[~]`

- **Type:** `client | tests`
- **Description:** Restructure `.evidence_modal` in `rd-evidences.component.scss` so `.modal_header` (title + close ✕) and `.buttons` (Cancel / Add evidence / Save changes) stay pinned via `position: sticky` (`top: 0` / `bottom: 0` respectively) with an opaque `var(--pr-color-white)` background and a `z-index` above the scrolling form content, while `.evidence_modal` keeps `overflow-y: auto` as the effective scroll container (DD-1). If `<app-evidence-item>`'s component host interferes with sticky positioning, apply the DD-2 fallback: wrap it in a new `.modal_body` div in `rd-evidences.component.html` and move `overflow-y: auto` onto that wrapper. Add a regression test asserting the sticky behavior — the test must fail against current code and pass after the fix (Bug Mode requirement).
- **Implements:** `EVM-R-1`, `EVM-R-2`, `EVM-R-3`, `EVM-AC-1`, `EVM-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.scss`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.html` (only if DD-2 fallback is needed)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` (regression test)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/CLAUDE.md` (re-stamp, same commit)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Definition of done:**
  - [ ] `.modal_header` and `.buttons` are visually pinned (sticky top / sticky bottom) with opaque backgrounds; only the form fields scroll between them.
  - [ ] Regression test added and demonstrated red-before/green-after: on current code, the test fails (asserting `.modal_header`/`.buttons` bounding box stays within a height-constrained popup container); after the fix, it passes. **This is the disqualifying check** — if the test passes even before the CSS change is applied, it is not exercising the bug and must be rewritten (e.g. the container height constraint isn't actually forcing scroll, or the assertion is checking DOM presence instead of the computed sticky position/visibility).
  - [ ] `EVM-AC-2` covered: a snapshot/visual check (or a second assertion in the same test) confirms the popup's layout at its pre-fix baseline size (no scroll needed) is unchanged — no regression at the common case.
  - [ ] Manual/live check at ~1350×800 in a real browser (Chrome, per `onecgiar-pr-client/CLAUDE.md` §9 browser-verification traps: inject `token` **and** `user` in localStorage, confirm the served bundle isn't stale) — closes the gap flagged in the proposal (root cause was confirmed by static analysis only, `prtest` unreachable from the diagnosing sandbox). **What this cannot prove on its own:** a jsdom/Jest assertion of `position: sticky` in computed style does not prove the element visually stays put during a real scroll gesture (jsdom does not lay out or scroll) — the live check is what proves the actual behavior; the automated test proves the CSS contract holds, not the rendered outcome.
  - [ ] Code merged via the project commit convention (`🔧 fix(rd-evidences): ...` per root `CLAUDE.md`).
  - [ ] Lint + format clean (`npm run lint`).
  - [ ] Client coverage thresholds (50/60/60/60) still met.
  - [ ] `rd-evidences/CLAUDE.md` re-stamped (`**Verified:**` line) in the same commit per `docs/COMPONENT-DOCS.md`.
  - [ ] No secret/token leaked (not applicable to this change, but confirmed — no logging touched).

## 4. Dependency graph

```
EVM-T-1  (single task — fix + regression test, no dependencies)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `EVM-TEST-1` | unit/component (Jest, matching existing `rd-evidences.component.spec.ts` patterns) | `EVM-R-1`, `EVM-R-2`, `EVM-R-3`, `EVM-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` |
| `EVM-TEST-2` | manual/live browser check | `EVM-AC-1`, `EVM-AC-2` (visual confirmation) | Chrome, `/result/result-detail/:id/evidences`, ~1350×800 viewport |

**No-pass clause for `EVM-TEST-1`:** if the three-run (or single deterministic) assertion reports the sticky elements "in viewport" under a container height that does **not** actually exceed the popup's natural content height, the test has not forced the failure mode and is not evidence of anything — the height constraint must be verified to actually trigger `.evidence_modal`'s `overflow-y: auto` (e.g. assert `scrollHeight > clientHeight` on `.evidence_modal` as a precondition inside the same test) before trusting the sticky-position assertion.

Client coverage MUST stay above 50/60/60/60 per `onecgiar-pr-client/CLAUDE.md` §3.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging/test env at a laptop-class viewport (~1350×800), per the requirement's scenario.
- [ ] No bilateral/platform-report/admin surfaces touched — no downstream notification needed.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified live.
- [ ] `EVM-OQ-1` (other `app-pr-dialog` consumers with the same pattern) — file as a follow-up proposal if confirmed, not required for this fix to close.

## 8. Roll-back plan

1. Revert the merge PR.
2. No migration, no feature flag, no downstream payload to restore — a plain CSS/markup revert is sufficient.

## Required cross-references

- `docs/specs/bugfix/evidence-modal-sticky-actions/requirements.md` and `design.md` (same folder).
- `onecgiar-pr-client/CLAUDE.md` (hard UI rule #3; §9 browser-verification traps; §3 coverage thresholds).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/CLAUDE.md`.
