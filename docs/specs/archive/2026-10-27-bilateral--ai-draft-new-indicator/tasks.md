# Tasks — Bilateral AI Draft Results: "New" Indicator

## 1. Scope of this task list

| Field | Value |
|---|---|
| **Module / feature** | `bilateral` / `ai-draft-new-indicator` |
| **Linked spec** | `requirements.md` + `design.md` (rev. 2, `JUDGMENT: APPROVED ✅` in `judgment.md`) |
| **Owner / driver** | Maria Camila Giraldo |
| **Status** | done (2026-10-27) |
| **Budget (from design)** | 2 tasks · ~290 LOC · 3 review rounds |
| **PR strategy** | One PR, client-only (~290 LOC including tests) |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (gated, 2026-10-27)
- [x] `design.md` approved after Judgment Day (round 2 PASS)
- [x] No open questions; Premise Ledger 14/14 verified
- [x] No CLARISA or migration dependency
- [x] No in-flight spec touches the **client** files of this spec. Ran `grep -rln "my-draft-results\|bilateral-ai.service" docs/specs --include='*.md'`, excluding `archive/` and this spec → 26 files in 9 specs. Two are in progress: `changes/admin-sees-all-centers` and `bilateral/qa-ai-traffic-light`. Their tasks name only the **server** `onecgiar-pr-server/.../bilateral-ai.service.ts` (`admin-sees-all-centers/tasks.md:123,128`) or no such file. The others are `done`, `approved` with an `execution.md`, or `not-started` specs on other modules. Re-check before execute if `admin-sees-all-centers` ships first.

**Harness trap (observed 2026-10-27, baseline probe).** `BilateralAiService`'s center `effect()` runs lazily under fake timers. A spec that counts `GET_bilateralAiDrafts` calls without `TestBed.tick()` after `ctx.centerInstitutionId.set(...)` and after each poll picks up the deferred effect's call. The first probe went **green on the unfixed code** that way. Every count assertion in this spec MUST flush effects (`TestBed.tick()`) before taking its baseline.

---

## 3. Task list

### `ADN-T-1` — Service: fresh-job set, reload on completion, latest-wins guard

- **Status:** [x] done (PASS attempt 1, 2026-10-27)
- **Type:** client
- **Size:** M
- **Description:** In `BilateralAiService`:
  - Add the signal `freshDraftJobIds` (a `ReadonlySet<string>`). It is always replaced with a new `Set`, never mutated.
  - Feed it from `detectTerminalTransitions` with newly terminal `COMPLETED` jobs whose `resultCount > 0`.
  - Call `loadAllDrafts()` **once** per poll that added an id.
  - Add `consumeFreshDraftJobs(jobIds)`.
  - Add the request-sequence guard to `loadAllDrafts`:
    - the counter increments only after the `centerId == null` return;
    - a superseded response (success or error) is ignored;
    - when the newest call errors, it still sets `isDraftListLoaded(true)` and keeps the current list.
  - Toasts and `unseenFinishedIds` stay unchanged.
- **Implements:**
  - `ADN-R-1`:
    - scenario "Run finishes…": the set side, including the BUT "not a job already terminal at the first poll";
    - scenario "Failed or empty job";
    - scenario "Two own jobs" (set side).
  - `ADN-R-2`: the "list refreshes on its own" clause.
  - `ADN-R-3`:
    - scenario "Job finished but not visited", the "stays fresh" clause;
    - AND IT MUST "lost on a reload after the job finished".
  - `ADN-R-5`, service side.
  - `ADN-AC-3`, `ADN-AC-4` (reload part), `ADN-AC-8` (service part).
- **Design refs:** §6.2 rows `BilateralAiService` and `loadAllDrafts`, `ADN-DD-1`, `ADN-DD-2`, P-1, P-2, P-3, P-11, P-12, P-13
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts`
- **Depends on:** —
- **Blocks:** `ADN-T-2`
- **Review:** `full` — shared root service, and `loadAllDrafts` has 5 callers (P-3)
- **Skills:** `angular-developer`, `tdd`
- **Tests (new `describe('fresh draft jobs (ADN)')` in the service spec, using the multi-poll pattern of `:391` plus `TestBed.tick()`):**
  1. Active → `COMPLETED` with `result_count: '3'` → the set holds the id, and `GET_bilateralAiDrafts` runs exactly once.
  2. Active → `COMPLETED` with `result_count: '0'` → the set is empty, and there is no extra drafts call.
  3. Active → `FAILED` → the set is empty, and there is no extra drafts call.
  4. A job already `COMPLETED` on the first poll (`openDrawer()` first) → the set is empty. This covers the "reload after finish" case.
  5. A "reload while running": a fresh `TestBed` with the `HAS_ACTIVE_JOBS_KEY` hint, a first poll returning `PROCESSING`, then `COMPLETED` → the id is in the set (P-13).
  6. Two jobs completing in the same poll → both ids are in the set, and the drafts load runs **once**.
  7. `consumeFreshDraftJobs(['job-1'])` removes only `job-1`, and the signal reference changes.
  8. Out of order: two `loadAllDrafts()` calls on `Subject`s, newer resolves first → `draftList` holds the newer data.
  9. The newest call errors after an older one succeeded → the list is unchanged and `isDraftListLoaded()` is `true`.
  10. A null center → no request, and the sequence counter does not advance: a later call's response is still written.
  11. No write method (`POST_*`, `DELETE_*`) is called by any of the paths above.
- **Verification:**
  - **Command:** `cd onecgiar-pr-client && npx jest src/app/pages/bilateral/services/bilateral-ai.service.spec.ts --silent --reporters=summary --no-coverage`, then `npx ng build --configuration development`
  - **Falsifier:**
    - Drop the `resultCount > 0` condition → test 2 goes red.
    - Drop the `prev`-active reuse and add ids for every `COMPLETED` job in the list → test 4 goes red.
    - Call `loadAllDrafts()` per job instead of per poll → test 6 goes red (2 calls).
    - Remove the sequence guard → test 8 goes red.
    - Assign a `string[]` to `freshDraftJobIds` → the build goes red while the tests stay green.
  - **Red run:** observed at baseline on 2026-10-27 with a temporary probe spec, since deleted:
    - test 1's reload assertion → `Expected: 1 / Received: 0`;
    - test 8 → `- Expected [2] / + Received [1]`.
    - Tests 2–7, 9 and 10 target `freshDraftJobIds` / `consumeFreshDraftJobs`, which do not exist yet: `predicted — greenfield artifact (observed in ADN-T-1)`. Quote their first red verbatim in `execution.md`.
  - **Disqualifier:**
    - A count assertion taken without `TestBed.tick()` first is not evidence. The probe showed a deferred effect makes it pass on unfixed code. Re-run with ticks before reporting.
    - If any existing `bilateral-ai.service.spec.ts` test needs its expectation changed (not just its setup), stop and report it as a Pivot. Do not edit the expectation.
  - **Consumers (P-8):** `bilateral-ai.service.spec.ts`, `bilateral.component.spec.ts`, `ai-processes-drawer-host.component.spec.ts`, `bilateral-ai-upload.component.spec.ts`, `bilateral-result-creator.component.spec.ts`, `my-draft-results.component.spec.ts`, `bilateral-overview.cy.ts`. Run the 6 Jest files: `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage`.
- **Done criteria:**
  - [x] Tests 1–11 green. Each greenfield test's first red is quoted in `execution.md`.
  - [x] Each falsifier above was applied once against the post-change code and observed red, then reverted.
  - [x] The whole `src/app/pages/bilateral` Jest suite is green, and `npx ng lint --quiet` is clean.
  - [x] `npx ng build --configuration development` exits 0.
  - [ ] No secrets logged (`.cursorrules`). Commit format per root `CLAUDE.md`.

### `ADN-T-2` — Component, template, copy and guide: the "New" badge and its lifecycle

- **Status:** [x] done (Reviewer PASS attempt 1 + HITL approved, 2026-10-27; budget overrun accepted by user)
- **Type:** client
- **Size:** M
- **Description:**
  - Add `isNew` to the exported `DraftSessionGroup`, derived in `sessionGroups()` from `freshDraftJobIds()` by `sessionId`. The `draft-<id>` fallback is never new.
  - Add a component-local `shownFreshIds`. An effect reads `sessionGroups()` (and its other signals) unconditionally, before any early return, and collects the ids of `isNew` groups.
  - Consume on `ngOnDestroy`, and on every transition of `ctx.centerInstitutionId()` away from a non-null value (`null`→X never consumes).
  - Render the badge in the session header after the creator badge:
    - visible `New`;
    - `material-icons-round` `auto_awesome` with `aria-hidden="true"`;
    - an `sr-only` suffix;
    - violet tokens from pattern 10;
    - `data-testid="mdr-session-new-badge"`.
  - There is no card styling change.
  - Add `drafts.newBadge` to `BILATERAL_AI_PROCESSES_COPY`.
  - Update `my-draft-results/CLAUDE.md` (Contract, Traps P-9/P-10, `Verified:`) and keep it ≤ 120 lines.
- **Implements:**
  - `ADN-R-1`:
    - scenario "Run finishes…": "only that group" and "earlier groups unmarked";
    - AND IT MUST "not another user's job": a teammate group whose id is not in the set stays unmarked;
    - scenario "Two own jobs": both groups marked.
  - `ADN-R-2`: "new group appears with the indicator", and the BUT "not clear search/filters, not close the Review aside".
  - `ADN-R-3`:
    - scenarios "Leave and come back", "Actions inside the tab keep the mark" (Review open/close, filter change, delete another draft) and "Switch center and come back";
    - "mark shows on the next visit", from the component side.
  - `ADN-R-4`: all five bullets.
  - `ADN-R-5`: component side.
  - `ADN-AC-1`, `ADN-AC-2`, `ADN-AC-4` (UI part), `ADN-AC-5`, `ADN-AC-6`, `ADN-AC-7`, `ADN-AC-8` (component part).
- **Design refs:** §6.2 rows `DraftSessionGroup`, `sessionGroups`, consume, template, copy and `CLAUDE.md`; §6.3; `ADN-DD-3`, `ADN-DD-4`, `ADN-DD-5`; P-6, P-9, P-10, P-14
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md`
  - `onecgiar-pr-client/src/app/internationalization/bilateral-ai-processes.copy.ts`
- **Depends on:** `ADN-T-1`
- **Blocks:** —
- **Review:** `full` — changes an exported interface and adds a DOM hook
- **Skills:** `angular-developer`, `tailwind-design-system`, `tdd`
- **Tests (in `my-draft-results.component.spec.ts`, using a writable `freshDraftJobIds` signal on the service stub):**
  1. Drafts from jobs A (fresh), B (not fresh) and a teammate's job C (not fresh) → only A's group has `isNew` and renders `[data-testid="mdr-session-new-badge"]`. The badge text contains `New`, its icon has `aria-hidden="true"`, and the `sr-only` suffix equals the copy constant.
  2. A and D are both fresh → two badges.
  3. A search term and a project filter are set and `selectedDraft` is open; the `draftList` is then swapped to include the new job → the filters and `selectedDraft` are unchanged, and the new group renders the badge.
  4. Review open/close, a filter change, and `discardDraft` on another draft (same-route navigation, component kept) → `consumeFreshDraftJobs` is not called and the badge stays.
  5. `fixture.destroy()` → `consumeFreshDraftJobs` is called with exactly the shown ids. A fresh id whose drafts were never in the list is not passed.
  6. Center 12→`null`→13 → consume is called at the 12→`null` step. A cold `null`→12 mount → not called.
  7. Promote any draft (destroy after navigation) → consume is called with all shown ids, including a group whose only draft was promoted.
  8. No `POST_*` / `DELETE_*` is triggered by rendering or by consuming.
- **Verification:**
  - **Command:** `cd onecgiar-pr-client && npx jest src/app/pages/bilateral/pages/my-draft-results --silent --reporters=summary --no-coverage`, then `npx ng build --configuration development`, `npx ng lint --quiet` and `wc -l src/app/pages/bilateral/pages/my-draft-results/CLAUDE.md` (≤ 120).
  - **Falsifier:**
    - Derive `isNew` from `group.isCurrentUser` instead of the set → test 1 goes red (B is marked).
    - Consume from `allDrafts()` at destroy (revision-1 rule) → test 7 goes red (the promoted group's id is missing).
    - Consume on `null`→X → test 6 goes red.
    - Read `sessionGroups()` only after an early return in the shown-ids effect → test 5 goes red (nothing collected).
    - Replace the visible `New` text with an icon only → test 1 goes red.
  - **Red run:** `predicted — greenfield artifact (observed in ADN-T-2)`. `isNew`, `shownFreshIds` and the badge do not exist at specify time. Quote each test's first red verbatim in `execution.md`, and check it fails on the behavioral assertion, not on setup.
  - **Disqualifier:**
    - Test 1's assertion holds only if the selector matches a real element in the shipped template. If the badge query matches nothing on both pre- and post-change code, the gate is inert. Assert the badge count is ≥ 1 in the positive case.
    - jsdom cannot evaluate layout, wrap, truncation or contrast. A green Jest run says nothing about `ADN-D6`/`ADN-D7`.
  - **Consumers (P-8):** `my-draft-results.component.spec.ts` pins `sessionGroups()` at `:793,811,1185,1217,1245,1269`. Update the fixtures only if the new `isNew` field breaks a deep-equality check, never the expectations. `grep -rn "mdr-session-card\|mdr-creator-badge" src cypress` must be re-run and listed in `execution.md` before the task closes.
- **HITL visual check (`ADN-D6`, `ADN-D7`; substitute for the missing automated gate):**
  - On `npm start`, with an own job completed in-session, measure the session header at **375, 900, 1000 and 1280 px** (effective CSS px, host zoom 100 %). Do it **before** the change (baseline) and after.
  - Check that the badge is visible and on-screen, and that no existing header item is pushed out of view or gains truncation beyond the baseline. At 1280 the narrowest single-row `xl` layout applies (P-14).
  - Check that the violet text reads clearly on its background.
  - The check is done by the user at the execute HITL pause, or by a T6 screenshot review. The result is recorded in `execution.md`.
- **Done criteria:**
  - [x] Tests 1–8 green. The first red of each is quoted in `execution.md`.
  - [x] Each falsifier was applied once post-change, observed red, then reverted.
  - [x] The `src/app/pages/bilateral` Jest suite is green, lint is clean, and the build exits 0.
  - [x] `CLAUDE.md` is ≤ 120 lines with `Verified:` bumped.
  - [x] The HITL visual check passed at all 4 widths against the measured baseline.
  - [x] Strings come only from `bilateral-ai-processes.copy.ts`.

---

## 4. Dependency graph

```
ADN-T-1 (service)
   └── ADN-T-2 (component / template / copy / guide + HITL check)
```

The tasks are sequential: `ADN-T-2` consumes `freshDraftJobIds` and `consumeFreshDraftJobs`.

## 5. Coverage — scenario and clause level

| Requirement · scenario / clause | Owner |
|---|---|
| R-1 "Run finishes": the set holds the job | T-1 (test 1) |
| R-1 "Run finishes": only that group is marked, earlier groups are not | T-2 (test 1) |
| R-1 BUT not a job terminal before being seen active | T-1 (test 4) |
| R-1 AND IT MUST not another user's job | Server scope (P-1), plus T-2 test 1 (teammate group C unmarked) |
| R-1 "Failed or empty job" | T-1 (tests 2, 3) |
| R-1 "Two own jobs" | T-1 (test 6) + T-2 (test 2) |
| R-2 the list refreshes on its own | T-1 (tests 1, 6, 8) |
| R-2 the new group appears with the indicator | T-2 (test 3) |
| R-2 BUT keeps search/filters and does not close the aside | T-2 (test 3) |
| R-3 "Leave and come back" | T-2 (test 5) |
| R-3 "Actions inside the tab keep the mark" (Review, filters, delete) | T-2 (test 4) |
| R-3 "Job finished, not visited": stays fresh and shows on the next visit | T-1 (test 7 — consume is selective) + T-2 (test 5 — an unlisted id is not consumed) |
| R-3 AND IT MUST be lost on a reload after finish | T-1 (test 4); the counter-case, a reload mid-run still marks, is T-1 test 5 |
| R-3 "Switch center and come back" | T-2 (test 6) |
| R-3 Create Result counts as leaving (AC-5) | T-2 (test 7) |
| R-4 visible "New" text | T-2 (test 1) |
| R-4 pattern-10 tokens, `material-icons-round`, icon `aria-hidden` | T-2 (test 1) + review |
| R-4 accessible name | T-2 (test 1, `sr-only` suffix) |
| R-4 no header item pushed out at 375/900/1000/1280 | T-2 HITL check |
| R-4 i18n | T-2 (done criterion) |
| R-5 no write request; content, status and order unchanged | T-1 (test 11) + T-2 (test 8) |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ADN-TEST-1` | unit (client) | `ADN-D1`, `ADN-D2`, `ADN-D4` (service) | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` |
| `ADN-TEST-2` | unit (client) | `ADN-D1`, `ADN-D2`, `ADN-D3`, `ADN-D4`, `ADN-D7` (accessible name) | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts` |
| `ADN-TEST-3` | build | `ADN-D5` | `npx ng build --configuration development` |
| `ADN-TEST-4` | HITL visual | `ADN-D6`, `ADN-D7` (contrast) | manual, at 375/900/1000/1280 px |

## 7. Rollout & verification

- [ ] PR to `staging`. Commit format: `<emoji> <type>(<scope>) [ticket]: <description>`.
- [ ] CI green (lint, Jest with client thresholds 50/60/60/60, build, SonarCloud).
- [ ] Manual QA on test/staging: run an AI job, watch it finish on the Drafts tab, leave and return, switch center.

## 8. Roll-back plan

1. Revert the PR. There is no migration, flag or payload change.
2. Nothing to notify downstream (`bilateral-result-summaries.en.md` untouched).

## Required cross-references

`requirements.md`, `design.md`, `judgment.md` (same folder) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`.
