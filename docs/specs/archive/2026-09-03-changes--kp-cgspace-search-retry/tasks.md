# Tasks — CGSpace Search Auto-Retry

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting` › `kp-cgspace-browse` — `kp-cgspace-search-retry`
- **Linked spec:** `docs/specs/changes/kp-cgspace-search-retry/requirements.md` + `design.md`
- **Depth:** Lite · **Budget (from design):** 1 task · ~170 LOC incl. tests · 1 review round — `/akili-execute` stops and escalates when exceeded
- **Approval Mode:** interactive
- **Owner / driver:** Result Framework Reporting
- **Status:** `shipped`
- **Execution rule:** scoped Jest only — never the full client suite.

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Lite).
- [x] `design.md` approved (Lite, no Judgment Day).
- [x] Open questions resolved (none blocking).
- [x] No CLARISA or migration work.
- [x] No conflicting in-flight spec editing `kp-cgspace-browse` (`docs/specs/` searched — `aow-filter-popover` is unrelated).
- [x] No API / bilateral / platform-report change.

---

## 3. Task list

### [x] `KCSR-T-1` — Retry failed CGSpace searches three times before Try again

- **Status:** complete
- **Type:** `client | tests`
- **Size:** S
- **Estimate:** S
- **Depends on:** —
- **Blocks:** —
- **Requirements covered:** `KCSR-R-1`, `KCSR-R-2`, `KCSR-R-10`, `KCSR-AC-1`…`KCSR-AC-6`
- **Design references:** `KCSR-DD-1`…`KCSR-DD-4`; Frontend Plan §6.2; Testing Plan §10
- **Skills:** `angular-developer`, `tdd`
- **Description:** In `initSearchPipeline`, wrap `GET_cgspaceSearch` so one trigger makes up to three sequential attempts (first call + two automatic re-subscriptions, 600 ms apart, delay overridable in tests). Count a thrown error **and** a completed body with `status`/`statusCode` ≥ 400 as a failed attempt. Keep `loading` / `loadingMore` until the sequence finishes. Leave retry **inside** the existing `switchMap`. Do not change facets, MQAP, template copy, or `GET_cgspaceSearch` itself. Update the existing “one failure → error” spec and add the scenarios below.

- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.ts`
  - `…/kp-cgspace-browse.component.spec.ts`
  - HTML/SCSS only if a test selector is missing (prefer existing `data-test="cgspace-error"` / `cgspace-retry-btn`)

- **Scope:**
  - In: search pipeline retry + Jest coverage of every clause in the table below.
  - Out: `GET_cgspaceFacet`, MQAP / Use this item, Manual entry, server proxy, new UI copy.

- **Clause ownership (this task owns all of them):**

| Clause | Must prove |
|---|---|
| `KCSR-R-1` Recover — AND IT MUST exactly 2 calls | Fail then items → 2 `GET_cgspaceSearch` calls |
| `KCSR-R-1` Recover — BUT no error / Try again | After that, no `[data-test="cgspace-error"]`; `status === 'results'` |
| `KCSR-R-1` Persistent — AND IT MUST exactly 3 calls | Three failures → 3 calls, then stop |
| `KCSR-R-1` Persistent — BUT no 4th retry | After flush, call count stays 3 |
| `KCSR-R-1` Persistent — AND IT MUST Manual entry usable | Error card still has `data-test="switch-to-manual-error"` |
| `KCSR-R-1` First success — AND IT MUST 1 call | Items on attempt 1 → 1 call, `results` |
| `KCSR-R-1` First success — BUT no retry of empty | 200 + `items: []` → 1 call, `empty` |
| `KCSR-R-1` Try again — BUT must not skip auto-retry | After 3-fail, click retry; fail then succeed → more than one call in the new cycle |
| `KCSR-R-2` No flash — BUT no error between attempts | After fail 1, before attempt 2 completes → `status === 'loading'`, no error node |
| `KCSR-R-2` No flash — loading more | Load more fail-then-pending → `loadingMore === true`, `status` not `error` |
| `KCSR-R-2` No flash — AND IT MUST inputs enabled | Search/filter controls not `disabled` during the gap |
| `KCSR-R-2` Cancel — leftover A stops; B has its own budget | Start B while A is delaying; A’s call count does not keep growing for A’s params |
| `KCSR-R-2` Cancel — BUT must not apply A to B | A’s late success must not set B’s `items` / query params |
| `KCSR-R-10` / `KCSR-DD-2` | Two re-subscriptions, 600 ms product delay (tests may shrink the delay) |
| `KCSR-DD-3` | A 200 body with `status: 502` is a failed attempt (not only `throwError`) |
| Facet isolation | Search retries do not increment `GET_cgspaceFacet` |

- **Tests:**
  - Extend `kp-cgspace-browse.component.spec.ts` (fakeAsync). Rewrite the current single-fail → error case.
  - Cover thrown failures **and** `{ status: 502 }` bodies.
  - Cover Load more stays `loadingMore` across a mid-retry gap if that path is cheap to reach; otherwise document as the same inner pipe (`KCSR-DD-1`).

- **Verification:**

```bash
cd onecgiar-pr-client && npm run test -- --testPathPattern="kp-cgspace-browse.component.spec"
```

  - **Pass:** all new/updated cases green; command scoped to that spec file.
  - **Disqualifier (worthless evidence):** green because the retry delay was never flushed; or only a presence assert that `retry(` appears in the source; or a run of the full client Jest suite. Report the spread / leftover timers instead of a pass.
  - **Input that would FAIL:** mock `GET_cgspaceSearch` to fail once then return one item — if the UI shows **Try again** or the spy was called once, the task fails.
  - **Presence caveat:** finding a retry operator in the `.ts` file is not behavioral proof. The spy call counts and `status()` values are.

- **Definition of done:**
  - [x] Pipeline implements 3 total attempts, 600 ms gap, 502-body = failure (`KCSR-DD-1`…`3`).
  - [x] Error UI appears only after attempt 3; loading holds in between (`KCSR-R-2`).
  - [x] New query/filter/Enter cancels leftover retries (`KCSR-DD-4`).
  - [x] Every clause row above has a named spec that fails on current `HEAD` (or is recorded as already passing only for the first-success / empty path) and passes after the change.
  - [x] Existing error copy + Manual entry + **Try again** unchanged.
  - [x] Scoped Jest green. Lint clean on the two touched files.
  - [x] No secrets in logs (`.cursorrules`).
  - [x] No full-suite Jest run.

---

## 4. Dependency graph

```
KCSR-T-1
```

Single task. No parallel branches.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KCSR-TEST-1` | unit (client) | Recover, 2 calls, no error UI — `KCSR-R-1` / `KCSR-AC-1` | `kp-cgspace-browse.component.spec.ts` |
| `KCSR-TEST-2` | unit (client) | Three failures then error + Manual entry; no 4th call — `KCSR-AC-2` | same |
| `KCSR-TEST-3` | unit (client) | Empty list not retried; first-success items = 1 call — `KCSR-AC-3` | same |
| `KCSR-TEST-4` | unit (client) | Loading, no error node, inputs enabled between attempts — `KCSR-AC-4` | same |
| `KCSR-TEST-5` | unit (client) | Query B cancels A; A’s late result discarded — `KCSR-AC-5` | same |
| `KCSR-TEST-6` | unit (client) | **Try again** starts a new 3-cycle — `KCSR-AC-6` | same |
| `KCSR-TEST-7` | unit (client) | `{ status: 502 }` body retries like a throw — `KCSR-DD-3` | same |
| `KCSR-TEST-8` | unit (client) | Facet spy unchanged during search retries | same |

Client coverage floors stay 50/60/60/60. No Cypress / server / bilateral tests in this spec.

---

## 6. Rollout & verification

- [ ] Single PR. Commit: `🔧 fix(kp-cgspace-browse): Retry CGSpace search three times before Try again`
- [ ] CI owns full-suite / lint / Sonar. Local gate is the scoped spec only.
- [ ] Manual (optional, staging): Browse a KP, force a brief proxy blip if available — confirm loading holds, then results or **Try again** after three tries. Manual entry still creates.

---

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped` on archive.
- [ ] No new token or TRD ADR to promote.
- [ ] Deferred (do not do here): server-side retry, facet retry, shared retry helper (`design.md` §13).

---

## 8. Roll-back plan

1. Revert the PR (client-only).
2. No migration to revert.
3. Browse returns to single-attempt fail-soft.
4. No bilateral / platform-report payload to restore.

---

## Required cross-references

- `docs/specs/changes/kp-cgspace-search-retry/requirements.md`
- `docs/specs/changes/kp-cgspace-search-retry/design.md`
- `docs/prd.md` — `G1`, `G4`, `US-S1`, `US-S5`, `AC-8`, `AC-9`
- `docs/ux-ui/design.md` — Empty / error / loading
- `docs/trd/trd.md` — CGSpace HTTP integration
