# Module Spec — Bilateral Contributor Tagging — Tasks

> **Answer first:** 7 tasks, ~900 LOC (~420 prod + ~480 tests), 2 PRs. The resolver lands first (T1). Derivation (T3) and the notification emitter (T4) then fork in parallel, the client (T6) follows the catalog field (T2), and T7 closes with the docs and the manual gates.

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `notifications` / bilateral contributor tagging |
| Linked spec | `requirements.md` + `design.md` (same folder) |
| Tickets | P2-3793 (US P2-3792) |
| Owner / driver | Juan David Delgado |
| Base branch | `performance-refactor` (never `staging`, which lacks the Centers module) |
| Status | in-progress (T1–T6 done; T7 pending) |
| Budget (design §14) | 7 tasks · ~900 LOC · 2 review rounds. Escalate beyond 9 tasks or ~1,200 LOC |

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved (2026-09-22).
- [ ] Open questions: BCT-OQ-2 resolved (DD-4). BCT-OQ-1 (tell Ángel) does not block code.
- [x] Worktree has `onecgiar-pr-client/src/environments/environment.ts` and `onecgiar-pr-server/.env` copied in. Without them every client suite dies with `Cannot find module` / `Tests: 0`.
- [ ] Branch rechecked right before every commit (several terminals share checkouts).
- [ ] No conflicting in-flight spec on `results_center` or `result-tagged-notification` (`docs/specs/notifications/` checked: `bilateral-review-decision` touches other types only).
- [ ] No migration → `migration:check` must stay green (T7).
- [ ] **Never run the whole server suite.** Always `npx jest --testPathPattern="<path>"`.

## 3. Task list

### [x] BCT-T-1 — Extract the project-owner resolver

- **Type:** server
- **Description:** Add the pure function from design §5.1 (project + preloaded Center index → `{ code, institutionId } | null`, org-code first, then the W3 alias map) in `api/bilateral/utils/project-owner-center.util.ts`. Make `ResultTaggedNotificationService.resolveProjectCenterCode` delegate to it, loading the Center index once per call. Behavior must stay identical.
- **Implements:** BCT-R-1 (resolution part), BCT-R-7 (resolution part), BCT-NFR-5; design DD-1, §5.1
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/utils/project-owner-center.util.ts` (+ `.spec.ts`); `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts`
- **Depends on:** —
- **Blocks:** T2, T3, T4
- **Estimate:** S
- **Review:** full (shared symbol, three future consumers)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** a project with `organizationCode = null` and `sourceCenterAcronym` in the alias map returns null, **or** any existing case in `result-tagged-notification.service.spec.ts` changes outcome.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern="project-owner-center.util"` (red: module missing) → green; then `npx jest --testPathPattern="result-tagged-notification.service"` green **with zero edits to existing assertions**.
  - **Disqualifier:** if the existing spec needs an assertion changed (not just a mock or constructor fixture), the extraction is not behavior-preserving. Stop and re-specify.
  - **Consumers:** `resolveProjectCenterCode` → `notifyTaggedBilateralProjects` (`:105`). The spec's hand-built constructor is at `result-tagged-notification.service.spec.ts:43`.
- **Definition of done:**
  - [x] Four resolver cases: org hit · org miss → alias hit · unknown alias → null · both null → null.
  - [x] Existing notification spec green with unchanged assertions.
  - [x] `npx eslint` on the touched files, quiet.

### [x] BCT-T-2 — Add `owner_center_institution_id` to the projects catalog

- **Type:** server
- **Description:** `ClarisaProjectsService.findAll` adds `owner_center_institution_id: number | null` to each row, using the T1 resolver with one Center-index load.
- **Implements:** BCT-R-3 (data for the lock on load), BCT-NFR-3 (additive only), BCT-NFR-5; design DD-4, §4
- **Files (expected):** `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.service.ts` (+ spec; create it if absent), `clarisa-projects.module.ts` if a Center repository must be provided
- **Depends on:** T1
- **Blocks:** T6
- **Estimate:** S
- **Review:** checklist
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  - **Falsifier:** an Alliance-descended fixture (null org, known acronym) yields `null`; **or** any pre-existing field disappears or is renamed on a row.
  - **Red run:** `npx jest --testPathPattern="clarisa-projects.service"` (red: field absent) → green.
  - **Disqualifier:** if the Center lookup cannot be provided to `ClarisaProjectsModule` without an import cycle, switch to the DD-4 alternative endpoint and re-specify T6.
  - **Consumers:** `GET clarisa/projects/get/all` is read by 7 client files (results, ipsr, bilateral, bilateral-review). They are additive-safe; T6 is the only reader of the new field.
- **Definition of done:**
  - [x] Spec asserts field present, null when unresolved, and old fields intact.
  - [x] Swagger response description mentions the field.

### [x] BCT-T-3 — Derive owner Centers on save and on ingest

- **Type:** server
- **Description:** Implement `BilateralService.ensureDerivedContributingCenters(resultId, userId)` per design §5.2 (bilateral-only; active non-lead projects; exclude leading codes; insert or reactivate; **never deactivate, never `updateCenter`**; batched lookups; warn on an unresolved owner; try/catch). Call it from `saveContributors` after the `sync*` block, only when `dto.contributing_bilateral_projects !== undefined`, and from ingest right after `handleContributingCenters` (`bilateral.service.ts:486`).
- **Implements:** BCT-R-1 (all scenarios), BCT-R-2, BCT-R-3 (scenario "re-adds a Center removed by other means"), BCT-R-4 (server half), BCT-R-5, BCT-NFR-1, NFR-3, NFR-4, NFR-5, NFR-6; design DD-2, §5.2
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+ spec), `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+ spec)
- **Depends on:** T1
- **Blocks:** T7
- **Estimate:** M
- **Review:** lenses (writes `results_center`, which is where the lead-wipe incident lived)
- **Skills:** `nestjs-expert`, `tdd`, `error-handling-patterns`
- **Verification:**
  - **Falsifier (any one fails the task):**
    - a CIP-owned project on an AfricaRice result leaves no active CIP row;
    - the AfricaRice lead row is changed in any column;
    - an AfricaRice-owned project inserts a row;
    - an inactive CIP row stays inactive;
    - `updateCenter` or any deactivating update is called by the new method;
    - a pool funding result gets a row;
    - a save **without** `contributing_bilateral_projects` triggers the lookup;
    - ingest with `contributing_center: [CIP]` plus a CIP project yields two CIP rows;
    - a throwing repository makes `saveContributors` or ingest fail;
    - `clarisa_projects` is queried once per project (loop) instead of once with `In`.
  - **Red run:** `npx jest --testPathPattern="bilateral.service.spec|bilateral-center.service.spec"` (red: method missing) → green; `npx tsc --noEmit` (server) green.
  - **Disqualifier:** if the form round-trip (sync deactivates, derivation reactivates) breaks an existing `saveContributors` assertion **beyond** fixtures that contain a foreign-owned project, stop. DD-2's reversion challenge predicted only those.
  - **Consumers:** `saveContributors` (`bilateral-center.service.ts:1332`); ingest closure (`bilateral.service.ts:470-492`). `BilateralService` is built with `new` at `bilateral.service.spec.ts:148` (no constructor change in this task).
- **Definition of done:**
  - [x] Each falsifier bullet has a test.
  - [x] Unresolved owner: warning with ids only.
  - [x] Existing `saveContributors` / ingest specs green.

### [x] BCT-T-4 — Tagging emitter for bilateral submissions

- **Type:** server
- **Description:** Add an optional `leadIn` to `emitFor` (absent → today's `created by …` text, verbatim). Add `notifyBilateralContributorsOnSubmission(resultId, emitterUserId)` per design §5.3: status 5 and bilateral guard; reporting Center `acronym || code` (fallback `a CGIAR Center`); **project targets first** with label `<shortName ?? fullName ?? 'project <id>'> of your center`, skipping `is_lead` rows and unresolved owners; then non-leading Center targets; try/catch. Register `ResultsCenter` and `ResultsByProjects` in `NotificationModule`'s `TypeOrmModule.forFeature`.
- **Implements:** BCT-R-7, BCT-R-8, BCT-R-9, BCT-R-10 (status guard), BCT-R-11, BCT-R-12, BCT-NFR-1, NFR-2, NFR-6; design DD-5, §5.3, §5.4
- **Files (expected):** `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ spec), `onecgiar-pr-server/src/api/notification/notification.module.ts`
- **Depends on:** T1
- **Blocks:** T5
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier (any one fails the task):**
    - an existing pool funding case produces a text different by one byte;
    - a status 1, 8 or 7 result emits anything;
    - with CIP both derived and owner, CIP users get two rows **or** get the Center text;
    - the lead project yields a target;
    - the leading Center row yields a target;
    - three hand-tagged Centers produce anything other than one call per Center naming that Center;
    - an already-notified user (from an earlier submission) is notified again;
    - a Center newly added before re-submission is **not** notified;
    - a Center with zero Center Users throws;
    - an unresolved project stops the remaining targets;
    - the lead-in reads a full name instead of the acronym;
    - `user_notification_settings` is read anywhere in the path;
    - a thrown repository error escapes the method.
  - **Red run:** `npx jest --testPathPattern="result-tagged-notification.service"` (red: method missing) → green; `npx tsc --noEmit` green.
  - **Disqualifier:** if the dedup cannot distinguish "already told about this result" without a phase filter, or AC32 and "a newly added Center is notified" conflict in a fixture, stop and re-specify BCT-R-9.
  - **Consumers:** `emitFor` ← `notifyTaggedCenters`, `notifyTaggedBilateralProjects` (callers: `results_by_institutions.service.ts:747-794`, `apply-framework-result-associations.service.ts:162`). They pass no lead-in, so their behavior is unchanged. Hand-built constructor at `result-tagged-notification.service.spec.ts:43`.
- **Definition of done:**
  - [x] Each falsifier bullet has a test.
  - [x] Emitter exclusion is asserted by passing `emitterUserId` through; the filtering itself stays covered by `notification.service.spec.ts` (not duplicated).
  - [x] Existing assertions unchanged.

### [x] BCT-T-5 — `announcePendingReview` at both hooks

- **Type:** server
- **Description:** Add `BilateralService.announcePendingReview(resultId, emitterUserId)` per design §5.5 (submitted notification, then tagging, each in its own try/catch). Inject `ResultTaggedNotificationService` as an `@Optional()` trailing constructor parameter. Replace the direct `emitBilateralSubmittedNotification` calls at `bilateral-center.service.ts:2040` and `bilateral.service.ts:536` (post-commit, unchanged position).
- **Implements:** BCT-R-10 (submit, ingest, `keep_editing` scenarios), BCT-R-7/R-8 trigger, BCT-NFR-1; design DD-3, §2.2, §5.5
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+ spec), `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+ spec)
- **Depends on:** T4
- **Blocks:** T7
- **Estimate:** S
- **Review:** checklist
- **Skills:** `nestjs-expert`
- **Verification:**
  - **Falsifier (any one fails the task):**
    - `submitForReview` no longer emits the submitted notification;
    - a throwing submitted emitter skips tagging (or the reverse);
    - either announcement runs before the transaction commits;
    - `saveContributors` calls `announcePendingReview`;
    - ingest with `keep_editing: true` produces tagging rows (guard lives in T4 — assert end to end with a status-1 fixture);
    - the service fails to construct when the optional dependency is absent.
  - **Red run:** `npx jest --testPathPattern="bilateral.service.spec|bilateral-center.service.spec"` → green; `npx tsc --noEmit` green. Grep `new BilateralService(` across `onecgiar-pr-server/src` and update every hit.
  - **Disqualifier:** if `NotificationModule` → `BilateralModule` turns into a cycle (BCT-P-10 refuted), stop; `forwardRef` needs a design note.
  - **Consumers:** `emitBilateralSubmittedNotification` stays public and unchanged; its two call sites move to `announcePendingReview`. `BilateralService` constructor → `bilateral.service.spec.ts:148` plus any other `new BilateralService(` hit.
- **Definition of done:**
  - [x] Both call sites switched; no remaining direct call outside `announcePendingReview`.
  - [x] Constructor fixtures updated wherever grep finds them.

### [x] BCT-T-6 — Lock and auto-select derived Centers in the form

- **Type:** client
- **Description:** In `SectionContributorsComponent`, per design §6.2: map `owner_center_institution_id` onto `ProjectOption`; add a computed locked set (owners of selected non-lead projects, minus the lead Center, minus nulls); `availableCentersComputed` disables lead **or** locked; `onProjectsChange` unions the locked set into the Center selection before its single persist; `onCentersChange` and `removeCenter` refuse locked ids like the lead; `hydrateLeadAndSelection` unions without persisting; removing a project never changes the Center selection. Read `section-contributors/CLAUDE.md` first.
- **Implements:** BCT-R-1 (scenarios "appears selected without reload" and "reporting Center's project"), BCT-R-3 (scenario "tries to remove a locked Center", including the chip), BCT-R-4 (client half), BCT-NFR-4 (client guard); design DD-4, §6
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts` (+ `.spec.ts`)
- **Depends on:** T2
- **Blocks:** T7
- **Estimate:** M
- **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier (any one fails the task):**
    - adding a CIP project leaves CIP unselected;
    - CIP is selectable/removable while its project is selected (via multiselect **or** `removeCenter`);
    - removing the CIP project deselects CIP, or leaves it disabled;
    - an AfricaRice-owned project locks anything;
    - the lead project's owner is locked;
    - hydrate triggers `autoSave.saveContributors`;
    - any payload is built before `contributorsHydrated()`;
    - one project change triggers two persists.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --no-coverage src/app/pages/bilateral/components/section-contributors` (red → green); `npx ng lint --quiet`.
  - **Disqualifier:** if the `Tests: 0` / `Cannot find module` output appears, the run is **not evidence**. Copy `environment.ts` and re-run before reading any result.
  - **What this gate cannot prove:** that PrimeNG renders the option visually disabled (jsdom). Covered at the T7 manual gate.
  - **Consumers:** `availableCentersComputed`, `disabledCenterOptions` (template), `buildContributorsPayload`, `bilateral-auto-save.service.ts:494`.
- **Definition of done:**
  - [x] Each falsifier bullet has a spec.
  - [x] `section-contributors.readonly.spec.ts` green (no regression of read-only mode).
  - [x] No new i18n strings (none are needed).

### [~] BCT-T-7 — Contract note and manual gates

- **Type:** docs / rollout
- **Description:** Add the change-log entry (design §4.1) to `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. Run the manual gates the automated suites cannot see and record the outcomes in `execution.md`.
- **Implements:** BCT-R-6, BCT-NFR-7, requirements §9 (the non-automatable rows), BCT-P-7, BCT-P-11
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`; `docs/specs/notifications/bilateral-contributor-tagging/execution.md`
- **Depends on:** T3, T5, T6
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** —
- **Verification:**
  - **Falsifier (any one fails the task):**
    - `npm run migration:check` reports a pending migration;
    - on prtest, a known Alliance-descended contributing project does not derive its Center;
    - in the browser, the derived Center shows enabled while its project is selected;
    - a bell item for scenario 7 renders without ` of your center` or without the result link;
    - `SHOW CREATE TABLE result_review_history` shows `action` without `UPDATE` in the target environment.
  - **Red run:** n/a (no test gate) — manual. `npm run migration:check` (server) is the one command.
  - **Disqualifier:** a manual check run on a local DB that lacks the environment's CLARISA rows proves nothing about Alliance projects. It must run where those rows exist.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [x] Change-log entry dated 2026-09 with P2-3793.
  - [ ] Each manual gate recorded as pass, fail or not-run in `execution.md`, with the environment named.
  - [ ] Ángel informed that Part A is beyond P2-3792 (BCT-OQ-1) — short message.

## 4. Dependency graph

```
BCT-T-1 (resolver)
 ├── BCT-T-2 (catalog field) ──── BCT-T-6 (client lock) ─┐
 ├── BCT-T-3 (derivation) ───────────────────────────────┤
 └── BCT-T-4 (emitter) ── BCT-T-5 (announce hooks) ──────┴── BCT-T-7 (docs + manual gates)
```

Parallel-safe after T1: **{T2 → T6}**, **{T3}** and **{T4 → T5}**. T3 and T5 both edit `bilateral.service.ts` and `bilateral-center.service.ts`, so run them **sequentially** or in one Implementer to avoid merge conflicts.

## 5. Coverage closure (scenario and clause level)

| Requirement · scenario / clause | Owner task | Test |
|---|---|---|
| R-1 · foreign project → Center stored | T3 | derivation insert |
| R-1 · appears selected without reload | T6 | auto-select on add |
| R-1 · BUT lead not deactivated, duplicated or demoted | T3 | lead row untouched; owner = lead skipped |
| R-1 · AND IT MUST keep user-selected Centers | T3 (never deactivates) + T6 (union, not replace) | both |
| R-1 · reporting Center's project → nothing added | T3 (row) + T6 (no lock) | both |
| R-1 · unresolved → save ok, project stored, no Center, warning | T3 | unresolved warns |
| R-2 · ingest project without Centers → stored | T3 | ingest derivation |
| R-2 · AND response shape identical | T3 | existing ingest response assertions unchanged |
| R-2 · BUT explicit Center not dropped or duplicated | T3 | sent + derived = one row |
| R-3 · locked shown disabled | T6 (logic) + T7 (visual) | lock spec; manual |
| R-3 · AND IT MUST NOT be removable by chip | T6 | `removeCenter` refuses |
| R-3 · PATCH with the project list, omitting the Center → still active (amended 2026-09-22) | T3 | omitted derived ends active |
| R-4 · project removed → stays, enabled | T6 | sticky spec |
| R-4 · AND removing CIP then deactivates on save | T6 (payload drops CIP) + T3 (no derivation once the project is inactive) | both |
| R-4 · BUT project removal MUST NOT deactivate CIP | T3 (never deactivates) + T6 (selection untouched) | both |
| R-5 · pool funding → no derivation | T3 | source guard |
| R-6 · change-log entry | T7 | manual review |
| R-7 · CIP users notified with text | T4 | project target text |
| R-7 · AND click opens General Information, marks read | T7 (existing routing; BCT-P-7) | manual |
| R-7 · BUT lead project MUST NOT notify | T4 | `is_lead` skipped |
| R-7 · AC36 other AfricaRice users notified, submitter not | T4 (emitter passed) + existing `notification.service.spec.ts` (filter) | both |
| R-8 · three Centers, one each naming own | T4 | three-Center fixture |
| R-8 · BUT reporting Center not notified | T4 | leading row skipped |
| R-9 · derived + owner → one, project text | T4 | order + dedup |
| R-9 · re-submission → none | T4 | already-notified fixture |
| R-9 · AND newly added Center IS notified | T4 | mixed fixture |
| R-10 · Editing / Draft saves → none | T4 (status guard) + T5 (`saveContributors` never announces) | both |
| R-10 · `keep_editing` → none | T5 (status-1 end to end) | ingest spec |
| R-10 · ingest complete → notifications | T5 | ingest announce |
| R-11 · emitter excluded | T4 + existing | as R-7 AC36 |
| R-11 · no Center Users → nothing, no error | T4 | zero-users fixture |
| R-11 · unresolved project skipped, others continue | T4 | mixed fixture |
| R-12 · existing texts byte-identical | T1 + T4 | existing assertions untouched |
| NFR-1 · failures never block | T3, T4, T5 | throwing mocks |
| NFR-2 · no settings filtering | T4 | falsifier: no settings read (dependency absent from the constructor) |
| NFR-3 · no bilateral shape change | T2 (additive, outside the contract), T3 (responses unchanged) | both |
| NFR-4 · no unintended empty list | T3 (never `updateCenter`) + T6 (hydration guard) | both |
| NFR-5 · batched lookups | T1, T2, T3 | `In` single-call assertion |
| NFR-6 · ids-only logs | T3, T4 | log assertion |
| NFR-7 · no migration | T7 | `migration:check` |

No clause is discharged by citing a different requirement.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BCT-TEST-1 | unit (server) | resolver | `api/bilateral/utils/project-owner-center.util.spec.ts` |
| BCT-TEST-2 | unit (server) | catalog field | `clarisa/clarisa-projects/clarisa-projects.service.spec.ts` |
| BCT-TEST-3 | unit (server) | derivation, ingest hook, announce | `api/bilateral/bilateral.service.spec.ts` |
| BCT-TEST-4 | unit (server) | form save hook, submit hook | `api/bilateral/services/bilateral-center.service.spec.ts` |
| BCT-TEST-5 | unit (server) | emitter, lead-in, order, dedup | `api/notification/services/result-tagged-notification.service.spec.ts` |
| BCT-TEST-6 | unit (client) | lock, auto-select, sticky, hydrate | `pages/bilateral/components/section-contributors/section-contributors.component.spec.ts` |
| BCT-TEST-7 | manual | Alliance derivation on prtest, visual disabled state, bell text, schema enum | recorded in `execution.md` |

Commands (scoped only):
- Server: `npx jest --testPathPattern="project-owner-center|clarisa-projects.service|bilateral.service.spec|bilateral-center.service.spec|result-tagged-notification" --silent --reporters=summary --forceExit` · `npx tsc --noEmit` · `npx eslint <touched files> --quiet`
- Client: `npx jest --silent --no-coverage src/app/pages/bilateral/components/section-contributors` · `npx ng lint --quiet`

## 7. Rollout & verification

- **PR 1 — server** (T1–T5, T7 docs): review T1 first (the extraction proof), then T3 (writes), then T4/T5. Out of scope: client.
- **PR 2 — client** (T6): depends on PR 1's catalog field; its description links PR 1.
- Merge to `performance-refactor` deploys automatically; do not measure the environment in the first minute.
- Jira: Ready For UAT only after the merge; SIDS-epic rules do not apply here (epic P2-3487).
- QA regression of P2-3792 scenarios 1–5 with an admin account or the open phase.

## 8. Roll-back plan

1. Revert PR 2, then PR 1.
2. No migration to revert.
3. Derived `results_center` rows written meanwhile are valid contributing Centers. Leave them, or deactivate them by hand only if business asks.
4. The payload shape never changed, so no consumer notice is needed beyond reverting the change-log line.
