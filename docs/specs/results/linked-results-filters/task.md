# Module Spec — `task.md` Template

## 1. Scope of this task list

- **Module / feature:** `results/linked-results-filters`
- **Linked spec:** `docs/specs/results/linked-results-filters/requirements.md` + `docs/specs/results/linked-results-filters/design.md`.
- **Sprint / target phase:** Next release
- **Owner / driver:** Platform Dev Team
- **Status:** `shipped` (filters + widened query + custom panel); performance fix `RES-T-LRF-4` done 2026-09-11

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved.
- [x] CLARISA dependencies (cache tables, endpoints) confirmed (none).
- [x] No conflicting in-flight spec touching the same entities.
- [x] Migration name and reversibility confirmed (none).

---

## 3. Task list

### `RES-T-LRF-1` — Update getResultsForInnovUse repository query

- **Type:** `server`
- **Description:** Modify `ResultRepository.getResultsForInnovUse()` to remove the hardcoded `Reporting 2025` phase restriction, and add a check for `status_id IN (2, 6)`. Ensure both sides of the `UNION ALL` apply this. Include `r.source` and `r.status_id` in the `SELECT` clause.
- **Implements:** `RES-R-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`
- **Depends on:** `—`
- **Blocks:** `RES-T-LRF-2`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] Unit tests updated; coverage thresholds met.
  - [x] No secret or token leaked in logs or messages.

### `RES-T-LRF-2` — Implement client-side filtering logic in components

- **Type:** `client`
- **Description:** Introduce local state in `rd-contributors-and-partners.component.ts` for selected typologies and funding sources. Implement a getter `filteredLinkedResults` that filters `innovationUseResultsSE.resultsList` based on these selections. Determine funding source by checking `source === 'Result'` (W1/W2) vs `source === 'API'` (W3/Bilateral).
- **Implements:** `RES-R-1`, `RES-R-2`, `RES-R-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`
- **Depends on:** `RES-T-LRF-1`
- **Blocks:** `RES-T-LRF-3`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] Unit tests updated for component filtering logic.

### `RES-T-LRF-3` — Render UI filters in Contributors & Partners

- **Type:** `client`
- **Description:** ~~Add two `app-pr-multi-select` components~~ **Shipped as a bespoke
  `.custom-dropdown-panel`** (search box, Typology/Portfolio/Funding Source chip groups, result list) in
  `rd-contributors-and-partners.component.html`, toggled from the existing "Please select a result"
  trigger. `app-pr-multi-select` was not used — the approved visual needed search + three filter groups
  + the result rows inside one overlay, which the multi-select primitive doesn't compose. Styled with the
  app's real design tokens in `rd-contributors-and-partners.component.scss` (`.custom-linked-results-container`
  block) — see `design.md` §6.3 for the 2026-09-11 token-correctness fix (the panel originally used a
  nonexistent `--pr-color-primary` var and the violet-tinted `--pr-color-neutral-*` ramp as if it were gray).
- **Implements:** `RES-R-1`, `RES-R-2`, `RES-AC-LRF-1`, `RES-AC-LRF-2`, `RES-AC-LRF-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html`, `.component.scss`
- **Depends on:** `RES-T-LRF-2`
- **Blocks:** `RES-T-LRF-4`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean.
  - [x] UI tested and visually aligns with the app's real design tokens (not PrimeNG/`reportingTheme` — both are gone from this codebase, see `onecgiar-pr-client/CLAUDE.md`).

### `RES-T-LRF-4` — Fix dropdown-open performance (2026-09-11)

- **Type:** `client`
- **Description:** Opening the panel from `RES-T-LRF-3` froze the app — root-caused to four compounding
  issues in `rd-contributors-and-partners.component.ts`/`.html`: unmemoized getters re-scanning the
  full (thousands-of-rows) results list on every change-detection tick (`RES-PERF-1`), an O(n)
  `.includes()` in the per-row checkbox binding (`RES-PERF-2`), no cap on rendered DOM rows
  (`RES-PERF-3`), and no `trackBy` on any `*ngFor` combined with getters returning new array instances
  every call, defeating Angular's diffing (`RES-PERF-4`). Fixed with component-local
  reference-equality memoization (`flatLinkedResultsOptions`, `availableTypologies`,
  `filteredLinkedResults`, a new `resultsById` map, a new `selectedLinkedResultIds` set), a
  `visibleLinkedResults` getter capped at `linkedResultsRenderCap = 150` (with a truncation note when
  more match), `trackBy` on every `*ngFor` in the panel, and `toggleResultSelection()` reassigning
  `linked_results` to a new array (was `push`/`splice` in place) so the memo caches can detect the
  change. No visual or payload change. Full root-cause writeup: `design.md` §8.1.
- **Implements:** `RES-R-4` (NFR: "the frontend filtering SHOULD remain responsive")
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`, `.component.html`, `.component.scss`
- **Depends on:** `RES-T-LRF-3`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] Code merged via the project commit convention.
  - [x] Lint + format clean (`ng lint` — all files pass).
  - [x] `ng build --configuration development` succeeds (catches template type errors `tsc` misses).
  - [x] Existing suites green, unchanged pass count (`rd-contributors-and-partners*` — 10 suites / 284 tests).
  - [ ] Dedicated `RES-PERF-*` regression specs (cache invalidation, render-cap behavior) — not yet written, see `design.md` §13.

---

## 4. Dependency graph

```text
RES-T-LRF-1 (server query update)
   └── RES-T-LRF-2 (client logic)
         └── RES-T-LRF-3 (client UI)
               └── RES-T-LRF-4 (perf fix)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RES-TEST-LRF-1` | unit (server) | `RES-R-3` | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `RES-TEST-LRF-2` | unit (client) | `RES-R-1`, `RES-R-2`, `RES-R-4` | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` |
| `RES-TEST-LRF-3` (not written) | unit (client) | `RES-PERF-3`, `RES-PERF-4` | Same file — assert `visibleLinkedResults.length` stays at the cap when `filteredLinkedResults` exceeds it, and that toggling a selection updates `selectedLinkedResultIds` without a stale cache. |

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build).
- [ ] Manual QA on staging per the `requirements.md` happy paths.
- [ ] Telemetry verified post-deploy.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped`.

---

## 8. Roll-back plan

1. Revert PRs for frontend and backend.
2. Deploy the reverted code to restore the previous endpoint behaviour (hardcoded phase year 2025).

---

## Required cross-references

- `docs/specs/results/linked-results-filters/requirements.md`
- `docs/specs/results/linked-results-filters/design.md`
- `docs/prd.md`
- `docs/ux-ui/design.md`
- `docs/trd/trd.md`
