# Tasks — Center focal point routing for replicated-innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Requirements / Design | `requirements.md` (RCF-R-1…11) · `design.md` (RCF-DD-1…6, P-1…13) |
| Status | approved 2026-11-13 |
| Budget | 5 tasks · ≈650 LOC · 6 review rounds (design §11) |
| Test rules | Every Jest run uses `--maxWorkers=2` plus a `--testPathPattern` scoped to the touched files. Before push, run `--findRelatedTests` on the changed files. One test run on the machine at a time. Never run the full suite |

## 1. Pre-flight

- [ ] Branch `qa-development-2026-ss`, tree clean except this spec.
- [ ] RIR is live in PROD (PR #786). No open campaign this phase. If one is open, tell the user before T-5.

## 2. Task list

### RCF-T-1: Migration RCF-CenterRouting + entity [x]

- **Type:** migration · **Estimate:** S · **Review:** full (data + copy in PROD)
- **Implements:** RCF-R-1 (storage, default off), RCF-R-6, RCF-R-11; RCF-DD-1, DD-5, DD-6.
- **Scope:**
  - **First step:** settle **P-12**. Grep the RIR migrations for `bilateral`, and the user runs a `SELECT` on the Center template row in prdb. Record the result in `execution.md`.
  - Create `center_reminder_routing` (design §5) with entity `entities/center-reminder-routing.entity.ts`, registered in the module.
  - Insert ICARDA with `route_all_to_center = 1`, resolved as in the seed (P-9).
  - Run the `REPLACE` from DD-5 on the Center template row only.
  - `down` reverses all three steps.
  - **Backend route:** `nestjs-expert` (TypeORM migration/entity) · test-first: no.
- **Files:**
  - `src/migrations/<ts>-RCF-CenterRouting.ts`
  - `src/api/replicated-innovation-reminders/entities/center-reminder-routing.entity.ts`
  - `replicated-innovation-reminders.module.ts`
- **Depends on:** — · **Blocks:** T-2, T-3, T-5
- **Verification:**
  - `npm run migration:check` is clean after the entity is added.
  - `npx tsc --noEmit -p onecgiar-pr-server/tsconfig.json`.
  - HITL: the user runs up → down → up on prdb.
    - After up: 1 ICARDA row (flag 1), template text without "bilateral".
    - After down: table gone, text restored.
  - `npx eslint <touched files> --quiet`.
- **Falsifier:** any of these goes red:
  - `down` leaves "bilateral" missing;
  - a second template row changes (compare the `COUNT` of rows whose body changed = 1);
  - ICARDA's code resolves to NULL (the insert must fail loudly, not insert NULL).
- **Red run:** predicted — greenfield artifact (observed in RCF-T-1: before `up`, `SELECT COUNT(*) FROM center_reminder_routing` errors with "table doesn't exist").
- **Disqualifier:** a prdb check run on a DB where a previous attempt already applied the migration (verify `migrations` table state first). Such a check is not evidence; re-run from a clean down.
- **Consumers:** the template row is read by the dispatcher's Center send. No client consumer.
- **Skills:** `nestjs-expert`.
- **Done:**
  - [x] P-12 settled and recorded.
  - [x] up/down/up evidence in `execution.md`.
  - [x] Migration check clean.

### RCF-T-2: Routing in `build()` + dispatcher (TDD) [x]

- **Type:** server logic · **Estimate:** M · **Review:** full (core routing)
- **Implements:**
  - RCF-R-2 (both scenarios);
  - RCF-R-3 (equality scenario);
  - RCF-R-4 (W3-only and mixed scenarios, incl. "must NOT hold SP02 only because of W1" and "no To address in CC");
  - RCF-R-5;
  - RCF-R-10 (the preview uses the same `build()`);
  - RCF-NFR-1 (key `CENTER:<code>`);
  - RCF-DD-2, DD-3.
- **Scope:**
  - `BuildInput.optedInCenters: Set<string>`, applied as described in design §7.
  - Center email CC from the W1/W2 rows.
  - New repository method `findOptedInCenters()`.
  - Dispatcher: union of the center codes; pass the set to `build()`.
  - **Backend route:** `nestjs-expert` + `tdd` · test-first: yes.
- **Files:**
  - `digest-builder.ts` + `.spec.ts`
  - `reminder-dispatcher.service.ts` + `.spec.ts`
  - `repositories/pending-innovation.repository.ts` + `.spec.ts`
- **Depends on:** T-1 · **Blocks:** T-5
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --testPathPattern="replicated-innovation-reminders/(digest-builder|reminder-dispatcher|repositories/pending-innovation)"`.
  - `npx tsc --noEmit -p tsconfig.json`.
  - `npx eslint <touched files> --quiet`.
- **Falsifiers** (each must turn a spec red when applied to the post-change code):
  - (a) Delete the opted-in check → the ICARDA fixture's developer V receives D1.
  - (b) Compute CC from all rows → the mixed fixture's CC contains SP02's MELIA.
  - (c) Compute CC from no rows → the mixed fixture's CC is empty.
  - (d) Dispatcher omits opted-in codes from the center lookup → the ICARDA email becomes `NO_CENTER_MEL`.
  - (e) Equality fixture: the existing revision-2 fixture with `optedInCenters` empty must deep-equal its current expected output. Any change to the non-opted path → red.
- **Fixtures must:**
  - include a developer on both an opted-in and a non-opted Center (RCF-R-2 scenario 2);
  - include an Innovation Use row of the opted-in Center;
  - include a W3 row of a non-opted Center.

  Without these, falsifiers (a)–(c) cannot diverge.
- **Red run:** predicted — new input field (observed in RCF-T-2). Required: the scenario specs fail on the **assertion** (wrong recipients or CC), not on a TS compile error. Type the fixture so it compiles before the implementation exists.
- **Disqualifier:** a green run under a jest config that does not type-check while `tsc` reports errors. `tsc` must also be green.
- **Consumers:**
  - `digest-builder.spec.ts`
  - `reminder-dispatcher.service.spec.ts`
  - `replicated-innovation-reminders.service.spec.ts` (if it builds `BuildInput`; grep at start)

  Design P-11.
- **Skills:** `nestjs-expert`, `tdd`.
- **Done:**
  - [x] Red on assertions recorded, then green.
  - [x] All 5 falsifiers executed and observed red.
  - [x] `tsc` green.

### RCF-T-3: Admin API for focal points and opt-in [x]

- **Type:** server API · **Estimate:** M · **Review:** full (auth + writes)
- **Implements:**
  - RCF-R-7 (add, edit, deactivate/reactivate, no hard delete; validation scenario incl. "must NOT create a second row");
  - RCF-R-8 (toggle + warning with 0 active contacts);
  - RCF-R-9 (non-admin 403, nothing changes);
  - RCF-DD-4.
- **Scope:** the 4 endpoints of design §6, `CenterFocalPointsService`, DTOs with `class-validator`, and lower-case trimming of emails.
  - Duplicate → 409. Also catch the unique-index error.
  - Unknown Center → 400.
  - **Backend route:** `nestjs-expert`, `api-design-principles`, `error-handling-patterns` · test-first: no.
- **Files:**
  - `center-focal-points.service.ts` + `.spec.ts`
  - `dto/upsert-center-focal-point.dto.ts`
  - `dto/update-center-routing.dto.ts`
  - controller + `.spec.ts`
  - module
- **Depends on:** T-1 · **Blocks:** T-4
- **Verification:**
  - `npx jest --maxWorkers=2 --silent --testPathPattern="replicated-innovation-reminders/(center-focal-points|replicated-innovation-reminders.controller)"`.
  - `npx tsc --noEmit -p tsconfig.json`.
  - eslint on touched files.
  - The controller spec asserts that each new handler carries `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` metadata (same pattern as the campaigns spec).
- **Falsifiers:**
  - drop `@UseGuards` on one new handler → the metadata spec is red;
  - remove the duplicate check → the service spec expecting 409 is red;
  - a DELETE route exists → spec red (route table assertion).
- **Red run:** predicted — greenfield artifact (observed in RCF-T-3).
- **Disqualifier:** a guard "test" that mocks `ValidRoleGuard` to always allow and then asserts 200. That proves nothing about RCF-R-9. The real 403 is checked in T-5.
- **Consumers:** the client `results-api.service.ts` (T-4). There is no other reader (new routes).
- **Skills:** `nestjs-expert`, `api-design-principles`, `error-handling-patterns`.
- **Done:**
  - [x] Specs green.
  - [x] Falsifiers observed.
  - [x] Response shapes match design §6.

### RCF-T-4: Admin UI — Center focal points section [x]

- **Type:** client UI · **Estimate:** M · **Review:** checklist (contained, behind admin)
- **Implements:**
  - RCF-R-7 (list/add/edit/deactivate, inline 400/409);
  - RCF-R-8 (toggle + warning);
  - design §8 states (loading, error + retry, empty).
- **Scope:**
  - **First step:** settle **P-13** (check the Spartan switch/checkbox in `@spartan/*`). Otherwise use an `HlmButton` toggle.
  - New `CenterFocalPointsComponent` (standalone, signals), hosted in the reminders panel.
  - New API methods `GET_centerFocalPoints`, `POST_centerFocalPoint`, `PATCH_centerFocalPoint`, `PATCH_centerRouting`.
  - New interfaces and copy keys.
  - **Design route:** existing panel primitives (HlmTable, HlmDialog, HlmInput, HlmBadge, HlmSkeleton); no new tokens · lead `spartan`.
- **Files:**
  - `.../replicated-innovation-reminders/center-focal-points/*`
  - `replicated-innovation-reminders.component.{html,ts}`
  - `shared/services/api/results-api.service.ts`
  - `shared/interfaces/replicated-innovation-reminders.interface.ts`
  - `internationalization/replicated-innovation-reminders.copy.ts`
- **Depends on:** T-3 · **Blocks:** T-5
- **Verification:**
  - `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="replicated-innovation-reminders"`.
  - `npx eslint <touched files> --quiet`.
  - `npx ng build` (type-check).
- **Falsifiers:**
  - the toggle does not call `PATCH_centerRouting` → spec red;
  - a 409 response is not shown inline → spec red;
  - the warning is not shown when the response has `warning` → spec red.
- **Red run:** predicted — greenfield artifact (observed in RCF-T-4).
- **Disqualifier:** jsdom cannot judge layout or visual fit. Specs prove the wiring only. The visual check happens in T-5 (HITL).
- **Consumers:**
  - `replicated-innovation-reminders.component.spec.ts` (host template changes)
  - `reminder-api.spec.ts` (API service URLs)
  - `reminder-preview-drawer.component.html:43-45` (design P-6: already renders CC for Center emails; confirm it needs no change)

  Grep all of them before editing.
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`.
- **Done:**
  - [x] Specs green.
  - [x] Falsifiers observed.
  - [x] `ng build` green.
  - [x] Existing reminders specs still green.

### RCF-T-5: PRTest smoke + PROD count (HITL)

- **Type:** manual verification · **Estimate:** S · **Review:** skip-eligible
  - **Reason:** no code. The claim to prove: every check below is recorded with evidence in `execution.md`.
- **Implements:** RCF-R-9 (real 403), RCF-R-10, RCF-R-11, UI states; proposal R-2.
- **Scope:** after the user pushes to perf/PRTest (no agent push without the user's go-ahead):
  1. As admin: open the panel and add a test contact to ICARDA. The preview shows one ICARDA Center email with W1/W2 + W3 rows and MELIA CC, and no ICARDA-led rows in the developer digests.
  2. Toggle ICARDA off → the preview returns to today's routing. Toggle it back on.
  3. As a non-admin: call one new endpoint → 403.
  4. Visual check of the section (light/dark, empty/error states).
  5. Read-only PROD SQL (pasted inline in chat, env stated): ICARDA-led pending replicated innovations by source and type, and the active ICARDA focal points.
  - The user does not click Send in PRTest unless the user decides to, because of the shared mailer.
- **Depends on:** T-1…T-4
- **Verification:** screenshots/notes per step in `execution.md`.
- **Falsifier:** step 1 shows an ICARDA-led row in a developer digest → FAIL.
- **Red run:** n/a — manual.
- **Disqualifier:** a preview taken on a phase with no ICARDA-led pending rows proves nothing. Pick a phase/center with at least one W1/W2 and one W3 row (from step 5).
- **Consumers:** none.
- **Skills:** `claude-in-chrome` (read-only browsing; never click write buttons without the user's go-ahead).
- **Done:**
  - [ ] 5 steps recorded.
  - [ ] PROD count shared with the user for the reply to Nicoleta/Enrico.

## 3. Coverage (scenario/clause level)

| Clause | Task |
|---|---|
| R-1 default off | T-1 (no row = off), T-2 (empty set fixture) |
| R-2 ICARDA scenario + BUT V not emailed + MUST NOT be in MELIA summary | T-2 falsifier (a) + fixture |
| R-2 developer on two Centers | T-2 fixture |
| R-3 equality | T-2 falsifier (e) |
| R-4 W3-only no CC · mixed CC · BUT not SP02 · no To in CC | T-2 falsifiers (b)(c) + spec |
| R-5 unreachable, no fallback | T-2 falsifier (d) + spec |
| R-6 no "bilateral" | T-1 |
| R-7 list/add/edit/deactivate · no hard delete · validation + MUST NOT duplicate | T-3 (server), T-4 (UI) |
| R-8 toggle + warning | T-3, T-4 |
| R-9 403 + nothing changes | T-3 metadata spec, T-5 real call |
| R-10 preview | T-2 (same `build()`), T-5 step 1 |
| R-11 ICARDA at release | T-1 insert, T-5 step 5 |
| NFR-1 key · NFR-2 redirect | T-2 (keys unchanged), existing dispatcher specs |
| NFR-3 no bilateral change | Reviewer: the diff touches no `api/bilateral` path |
| NFR-4 reversible migration | T-1 |

## 4. PR strategy

One PR: ≈650 LOC, of which tests are >50%. Review order: T-1 → T-2 → T-3 → T-4. If the date gets tight, T-1 + T-2 can ship first: ICARDA routing works with Enrico seeded, and Joren can be added by SQL until T-3/T-4 land.
