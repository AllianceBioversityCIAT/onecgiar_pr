# Execution — Center focal point routing for replicated-innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-11-13 |
| Leader model | opus (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Persona drift | `akili doctor --agents` 2026-11-13: `leader.md › primary-instructions` OUTDATED (matched 2.36.0); implementer/reviewer CURRENT; tester `context-alignment` CUSTOM-EDITED. Not fixed on this branch (shared-file discipline) — pending `akili doctor --agents --fix` on `staging` |

## Pre-flight

- Branch `qa-development-2026-ss`; tree holds unrelated `AGENTS.md` + `bilateral-pdf-mds-only` edits from other work, not touched here.
- Open campaign check (PRTest, read-only, 2026-11-13): `replicated_innovation_reminder_campaign` with `is_active = 1 AND status NOT IN ('SENT','CANCELLED')` → 0 rows. **PROD check still owed before T-5.**

## Task Execution History

### RCF-T-1: Migration RCF-CenterRouting + entity — PASS

- **Date:** 2026-11-13
- **Attempts:** 1
- **Requirements covered:** RCF-R-1 (storage, default off), RCF-R-6, RCF-R-11, RCF-NFR-4; RCF-DD-1, DD-5, DD-6.

**P-12 settled** (user, PRTest prdb, read-only SELECT on `template` where `name LIKE 'email_template_replicated_innovation_%'`):

| name | body_pos | desc_pos | exact_phrase_pos (`' bilateral innovation(s)'`) |
|---|---|---|---|
| …_q4_notice | 0 | 0 | 0 |
| …_final_reminder | 0 | 0 | 0 |
| …_melia_summary | 0 | 0 | 0 |
| …_center | 2731 | 70 | 2730 |

Repo grep: "bilateral" only at `1791700000000-RIR-RecipientModelV2.ts:371` (Center body) and `:121` (Center `description`, metadata — not touched). Subject is built in code (`reminder-dispatcher.service.ts` `buildSubject`) with no "bilateral". → P-12 holds; REPLACE scoped to the Center row's `template` column is correct.

**Attempt 1**
- Files changed:
  - `onecgiar-pr-server/src/migrations/1793400000000-RCF-CenterRouting.ts` (new)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/entities/center-reminder-routing.entity.ts` (new)
  - `onecgiar-pr-server/src/api/replicated-innovation-reminders/replicated-innovation-reminders.module.ts` (`forFeature([Version, CenterReminderRouting])`)
- Implementer verification: `npx tsc --noEmit -p tsconfig.json` → exit 0; `npx eslint <3 files> --quiet` → exit 0; `npm run migration:check` → `Found 1 pending migration(s): RCFCenterRouting1793400000000` (expected before HITL `up`; script counts pending only, does not diff entities).
- Evidence re-run (Leader-inline, non-author): same three commands → tsc exit 0, eslint exit 0, migration:check lists only `RCFCenterRouting1793400000000` → **VERIFIED**.
- Falsifier: not executable without prdb; red run predicted (greenfield table). Covered by the HITL step below.
- Reviewer verdict: **PASS** — meets §5, DD-5, DD-6, R-1, R-6, R-11, NFR-4; all three falsifiers hold by construction (scoped inverse REPLACE before DROP; `WHERE name = …center AND INSTR(template, ?) > 0`; ICARDA resolver throws on NULL before INSERT); entity ↔ DDL match; no `api/bilateral` path touched (NFR-3).
- runtime events: none
- spawns: implementer 15 calls, 130781 tokens, ended partial (Not Done: P-12 prdb confirmation — since settled by user; entity-diff not checkable by migration:check); reviewer not reported by host, ended complete.

**Decisions made**
- REPLACE anchored on `'{{resultCount}} bilateral innovation(s)'` → `'{{resultCount}} innovation(s)'` instead of DD-5's bare `' bilateral innovation(s)'`. Post-`up` text is identical to DD-5's; `down` becomes an exact inverse that cannot touch an unrelated `' innovation(s)'`. Reviewer accepted against DD-5. No spec edit.
- ICARDA insert guarded by `NOT EXISTS` so a re-run never overwrites an admin-changed flag.
- Diff delivered to the Reviewer as a scratchpad file path (199 lines, under the 300-line inline threshold) — deviation from the inline rule, content identical.

**Not Done / Assumptions (Implementer, verbatim gist)**
- P-12 confirmed in repo only at report time → since settled on prdb by the user (table above).
- Entity ↔ DDL equivalence not checked by TypeORM's diff (`migration:check` does not diff); Reviewer checked by reading.

**ADVISORY (4R, not gating)**
- RISK: `down` drops `center_reminder_routing`; opt-ins added after release are lost on revert. Worth one line in design §12 rollback notes.
- RELIABILITY: neither REPLACE checks affected rows; if the PROD body differs from prdb, `up` silently changes nothing and R-6 fails. Mitigation without new scope: run the P-12 SELECT read-only on PROD before deploy (folded into T-5 step 5 checks).
- READABILITY/RISK: entity uses `@OneToOne` on the PK column; exemplar uses `@ManyToOne`. A future `migration:generate` could emit a redundant `REL_…` unique index. Not blocking.
- READABILITY: inserted ICARDA row has `created_by` NULL (nullable; matches seed migrations).

**HITL up → down → up on PRTest prdb (user, 2026-11-13, DBeaver screenshots)**

| Step | `center_reminder_routing` | `_center` body md5 / body_bil / desc_bil | other 3 RIR templates (q4, final, melia) |
|---|---|---|---|
| Baseline (before up) | error 1146 (red run observed) | `80a73639a322c90852a4e51f04b455b0` / 1 / 1 | `82e6cd66…` / `82e6cd66…` / `6a6756fe…` |
| After up #1 (`migration:run` → `RCFCenterRouting1793400000000 has been executed successfully`, COMMIT) | 1 row `CENTER-07 \| 1 \| 1` | `cef1867cc2a0645cefb87fdc41862b55` / 0 / 1 | unchanged |
| After down (`migration:revert`) | error 1146 | not captured directly — proven by up #2 (below) | — |
| After up #2 | 1 row `CENTER-07 \| 1 \| 1` | `cef1867c…` / 0 / 1 | unchanged |

- ICARDA code `CENTER-07` = Enrico Bonaiuti's `center_mel_focal_point.center_code` (seed row).
- Falsifier "a second template row changes" → not red: only `_center` md5 changed (COUNT = 1).
- Falsifier "`down` leaves bilateral missing" → not red, by inference: the post-down template query was not captured, but up #2 reproduced the identical md5 `cef1867c…`; the `up` REPLACE only fires on `INSTR(template, '{{resultCount}} bilateral innovation(s)') > 0`, so the phrase was present again after `down`, and the identical post-up md5 means the restored body was byte-identical to the baseline. Recorded as an inference, not a direct observation.
- Falsifier "ICARDA resolves to NULL" → not red: row inserted with `CENTER-07`.
- First attempt at the HITL failed only on procedure (shell command pasted into DBeaver → MySQL 1064); no DB change, rerun from the terminal.

**Done list**
- [x] P-12 settled and recorded.
- [x] up/down/up evidence on prdb (HITL, user).
- [x] Migration check clean (only the new migration pending before up).

**Final status: PASS** (Reviewer PASS + HITL evidence). prdb left with the migration applied.

**Running totals vs budget (design §11):** tasks 0/5 closed (T-1 code PASS) · LOC ≈ 199 diff lines (budget ≈650) · review rounds 1/6.

### RCF-T-2: Routing in `build()` + dispatcher (TDD) — PASS

- **Date:** 2026-11-13 · **Attempts:** 1 · **Approval:** user "continúa hasta que termines" (2026-11-13) — routine gates continue; exceptions still stop.
- **Requirements covered:** RCF-R-2 (both scenarios), R-3, R-4 (W3-only, mixed, not-SP02-only-because-of-W1, no To in CC), R-5, R-10, NFR-1, NFR-3; DD-2, DD-3.

**Attempt 1**
- Files changed (all `onecgiar-pr-server/src/api/replicated-innovation-reminders/`): `digest-builder.ts`, `digest-builder.spec.ts`, `reminder-dispatcher.service.ts`, `reminder-dispatcher.service.spec.ts`, `repositories/pending-innovation.repository.ts`, `repositories/pending-innovation.repository.spec.ts` (358+ / 5−).
- Consumer grep: P-11 holds (builder, its spec, dispatcher); `replicated-innovation-reminders.service.ts` calls only `plan()`, which now loads the opted-in set → preview/GET counts covered (R-10) with no service change.
- Red run (builder spec, interface field only, compiles): 31 tests, 4 failed on assertions — ICARDA keys gained `MELIA_SUMMARY:4`; CC-minus-To expected `[s04@x.org]` got `[]`; R-5 `NO_CENTER_MEL` entries missing; trim spec. W3-only CC and R-3 equality were green (expected). Dispatcher/repo specs written alongside the code; their red evidence is falsifier (d).
- Falsifiers (applied temporarily, reverted):
  - (a) opted-in check disabled → red: ICARDA keys `+MELIA_SUMMARY:4`, CC-minus-To, R-5.
  - (b) CC from all rows → red: `+s02@x.org` in ICARDA CC; CIMMYT W3-only CC gained 3 addresses; existing W3 spec `+m@x.org`.
  - (c) CC from no rows → red: ICARDA CC expected `[s01,s04]` got `[]`; CC-minus-To.
  - (d) opted-in codes omitted from the lookup → red: `findCenterMel` expected `['CTR-I']` got `[]` (Reviewer: the same test also asserts messages `['CENTER:CTR-I']` + `unreachable []`, so the outcome is covered).
  - (e) non-opted path mutated (Innovation Use → MELIA summary off) → red: R-3 equality literal + an existing MELIA spec.
- Implementer verification: `npx tsc --noEmit -p tsconfig.json` exit 0; `npx jest --maxWorkers=2 --silent --testPathPattern="replicated-innovation-reminders/(digest-builder|reminder-dispatcher|repositories/pending-innovation|replicated-innovation-reminders.service)"` → 4 suites, 137 tests passed; eslint 6 files exit 0.
- Evidence re-run (Leader-inline, non-author): same commands → tsc 0; 4 suites / 137 passed; eslint 0 (first eslint attempt run from repo root failed on config lookup — rerun from `onecgiar-pr-server`) → **VERIFIED**.
- Reviewer verdict: **PASS** — DD-2/DD-3 and R-2…R-5, R-10 term by term; falsifier (a) is direct (`dev.results → [4]`), (d) covers the outcome; R-2 "not in MELIA summary" asserted; R-3 literal hand-checked against pre-change code; NFR-3 holds.
- runtime events: none
- spawns: implementer 24 calls, 162443 tokens, ended complete (assumptions only); reviewer not reported by host, ended complete.

**Not Done / Assumptions (Implementer, carried verbatim in gist — no owed item)**
- `optedInCenters` is required; calling `build()` without it throws on `.has` (only callers: `plan()` and specs).
- `plan()` still parses developers of opted-in W1/W2 rows and looks up their users; harmless, left to keep the change small.
- Dispatcher spec mock `findCenterMel` now filters by requested codes; no existing spec broke.

**ADVISORY (4R, not gating)**
- RELIABILITY: dispatcher sends `lead_center_code` to `findCenterMel` untrimmed while `build()` trims; a padded code would miss the key. Pre-existing for W3, now also for opted-in W1/W2.
- READABILITY: R-3 equality compares a projection (messageKey, to, cc, result ids, unreachable), not every field; a full `toEqual` would be stricter.
- RISK: repository spec checks SQL by substring only; real SQL check stays with PRTest preview (T-5).

**Running totals vs budget (design §11):** tasks 2/5 · diff ≈ 199 + 363 = ≈ 562 lines (budget ≈ 650) · review rounds 2/6.

## Budget Tripwire — 2026-11-13 (after RCF-T-3 implementation)

- **Budget (design §11):** 5 tasks · ≈650 LOC (≈300 prod + ≈350 tests) · 6 review rounds.
- **Actual after T-1…T-3 (server, added lines):** prod ≈634 (migration 125, entity 41, builder 24, dispatcher 21, repo 19, controller 80, module 11, service 233, DTOs 80) · tests ≈778 (builder 170, dispatcher 108, repo 16, controller 91, module 8, service 385) · **total ≈1,412 (2.2×)**; review rounds 3/6. T-4 (client) not started; estimated +400–700.
- **Cause:** estimate error, no scope outside the approved tasks. T-3 dominant (service 233 + spec 385): §11 under-counted the Center listing (join to `clarisa_institution`, inactive Centers with data), routing upsert, unique-index → 409 mapping and one spec per falsifier. T-1 migration 125 (existence guards + seed-style ICARDA resolution). T-2 on estimate (64 prod).
- **Stop:** run halted before T-4; not auto-approved.
- **User decision (2026-11-13, message "1"):** option 1 — continue with T-4 and accept the overrun; record delta + cause here and feed the estimation lesson to kaizen at archive.

### RCF-T-3: Admin API for focal points and opt-in — PASS

- **Date:** 2026-11-13 · **Attempts:** 1
- **Requirements covered:** RCF-R-7 (add/edit/deactivate/reactivate, no hard delete, validation, no duplicate row), R-8 (toggle + warning with 0 active contacts), R-9 (guard metadata; real 403 owed to T-5), NFR-3; DD-4.

**Attempt 1**
- Files changed (`onecgiar-pr-server/src/api/replicated-innovation-reminders/`): new `center-focal-points.service.ts` (+ `.spec.ts`), `dto/upsert-center-focal-point.dto.ts` (Create + Update DTOs), `dto/update-center-routing.dto.ts`; edited `replicated-innovation-reminders.controller.ts` (+ spec), `replicated-innovation-reminders.module.ts` (provider + `forFeature` `CenterMelFocalPoint`, `ClarisaCenter`) (+ spec).
- Response shapes (inside `ResponseInterceptor` envelope):
  - `GET center-focal-points` → 200 `[{code, acronym|null, name|null, route_all_to_center, contacts:[{id, name|null, email, is_active}]}]`, sorted by acronym; active Centers + inactive Centers that already have contacts or a routing row.
  - `POST center-focal-points` `{center_code, name?, email}` → 201 `{id, name, email, is_active:true}`; 400 bad email / unknown Center; 409 duplicate (incl. inactive duplicate → "reactivate" message).
  - `PATCH center-focal-points/:id` `{name?, email?, is_active?}` → 200 `{id, name, email, is_active}`; 404 / 400 / 409.
  - `PATCH center-focal-points/centers/:code/routing` `{route_all_to_center}` → 200 `{center_code, route_all_to_center, active_contacts, warning|null}`; 400 unknown Center.
- Red run: first run red on 2 spec errors (PATCH `RequestMethod` number; string vs number id in a mock), fixed. Behavioural red from falsifiers.
- Falsifiers (applied temporarily, reverted, files diffed identical to backups):
  - F1 guard dropped on `updateCenterRouting` → red: authorization spec `Received has value: undefined`.
  - F2 duplicate check no-op → red: create 409 spec (got 200) + update 409 spec; unique-index catch spec stayed green (independent path).
  - F3 `@Delete` added → red: "has no DELETE route" + endpoint-table spec.
- Implementer verification: `npx jest --maxWorkers=2 --silent --coverage=false --testPathPattern="replicated-innovation-reminders/(center-focal-points|replicated-innovation-reminders.controller|replicated-innovation-reminders.module)"` → 3 suites, 40 passed; tsc 0; eslint 8 files 0.
- Evidence re-run (Leader-inline, non-author): same → tsc 0; 3 suites / 40 passed; eslint 0 → **VERIFIED**.
- Reviewer verdict: **PASS** (security lens in depth) — guard on every handler via prototype-driven `it.each`; `ValidationPipe({whitelist, transform})` on all bodies; Update DTO has no `center_code`/`id`/audit fields; audit columns set; no delete; 1062 mapped to a fixed-message 409 (no driver text/PII leaks); R-8 warning counts active contacts only; NFR-3 holds.
- runtime events: none
- spawns: implementer 23 calls, 174205 tokens, ended complete; reviewer not reported by host, ended complete.

**Not Done / Assumptions (Implementer — no owed item)**
- Guard evidence is metadata reflection only; real 403 in T-5.
- `clarisa_center` + institution listing and the real 1062 error shape not run against MySQL; mapping unit-tested with a stubbed error.
- `ClarisaCenter` also registered by other modules (harmless for `forFeature`).

**ADVISORY (4R, not gating)**
- RELIABILITY: `:code` / `center_code` not canonicalised — case-insensitive collation lets `center-10` or `"CENTER-10 "` pass the Center check and be stored as typed, then miss exact-match JS lookups in `list()` and the dispatcher (opt-in silently ineffective). Fix: store the `clarisa_center.code` returned by `assertCenterExists`.
- RELIABILITY: concurrent first-time routing toggles → second `save` hits PK → 500. Use `upsert(['center_code'])` or map 1062.
- READABILITY: 409 "reactivate the existing contact" also shown when the duplicate is active.
- RESILIENCE: legacy mixed-case emails get rewritten on a case-only edit; harmless.
- RISK: T-5 should POST a duplicate on PRTest and confirm 409, not 500.

**Running totals vs budget (design §11):** tasks 3/5 · ≈1,412 added lines (budget ≈650; overrun accepted by user, see Budget Tripwire) · review rounds 3/6.

### RCF-T-4: Admin UI — Center focal points section — PASS

- **Date:** 2026-11-13 · **Attempts:** 1
- **Requirements covered:** RCF-R-7 (list/add/edit/deactivate, inline 400/409, no delete action), R-8 (checkbox toggle + inline warning), design §8 states (skeleton, error + retry, empty), NFR-3.
- **P-13 settled (Leader, at source):** `@spartan/checkbox` exists (`onecgiar-pr-client/tsconfig.json:43` → `src/app/spartan/checkbox`); no switch primitive → `hlm-checkbox` with visible label + per-Center `aria-label`.
- **P-6 confirmed:** `reminder-preview-drawer.component.html:43-45` already renders `d.cc` for every message; unchanged.

**Attempt 1**
- Files changed (`onecgiar-pr-client/src/app/`): new `pages/admin-section/pages/phase-management/components/replicated-innovation-reminders/center-focal-points/center-focal-points.component.{ts,html,spec.ts}`; edited host `replicated-innovation-reminders.component.{ts,html}`, host spec (`GET_centerFocalPoints` mock + `jest.mock('@spartan/checkbox')` stub copied from `my-draft-results.component.spec.ts`), `reminder-api.spec.ts` (+4 URL/verb tests), `shared/services/api/results-api.service.ts` (4 methods), `shared/interfaces/replicated-innovation-reminders.interface.ts`, `internationalization/replicated-innovation-reminders.copy.ts`. The two spec edits are named consumers (outside the brief's file list, inside its Consumers field).
- Red run: first run red on `hlm-checkbox` compile error under Jest (no `BrnCheckbox` in the brain mock) — setup, not behaviour; stub added → 62/62.
- Falsifiers (temporary, reverted, files diffed back):
  1. early return before `PATCH_centerRouting` → red: `toHaveBeenCalledWith('CENTER-17', {route_all_to_center:true})`, warning spec, rollback spec.
  2. 409 not inline → red: `cfp-form-error` "Received has value: undefined" (1 failed / 11).
  3. warning `@if` forced false → red: warning spec (1 / 11).
- Implementer verification: folder Jest `--maxWorkers=2 --testPathPattern="replicated-innovation-reminders"` → 4 suites / 62 passed; `--findRelatedTests` on 5 changed .ts → 448 suites / 12,221 passed; `ng lint` on touched files → pass (`npx eslint` cannot run in the client: ESLint 9 flat-config lookup fails; client lints via angular-eslint); `ng build` exit 0 (pre-existing CommonJS warnings only).
- Evidence re-run (Leader-inline, non-author): folder Jest → 4 / 62 passed; `ng build` exit 0; `ng lint --lint-file-patterns=<10 files>` → 0 errors, 2 warnings ("file ignored because of a matching ignore pattern" on the two .html) → **VERIFIED**. `--findRelatedTests` (12k tests) not re-run — recorded as not re-executed.
- Reviewer verdict: **PASS** — toggle state from server (stays ON with warning, rollback on error), no delete action, `err.error.message` with array join + copy fallback, all copy in the copy file, only existing token `--pr-color-yellow-700`, Spartan checkbox labelled + focusable, `hlm-dialog` focus trap/Escape, API naming + `encodeURIComponent` keeps case, NFR-3 holds.
- runtime events: none
- spawns: implementer 32 calls, 204959 tokens, ended complete; reviewer not reported by host, ended complete.

**Assumptions (Implementer — no owed item)**
- Optimistic toggle with rollback + row error; local state patched from responses (no re-fetch); any in-flight mutation disables all actions.
- Edit sends `{name, email}`; an empty name is sent as `""` (server stores blank as NULL per T-3).
- Client validates only empty email; malformed/duplicate come back as 400/409 inline.

**ADVISORY (4R, not gating)**
1. RELIABILITY: rollback spec uses a stub + synchronous `throwError`; checks the component signal, not the real `linkedSignal` checkbox. Async HTTP makes it work in prod — T-5 should confirm the box unticks after a refused toggle.
2. RESILIENCE: `closeDialog()` no-ops while `busy()`; Escape/backdrop during a request leaves `dialogCode` set, so re-opening the same Center does not reopen the dialog. Fix: clear on `(closed)` or block Escape while busy.
3. RELIABILITY: `toggleActive` clears the warning after any contact change; deactivating the last active contact of an opted-in Center hides the warning while its rows become unreachable (R-5).
4. READABILITY: `hlm-checkbox` Jest stub duplicated in two specs.

**Running totals vs budget (design §11):** tasks 4/5 · ≈1,412 server + ≈703 client = **≈2,115 added lines** (budget ≈650; overrun accepted 2026-11-13, see Budget Tripwire) · review rounds 4/6.
