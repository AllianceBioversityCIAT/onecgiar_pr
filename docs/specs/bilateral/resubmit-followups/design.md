# Design — Follow-ups from the rejected-result resubmission

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` |
| Code | `RSF` |
| Depth | **Standard** (re-checked in §11) |
| Status | **approved**, user 2026-10-06 (Phase 2 gate: Continue) |
| Date | 2026-10-06 |
| Inputs | `requirements.md` (`RSF-R-1..R-11`, `OQ-1..OQ-3` resolved), `proposal.md`, scout report 2026-10-06 (read-only, working tree), client sites read inline |
| Abbreviations | `bs` = `api/bilateral/bilateral.service.ts` · `rsv` = `api/bilateral/services/bilateral-resubmission.service.ts` · `ns` = `api/notification/notification.service.ts` · `rtn` = `api/notification/services/result-tagged-notification.service.ts` · `rr` = `api/results/result.repository.ts` · `bell` = client `shared/components/header-panel/components/pop-up-notification-item/` · `inbox` = client `pages/results/pages/results-outlet/pages/results-notifications/` |
| Reversion challenge | Run **inline** by the Leader (specify allows it). Outcomes in §9 |

## 2. Executive Summary

Three independent fixes, no schema change, no new endpoint.

| Item | Where | Approach |
|---|---|---|
| 1 Bell copy (`R-1`, `R-2`) | Client: `bell` template + TS, `inbox` search pipe | One pure text builder shared by the bell link and the pipe; a primary branch in the bell template using the inbox's existing copy |
| 2 Inactive role 1 (`R-3`) | Server: `rr.getTocMappingsByResultId`, `ns` (3 sites), `rtn` | Filter at the reader. **Never** turn the filter into an existence condition, so ownerless results keep their notifications and GET entries |
| 3 Checks a–d (`R-4..R-7`) | Server: subnational repository, `rsv` preflight + reset | a: reactivate one row per code · b, c: two new preflight refusals · d: the reset retires role-2 rows the payload dropped |
| 3 Checks e–g (`R-8..R-10`) | Tests + `execution.md` | Guard test, status-text pin, user measurement |

## 3. Premise Ledger

**Blast-radius triggers:** `consumer` (bilateral GET content, QA payload, notification texts), `shared-state` (`bulkUpdateSubnational` has an in-app caller), `live-path` (resubmission preflight).

| # | Premise | Citation (read 2026-10-06, working tree) | Status | If false |
|---|---|---|---|---|
| `RSF-P-1` | The bell's visible sentence is in its HTML template; `generateNotificationTextRequest` only feeds the inbox link's `search` param | `bell` html `:96-115`, ts `:302-306`, `:425-431` | verified | — |
| `RSF-P-2` | The inbox search pipe's default string duplicates the bell's function, character for character | `filter-notification-by-search.pipe.ts:45-51` | verified | — |
| `RSF-P-3` | The inbox already renders a primary request as "{centre} has tagged {SP} as the primary Science Program of result…", using `primaryVerb`/`primaryTail` from `contribution-request-drawer.copy.ts:121-122` and `creatingCenterLabel` with the `unknownCenterFallback` | `notification-item.component.ts:449-454`, `:1234-1250` | verified | — |
| `RSF-P-4` | Bell request rows come from the same received-requests data as the inbox and carry `request_type` and `creating_center` | `results-notifications.service.ts:186-203` (`bellReceived`) | **assumed** for `creating_center` | `T-1` reads one row shape; if absent, the label falls back to "the Center" (`R-1` already allows it) |
| `RSF-P-5` | `getTocMappingsByResultId` has no `rbi.is_active` predicate; its consumers are the bilateral GET (`bs:3912`) and the QA contributors/header mappers via `findOne` | `rr:4009-4076`; `contributors-and-partners.mapper.ts:25,136`; `result-header.mapper.ts:14-17` | verified | — |
| `RSF-P-6` | `getAllNotifications` and `getPopUpNotifications` express role 1 as a TypeORM relation `where` (`obj_result_by_initiatives: { initiative_role_id: 1 }`), which is both a row filter and an existence condition; `rbi.is_active` is not selected | `ns:741-745`, `:908-911`, `:1041-1046`, `:1424-1432` | verified | — |
| `RSF-P-7` | `ns.resolveOwnerProgramCode` returns the first initiative of **any role**; `rtn.resolveOwnerProgramCode` returns the first role 1, else any row; `rtn` already has a "no owner" form (`'a Science Program'`) | `ns:1409-1421`; `rtn:428-437`, `:330-332` | verified | — |
| `RSF-P-8` | The client reads `obj_result.obj_result_by_initiatives[0]` for the update card's chip and the deep-link `init` | `bell` ts `:96`, `:302` | verified | An empty array after `R-3` → `init=undefined` in the link. `T-1` guards it (§9) |
| `RSF-P-9` | `bulkUpdateSubnational` reactivates **every** row matching (country, role, code); callers: `bs:6418`, `:6431` (bilateral) and `result-countries.service.ts:291` (in-app geo save) | `result-country-subnational.repository.ts:151-205` | verified | — |
| `RSF-P-10` | `handleLeadCenter` returns without throwing on 3 unresolvable branches (warn); the reset keeps lead centres | `bs:5164-5266`; `rsv:664-669` | verified | — |
| `RSF-P-11` | `findPayloadLeadProjectId` takes the last flagged project; preflight only refuses "no lead" | `bs:5026-5041`; `rsv:527-543` | verified | — |
| `RSF-P-12` | The reset never touches role 2; it deactivates every share request except an accepted primary | `rsv:724-742`, `:776-785` | verified | — |
| `RSF-P-13` | The payload's `contributing_programs` resolve to initiative ids **before** the reset runs (the preflight already resolves SP codes for allocation checks) | `rsv` preflight | **assumed** | `T-5` resolves them in preflight (read-only CLARISA lookup) |
| `RSF-P-14` | Every reader that renders/exports `result_initiative_budget` filters the parent `rbi.is_active` | Scout Q6 (11 readers listed in `requirements.md` `R-8`) | verified | — |
| `RSF-P-15` | `describeResultStatus(5)` yields `pending review`, the doc's wording | `rsv:50-53`; doc `:555` | verified (by reading) | `T-6` pins it |
| `RSF-P-16` | `RRC-T-5` and `RRC-T-6` (not started) will edit `ns` and `rsv` | `rejected-result-correction/tasks.md`, `design.md` §8.6 | verified | — |

## 4. Architecture Overview

```
Item 1 (client)
  inbox/utils/request-notification-text.ts  (NEW pure builder: primary | map-to-ToC | contribution)
     ├─▶ bell.generateNotificationTextRequest()  → link ?search=…   (R-2)
     └─▶ search pipe createDefaultString()       → filter haystack  (R-2)
  bell template: @if primary → "{centre} has tagged {SP} as the primary Science Program of result …" (R-1)

Item 2 (server readers)
  rr.getTocMappingsByResultId ── + "role 1 only when active" predicate ─▶ bilateral GET, QA mappers
  ns.getAllNotifications / getPopUpNotifications ── keep existence where; drop inactive rbi rows after load
  ns.resolveOwnerProgramCode / rtn.resolveOwnerProgramCode ── active role 1 only, else existing "no owner" form

Item 3 (resubmission branch)
  preflight (no writes) ─ + lead_center resolvable (R-5) ─ + at most one is_lead (R-6) ─ + contributor ids (P-13)
  reset ─ + deactivate role 2 not in payload (R-7)
  writers ─ bulkUpdateSubnational: one row per code (R-4, shared repository)
```

## 5. Data Model

No change. No migration. Existing columns only (`results_by_inititiative.is_active`, `result_country_subnational.is_active`).

## 6. API Design

| Surface | Change | Contract |
|---|---|---|
| `GET /api/bilateral/:id`, list, `/results` | `obj_results_toc_result` no longer contains inactive role-1 entries. Shape unchanged | Change-log row (content correction, `AC-4`) |
| QA payload `primary_science_program` | Follows the row above: active primary or none | Covered by the same row |
| `POST /api/bilateral/create` (resubmission branch only) | Two new 400s, before any write | Error table + change-log row |

New errors (base messages, following the `RSB` vocabulary):

| Case | HTTP | Message |
|---|---|---|
| Lead centre not resolvable (`R-5`) | 400 | `Result {code} cannot be resubmitted: lead_center {value} does not match a CGIAR center.` |
| Several lead projects (`R-6`) | 400 | `Result {code} cannot be resubmitted: {n} bilateral projects are flagged is_lead; flag exactly one.` |

`{value}` is the identifier the platform sent (code/acronym/name field), never the whole object.

## 7. Backend Module Design

| Unit | Change | Req |
|---|---|---|
| `rr.getTocMappingsByResultId` | Add a predicate that excludes role-1 rows that are inactive. Role-2 rows keep today's behaviour (see §12 gap) | `R-3` |
| `ns.getAllNotifications`, `ns.getPopUpNotifications` | Keep the relation `where` exactly as is (existence unchanged). Select `rbi.is_active`, and in the mapping step drop inactive entries from `obj_result.obj_result_by_initiatives` before returning | `R-3`, BUT clause |
| `ns.resolveOwnerProgramCode` | Active role 1 only; `undefined` otherwise (callers already handle `undefined`) | `R-3` |
| `rtn.resolveOwnerProgramCode` | Active role 1 only; the `?? initiatives[0]` fallback is removed, so the existing `'a Science Program'` text applies | `R-3` |
| `result-country-subnational.repository.bulkUpdateSubnational` | Reactivate only the newest row (highest id) per (country, role, code). Rows already active are untouched | `R-4` |
| `rsv` preflight | Two new steps after the lead-project check: resolve `lead_center` with the same lookup `handleLeadCenter` uses, read-only (400 on no match); count flagged projects (400 when > 1). Also resolves `contributing_programs` codes to ids for the reset (`P-13`) | `R-5`, `R-6`, `R-7` |
| `rsv` reset | After the role-1 step: deactivate role-2 rows whose `initiative_id` is not among the payload's resolved contributor ids | `R-7` |
| `rsv` log | The new refusals go through the existing `RSB-R-21` log line | `R-11` |
| Contract doc | Error table rows + one change-log row (GET content correction and the two refusals) | `AC-4` |

`bs.handleLeadCenter` itself and the no-code `create` order stay unchanged (`RSB-R-1`, `RSB-DD-1` lesson: gate new checks to the resubmission branch).

## 8. Frontend / UX

| Component | Change | Req |
|---|---|---|
| `inbox/utils/request-notification-text.ts` (NEW) | Pure `buildRequestNotificationText(row)`: the primary sentence when `request_type === 'primary'`, else today's two strings verbatim. Primary centre label: `creating_center.acronym → name → unknownCenterFallback`, the same rule as `creatingCenterLabel` | `R-1`, `R-2` |
| `filter-notification-by-search.pipe.ts` | `createDefaultString` delegates to the builder | `R-2` |
| `bell` TS | `generateNotificationTextRequest` delegates to the builder. The deep link omits `init` when the update row has no initiative (`P-8`) | `R-2`, §9 |
| `bell` template | A primary branch before today's markup: bold centre, `primaryVerb`, bold SP code, `primaryTail`, result ref span unchanged. Non-primary markup untouched | `R-1` |

No new visual pattern, so no Spartan component is needed: the existing `<b>` and result-ref span are reused. Copy comes from `contribution-request-drawer.copy.ts` (DD-9), so there are no new strings.

## 9. Design Decisions

- **`RSF-DD-1` — one text builder for the link and the filter.** Today the two strings are hand-copied (`P-2`), which is how a fix in one silently breaks the deep link. *Rejected:* patching both sites in parallel (drift returns at the next copy change).
- **`RSF-DD-2` — the bell reuses the inbox sentence.** One wording for one request kind across surfaces. *Rejected:* the proposal's "{requester} asked {SP}…", which would be a third sentence for the same row.
- **`RSF-DD-3` — filter rows, never existence.** Adding `is_active` to the TypeORM relation `where` would also hide every notification of an ownerless result (`P-6`), breaking the `R-3` BUT clause. So the filter runs on loaded rows (notifications) or as a role-scoped SQL predicate (GET).
- **`RSF-DD-4` — role-1-scoped predicate in the GET.** Only inactive **role-1** entries are removed. Inactive role-2 entries also exist, but changing them is a different content change outside this spec's mandate (§12).
- **`RSF-DD-5` — subnational fix in the shared repository.** The duplicate risk is the same for the in-app geo save (`P-9`). On a result with no duplicates, the behaviour is identical. *Rejected:* a resubmission-only flag, which would leave the same defect in-app.
- **`RSF-DD-6` — b and c are refused, on the resubmission branch only** (user, 2026-10-06). The no-code `create` keeps warn-and-continue and last-wins (follow-up in §12).
- **`RSF-DD-7` — check d: replace** (user, 2026-10-06). The reset retires role-2 rows the payload dropped. It does **not** create role-2 rows: contributors still go through the drafts flow (`RSB-DD-6`, `RRC-R-8`).
- **`RSF-DD-8` — sequencing with `RRC`.** `T-3` (notifications) runs after `RRC-T-5`, and `T-4`/`T-5` (resubmission) run after `RRC-T-6`, or each rebases on them. This is a warning, not a block.

### Reversion challenge (Step 2.3) — "what does removing this break?"

| DD that takes something away | What it breaks | Outcome |
|---|---|---|
| `DD-3`: inactive rbi rows dropped from notification payloads | The client reads `obj_result_by_initiatives[0]` (`P-8`). For an ownerless result the chip shows `''` (it already falls back via `getProgramCode`), and the deep link would carry `init=undefined` | **Fixed in the design:** the bell omits `init` when absent (`T-1`). Today that link points at an SP that is not the owner, which is the defect itself |
| `rtn` fallback `?? initiatives[0]` removed | Without an active owner, the text was "created by {contributor or retired SP}". It becomes "created by a Science Program", the form that already exists | Kept. No concrete breakage; the old text was false |
| `DD-4`: inactive role-1 entries leave `obj_results_toc_result` | A consumer that relied on seeing the former owner there loses it. `obj_result_by_initiatives` still lists it with `is_active:false` | Kept; change-log row tells consumers where the history lives |
| `DD-5`: fewer subnational rows reactivated | Only rows that duplicate a reactivated code stay inactive. Any reader counting active rows sees one per code, which is the intended state | Kept; regression test on the in-app caller (`result-countries.service`) |
| `DD-6`: the resubmission no longer accepts an unknown lead centre or several leads | A platform that sends these today gets 400 instead of a silent success | Kept (user decision); change-log row and error table |

## 10. Testing Plan

| Level | What | Req |
|---|---|---|
| Jest `request-notification-text.spec.ts` (new) | Primary (with centre, centre missing), contribution, map-to-ToC: exact strings; non-primary equals today's literals | `R-1`, `R-2` |
| Jest `pop-up-notification-item.component.spec.ts` | Rendered primary text (T-7 case, negative substrings); link `search` equals the builder; `init` omitted when no initiative | `R-1`, `R-2` |
| Jest `filter-notification-by-search.pipe.spec.ts` | The bell's search text matches the row for each kind | `R-2` |
| Jest `result.repository.spec.ts` | The query contains the role-1 active predicate (presence-only, see gap) | `R-3` |
| Jest `notification.service.spec.ts` | Active + inactive role 1 → only the active SP; ownerless → notification still returned with empty initiatives; `resolveOwnerProgramCode` | `R-3` |
| Jest `result-tagged-notification.service.spec.ts` | Inactive role 1 only → "created by a Science Program" | `R-3` |
| Jest `result-country-subnational.repository.spec.ts` + `result-countries.service.spec.ts` | Update targets the newest id per code; in-app caller unchanged for non-duplicates | `R-4` |
| Jest `bilateral-resubmission.service.spec.ts` | `R-5`, `R-6` refusals → zero writer calls; one-lead cases still pass; reset deactivates dropped role 2 and keeps listed ones | `R-5..R-7` |
| Jest `bilateral.service.spec.ts` | Bilateral GET innovation extras: inactive parent → no budget (`R-8`); `describeResultStatus(5) === 'pending review'` (`R-10`); existing create suite unchanged (`RSB-R-1`) | `R-8`, `R-10` |
| Manual (user, PRTest) | Live GET of 9550/9762 before/after; read the live role label (`OQ-4`); a resubmission over a historic subnational duplicate; p95 ×10 vs create ×10 | `R-3`, `R-4`, `R-9` |

## 11. Budget (Step 2.4)

| Tasks | LOC | Review rounds |
|---|---|---|
| 7 (6 code + 1 manual run) | ~650 (≈200 production, ≈450 tests) | 1 each; **2** budgeted for `T-3` (notifications, existence trap) |

This matches **Standard**. Over 400 LOC, but the slices are independent, so the recommendation is **2 PRs**: PR 1 = client copy (`T-1`, lands now, no `RRC` dependency); PR 2 = server (`T-2..T-6`, after the overlapping `RRC` tasks).

## 12. Open Gaps & Follow-ups

| # | Gap | Owner |
|---|---|---|
| Inactive **role-2** entries in `obj_results_toc_result` | Declined or retired contributors are still listed. Same defect class as `R-3`, outside this mandate | Follow-up spec |
| No-code `create`: unknown lead centre (warn), several leads (last wins), subnational codes applied to every country (`bs:6409`, `:6418`) | `DD-6` gates the fixes to resubmission | Follow-up spec |
| `RSF-OQ-4` live role label ("Owner" vs "Primary submitter") | Read at the `T-7` live GET; fix the doc example if it differs | User at HITL |
| `findCenterNoticeNotifications` (`ns:320-359`) loads every role, active or not | Not shown as owner today (scout); not changed | Watch |
