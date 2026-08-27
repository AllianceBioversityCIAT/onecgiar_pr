# Module Spec — `task.md`

Bug fix spec. **Depth: Lite.** Implements [`requirements.md`](./requirements.md) and [`design.md`](./design.md).

---

## 1. Scope of this task list

- **Module / feature:** `bugfix/lead-contact-person-search`
- **Linked spec:** `docs/specs/bugfix/lead-contact-person-search/requirements.md` + `design.md`
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** complete

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions resolved (`LCP-OQ-1` is explicitly deferred to post-fix live re-verification, not blocking).
- [x] No CLARISA dependency.
- [x] No conflicting in-flight spec (no other `bugfix/*` specs exist yet).
- [x] No migration involved.

---

## 3. Task list

### `LCP-T-1` — Catch search errors inside `switchMap` so the pipeline survives zero-match/failed searches `[x]`

- **Type:** `client | tests`
- **Description:** In `lead-contact-person-field.component.ts`'s constructor pipeline, wrap the inner `this.resultsApiService.GET_adUsersSearch(trimmedQuery)` call with `catchError(() => of({ response: [] }))` so a 404 ("no matches") or any other request error resolves to an empty-result `next` emission instead of an `error` notification that kills the outer `searchSubject` subscription. Import `catchError` and `of` from `rxjs`/`rxjs/operators` alongside the existing `debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY` import. Add the Cypress CT regression test described below.
- **Implements:** `LCP-R-1`, `LCP-R-2`, `LCP-AC-1`, `LCP-AC-2`, `LCP-AC-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.ts`
  - `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.cy.ts`
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (≤0.5d)
- **Regression test (mandatory — Bug Mode):**
  1. Mount `LeadContactPersonFieldComponent` with `editable: true` (per `mountCF` gotcha in `onecgiar-pr-client/CLAUDE.md` §9).
  2. Type a query ≥4 chars; intercept `GET /api/ad-users/search*` to respond `404` for this query. Assert: no crash, no dropdown/results shown, `isSearching` settles to not-searching.
  3. Clear the field, type a **different** query ≥4 chars in the **same mounted instance**; intercept the request to respond `200` with a matching user. Assert: the result renders and is selectable.
  4. This test **must fail on current code** (step 3 never fires a request / never shows a result because the pipeline died in step 2) and **pass once `catchError` is added** — the red→green pair is the evidence the bug is fixed.
- **Definition of done:**
  - [x] Code merged via the project commit convention: `🔧 fix(lead-contact-person-field) P2-3260: Keep AD user search alive after a zero-match result`.
  - [x] Lint clean (`npx ng lint --quiet`, or scoped: touched file only).
  - [x] New Cypress CT case added to `lead-contact-person-field.cy.ts`; confirmed **red before the fix** (temporarily revert the `catchError` locally to verify), **green after**.
  - [x] `npm run test:ct` shows no regression versus a clean baseline: `lead-contact-person-field.cy.ts` (the touched spec) is fully green post-fix, and the failure counts on a representative sample (`lead-contact-person-field.contract.cy.ts`, `pr-button.contract.cy.ts`, `pr-checkbox.contract.cy.ts`) are byte-identical before and after this diff (3/5/4 failing in both runs). Full 47-file suite: 27 files / 110 tests failing both pre- and post-fix, all in `.contract.cy.ts` files unrelated to this component. (Actual suite size at execution time: 47 spec files / 431 tests, not the 67+1/23 estimated when this line was written — pre-existing `.contract.cy.ts` harness breakage across ~26 unrelated component files is tracked as a separate follow-up, not blocking this bugfix.)
  - [x] Existing Jest unit spec `lead-contact-person-field.component.spec.ts` still passes, with **only** the single-error `showResults` assertion changed (`false` → `true`, per requirements.md §7's reconciled Regression safety NFR — design.md §6.2 mandates this): `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lead-contact-person-field.component.spec"`.
  - [x] No secret/token leaked in logs or test fixtures.
  - [x] No Swagger/DTO change (none applicable — client-only).
  - [x] No i18n keys needed (no new user-facing string introduced).
  - [x] No bilateral/platform-report change log entry needed (client-only, no payload shape touched).
  - [x] Manually verified in a real browser per `onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser": user confirmed on their own local dev server — zero-AD-match search then a matching search, same page load, no reload, results match the test environment.

---

## 4. Dependency graph

```
LCP-T-1  (single task — no dependencies, nothing blocks it)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `LCP-TEST-1` | Cypress Component Test (new, regression) | `LCP-R-1`, `LCP-R-2`, `LCP-AC-1`, `LCP-AC-2`, `LCP-AC-3` | `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.cy.ts` |
| `LCP-TEST-2` | Jest unit (existing, no-regression check) | zero-match / single-error cases already covered | `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.spec.ts` |

No verification disqualifier beyond the obvious: if `LCP-TEST-1`'s second search (step 3) is flaky/intermittent across 3 local runs, that is not evidence of a fix — re-run and, if it does not stabilize, treat the pipeline as still broken rather than reporting green. There is no measured/timing-sensitive value in this test (it asserts DOM presence of a rendered result, not a latency number), so no spread-tolerance clause is needed beyond standard Cypress retry-ability.

No visual/rendered-output defect class applies (per requirements.md's Defect Classes mapping) — no manual/T6 visual check is required for this task.

---

## 6. Rollout & verification

- [ ] PR opened with commit convention: `🔧 fix(lead-contact-person-field) P2-3260: Keep AD user search alive after a zero-match result`.
- [ ] CI green (lint, tests, build). No `migration:check:ci` involved (no migration).
- [ ] Manual QA: reproduce the exact P2-3260 repro steps (search `ogutu`-style no-match query, then a valid query) on staging/test env — confirm no hard reload needed.
- [ ] Not bilateral/platform-report — no downstream notification needed.
- [ ] Not admin/role/phase — no runbook update needed.
- [ ] No new telemetry to verify post-deploy (no new logging added per design §9).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] No new cross-cutting decision to promote to `docs/ux-ui/design.md` or `docs/trd/trd.md` — this is a local RxJS control-flow fix, not a new pattern.
- [ ] File a follow-up (fresh, separately-diagnosed ticket) only if `LCP-OQ-1` ("--" symptom) still reproduces on a clean build after this fix ships.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

---

## 8. Roll-back plan

1. Revert the merged PR.
2. No migration to revert (none introduced).
3. No feature flag / global parameter introduced — nothing to disable.
4. Not applicable — no bilateral/platform-report payload touched.
5. No downstream consumers to notify (client-only UI fix, no shared contract changed).

---

## Required cross-references

- `docs/specs/bugfix/lead-contact-person-search/requirements.md` and `design.md` — same folder.
- `docs/prd.md`, `docs/trd/trd.md` — no module-specific section; see requirements.md's cross-reference note.
- `onecgiar-pr-client/CLAUDE.md` §9 — Cypress CT is the gate for `custom-fields/` (Jest-excluded); mounting gotcha (`editable: true`).
