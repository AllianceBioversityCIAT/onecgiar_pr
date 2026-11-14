# Design — Center focal point routing for replicated-innovation reminders

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-center-focal-routing` |
| Depth | Standard (re-checked at §11 Budget) |
| Status | approved 2026-11-13 |
| Requirements | `requirements.md` (RCF-R-1…R-11, approved 2026-11-13) |
| Extends | archived RIR design §15 (`docs/specs/archive/2026-10-26-changes--replicated-innovation-reminders/design.md`) |
| Backend route | `nestjs-expert` (module, DI, TypeORM, guards). Lead per `software-architect/references/backend-routing.md` `UNVERIFIED — confirm at source before relying on it` (file not opened; proceeding with the Skill Map) |
| Design route | `impeccable-bridge` not loaded: one small table in an existing admin panel, using the panel's existing Spartan primitives. Page mode is unchanged |

## 1. Executive Summary

- A new table stores each Center's opt-in setting.
- `build()` receives the set of opted-in Centers. Before applying the current rules, it sends any pending row whose lead Center is opted in to the Center email.
- The Center email gets a CC: the MELIA focal points of its W1/W2 rows.
- New admin-only endpoints in the existing controller manage the focal point list and the opt-in. A new section in the reminders panel uses them.
- One migration:
  - creates the table;
  - opts ICARDA in;
  - removes "bilateral" from the Center template.

No change to bilateral APIs, campaigns, the send log or the cron.

## 2. Premise Ledger

Count: 11 verified · 2 UNVERIFIED (High 0 · Low 2).
Blast-radius triggers: `consumer` fires (the `build()` input/output shape and the Center template text change); `shared-state` fires (the `center_mel_focal_point` list is read by the dispatcher and written by the new API); `live-path` fires (campaign dispatch / preview).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | Only `source = 'API'` rows are routed to the Center; W1/W2 Innovation Development rows go to reachable developers, everything else W1/W2 to the MELIA summary | location | `digest-builder.ts:175-200` | 5518acc45 | DD-2 (High) | — |
| P-2 | The lead Center is already resolved for every pending row, W1/W2 included, as `lead_center_code` = `results_center.center_id` (`is_leading_result = 1`) | existence | `pending-innovation.repository.ts:46,65,85` | 5518acc45 | DD-2 needs a repository change (High) | — |
| P-3 | Focal points are fetched only for the lead Centers of W3 rows | location | `reminder-dispatcher.service.ts:205-210` | 5518acc45 | DD-3 (Low) | — |
| P-4 | `findCenterMel` returns active rows only | existence | `pending-innovation.repository.ts:183-196` (`WHERE c.is_active = 1`) | 5518acc45 | RCF-R-7 deactivate semantics (High) | — |
| P-5 | Message CC is generic: the dispatcher logs and sends `message.cc` for every type, and the redirect blanks it in non-prod | live-path | `reminder-dispatcher.service.ts:387,420,431` | 5518acc45 | DD-2 CC needs dispatcher work (Low) | — |
| P-6 | The preview drawer renders `cc` for every message | consumer | `reminder-preview-drawer.component.html:43-45` | 5518acc45 | T-4 adds CC rendering (Low) | — |
| P-7 | All campaign endpoints use `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `ValidRoleGuard` | other | `replicated-innovation-reminders.controller.ts:38,50-51` | 5518acc45 | DD-4 guard (High) | — |
| P-8 | The Center template body says "{{resultCount}} bilateral innovation(s)" | data-env | `1791700000000-RIR-RecipientModelV2.ts:371` | 5518acc45 | DD-5 (Low) | — |
| P-9 | ICARDA's Center code can be resolved from `clarisa_center` by acronym or name pattern, as the seed migration does | other | `1791800000000-RIR-SeedCenterMelFocalPoints.ts:72-75` | 5518acc45 | DD-6 (Low) | — |
| P-10 | `center_mel_focal_point` has a unique (center_code, email) index and `is_active` from `BaseEntity` | existence | `entities/center-mel-focal-point.entity.ts:23-26` | 5518acc45 | RCF-R-7 duplicate check (Low) | — |
| P-11 | `build()` and `BuildInput` are consumed only by `digest-builder.spec.ts` and `reminder-dispatcher.service.ts` | consumer | `grep -rln "BuildInput\|centerMelByCenter\|build(" onecgiar-pr-server/src onecgiar-pr-server/test \| grep -i "remind\|rir"` → 3 files (builder, its spec, dispatcher) | 5518acc45 | T-2 scope (Low) | — |
| P-12 | The word "bilateral" appears only in the Center template body, not in its subject or the other 3 templates | data-env | `UNVERIFIED — confirm at source before relying on it` | — | DD-5 replace scope (Low) | T-1 first step (grep the migration templates + prdb `SELECT` on the template row) |
| P-13 | The client already ships a Spartan switch or checkbox primitive usable for the opt-in | existence | `UNVERIFIED — confirm at source before relying on it` | — | T-4 uses an HlmButton toggle instead (Low) | T-4 first step (`ls onecgiar-pr-client/src/app/spartan` or the `@spartan/*` path map) |

## 3. Architecture Overview

| Flow | Change |
|---|---|
| Dispatch / preview (cron, Send now, preview) | Dispatcher loads opted-in Centers → loads focal points for W3 Centers ∪ opted-in Centers present in rows → `build()` routes → existing send/log |
| Admin config | Panel → new endpoints → `center_reminder_routing` / `center_mel_focal_point` |

## 4. Extended Directory Structure

Server `api/replicated-innovation-reminders/`:
- **New:**
  - `entities/center-reminder-routing.entity.ts`
  - `dto/upsert-center-focal-point.dto.ts`
  - `dto/update-center-routing.dto.ts`
  - `center-focal-points.service.ts` (+ spec)
- **Edited:**
  - `digest-builder.ts` (+ spec)
  - `reminder-dispatcher.service.ts` (+ spec)
  - `repositories/pending-innovation.repository.ts` (opted-in lookup)
  - controller (+ spec)
  - module

Migration: `src/migrations/<ts>-RCF-CenterRouting.ts`.

Client `admin-section/pages/phase-management/components/replicated-innovation-reminders/`:
- **New:** `center-focal-points/center-focal-points.component.{ts,html,spec.ts}`
- **Edited:**
  - `replicated-innovation-reminders.component.html` (host the section)
  - `results-api.service.ts`
  - `shared/interfaces/replicated-innovation-reminders.interface.ts`
  - `internationalization/replicated-innovation-reminders.copy.ts`

## 5. Data Model

`center_reminder_routing` (new):
- `center_code` varchar(15) PK, FK → `clarisa_center.code`, same charset/collation as `center_mel_focal_point.center_code`
- `route_all_to_center` tinyint NOT NULL default 0
- BaseEntity audit columns

A missing row means off (RCF-R-1).

`center_mel_focal_point`: unchanged (P-10).

The migration:
- `up`: creates the table; inserts ICARDA with flag 1 (resolved as in P-9); replaces the template text (DD-5).
- `down`: reverses all three.

## 6. API Design

All endpoints sit under `api/replicated-innovation-reminders/`, with the guard of P-7.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `center-focal-points` | — | Each CGIAR Center (code, acronym, name, `route_all_to_center`, `contacts[]` of id/name/email/is_active). Centers with no config and no contacts are included, so they can be configured |
| POST | `center-focal-points` | `center_code`, `name?`, `email` | Created contact. 400 on a malformed email or unknown Center; 409 on a duplicate (center, email) |
| PATCH | `center-focal-points/:id` | `name?`, `email?`, `is_active?` | Updated contact. Same 400/409 rules |
| PATCH | `center-focal-points/centers/:code/routing` | `route_all_to_center: boolean` | Updated Center row plus `warning` when it is turned on with 0 active contacts (RCF-R-8) |

Envelope: the existing `ResponseInterceptor`, the same as campaigns.

## 7. Backend Module Design

- **DD-2 routing in `build()`:**
  - `BuildInput` gains `optedInCenters: Set<string>` (empty = today's behavior).
  - The first check in the loop: if the trimmed `lead_center_code` is in the set → add the row to `byCenter` and continue.
  - The remaining branches are untouched.
  - Center email CC = the union of `meliaByInitiative` for the `initiative_id` of the list's rows with `source !== 'API'`, minus To addresses, sorted (RCF-R-4).
  - An opted-in Center with no recipients → `NO_CENTER_MEL` for all its rows (already the behavior of the Center loop; RCF-R-5).
- **DD-3 dispatcher:**
  - Loads opted-in codes (new repository method: `route_all_to_center = 1`).
  - Center codes to fetch = W3 lead Centers ∪ (opted-in ∩ lead Centers present in the rows).
  - `meliaByInitiative` already covers every row's initiative (no change).
- **DD-4 service:** `CenterFocalPointsService`.
  - Writes are TypeORM repository saves.
  - Email is normalised to lower case and trimmed, then validated with `class-validator` `IsEmail`.
  - A duplicate is checked before saving and also caught from the unique index → 409.
  - No hard delete.
- **DD-5 template copy:** an idempotent `REPLACE(..., ' bilateral innovation(s)', ' innovation(s)')` on the Center template row only. `down` restores it.

## 8. Frontend / UX Component Architecture

- `CenterFocalPointsComponent` (standalone, signals) sits inside the reminders panel, below the campaigns.
- **Center table** (HlmTable), one row per Center:
  - acronym/name;
  - the opt-in control (P-13);
  - the active contacts as badges;
  - an "Edit contacts" button.
- **Contacts dialog** (HlmDialog):
  - lists the contacts, with activate/deactivate;
  - add/edit form (name, email) with inline validation;
  - server 400/409 messages shown inline.
- **Warning:** a toast or inline note when the opt-in turns on with 0 active contacts.
- **States:** loading skeleton (HlmSkeleton), error banner with retry, and empty contacts ("No focal point").
- **Copy:** all text lives in `replicated-innovation-reminders.copy.ts`.
- The preview drawer needs no change (P-6). A Center email now may list W1/W2 rows, and those already render with their SP.

## 9. Shared Contracts

`ReminderPreview` is unchanged in shape. New client interfaces: `CenterRoutingView`, `CenterFocalPointView`. There are no bilateral payload changes (RCF-NFR-3).

## 10. Design Decisions

| ID | Decision | Rejected | Why |
|---|---|---|---|
| RCF-DD-1 | A separate `center_reminder_routing` table | A flag on contact rows; a global parameter JSON | The setting belongs to the Center (RCF-R-1). An FK keeps codes valid |
| RCF-DD-2 | Route in the pure `build()` with an injected set | Filter rows in the dispatcher | Keeps routing testable in one place; the regression (RCF-R-3) is a pure-function equality test |
| RCF-DD-3 | Opted-in Centers are loaded per dispatch; no cache | Cache | 15 rows; the change must take effect at the next preview (RCF-R-8) |
| RCF-DD-4 | Endpoints in the existing controller/module | A new module | The same guard, same feature (RIR-DD-5 already split RIR from `admin-panel`) |
| RCF-DD-5 | Drop "bilateral" for all Centers | Two template variants | The copy is still true for W3-only Centers; one template, no branching |
| RCF-DD-6 | ICARDA opted in by the migration | Manual SQL / UI after release | RCF-R-11; reproducible and reversible |

**Step 2.3 reversion challenge** ("what does removing this break?"):
- **RCF-DD-2** removes developer digests for opted-in Centers. This is intended and gated by an opt-in that defaults off.
  - Breakage found: an opted-in Center without contacts would silently lose reminders. Covered by RCF-R-5 (unreachable list) and the RCF-R-8 warning.
  - A campaign already SENT this phase does not re-send (RIR-R-5). Accepted.
- **RCF-DD-5** removes "bilateral". Breakage: a W3-only Center reader loses the hint that the list is bilateral. The rows still show their source context (SP / no SP). Accepted; Nicoleta is informed in the PR / ticket reply.

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 5 (T-1 migration, T-2 routing, T-3 admin API, T-4 admin UI, T-5 PRTest + PROD count, HITL) |
| LOC | ≈ 650 (≈ 300 production + ≈ 350 tests) |
| Review rounds | 6 |

Depth Standard is confirmed.

## 12. Rollout & Rollback

1. Ship to qa-dev → performance-refactor (PRTest) → staging → master (Cristian).
2. Migration on deploy; no campaign is affected until the next preview/send.

Rollback:
- set ICARDA's flag to 0 (the immediate behavioral rollback);
- or migration `down`.

Before Nicoleta's send: a read-only PROD count of ICARDA-led pending rows, by source and type (R-2 of the proposal).
