# Proposal — Follow-ups from the rejected-result resubmission

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` |
| Type | **Bug** (items 1–2) + **Change / verification** (item 3) |
| Approval Mode | `gated` |
| Status | **approved**, user 2026-10-06 |
| Date | 2026-10-06 |
| Author (session) | Santiago Sanchez |
| Origin | `bilateral/resubmit-rejected-result` (archive `2026-10-06-bilateral--resubmit-rejected-result`), `design.md` §13 and the T-4/T-5 review advisories |
| Depends on | none (the resubmission feature is merged) |
| Parallel-safe | yes with `bugfix/user-password-in-responses` (different files) |

## 2. Intent

Close the three loose ends the resubmission left behind:

1. A wrong notification text.
2. Readers that show inactive Science Programs as primary.
3. Seven checks the reviews raised but nobody ran on real data.

## 3. Problem / Current Behavior

| # | Item | Status |
|---|---|---|
| 1 | Primary-request card copy | **Confirmed bug** (see §9.1) |
| 2 | Readers show inactive role-1 rows as "Primary submitter" | **Confirmed** live on PRTest (9550, 9762) |
| 3 | 7 residual checks | **Unverified**, each could be fine or a defect |

## 4. Proposed Outcome

1. A primary request reads as a primary request, naming who asks and which Science Program is being asked.
2. No reader presents an inactive role-1 row as the primary, or as owner, of a result.
3. Each of the 7 checks ends as either "verified OK" (with evidence) or "fixed" (with a regression test).

## 5. Scope

| # | Area |
|---|---|
| 1 | Client: `pop-up-notification-item.component.ts:425-431` `generateNotificationTextRequest`, `filter-notification-by-search.pipe.ts:50` (same text), and the inbox and drawer copy, if it shares the gap |
| 2 | Server: `notification.service.ts` ~:460, :743, :910, :1412; `result-tagged-notification.service.ts` ~:322, :430; the bilateral GET `obj_results_toc_result` reader |
| 3 | The 7 checks in §9.3, verification first and a fix only where one fails |

## 6. Non-Goals

- The password leak. It is in its own urgent spec, `bugfix/user-password-in-responses`.
- Any change to the resubmission flow itself, unless a §9.3 check fails because of it.

## 7. Affected Users, Systems, And Specs

| Who | Effect |
|---|---|
| SP reviewers | A correct primary-request card. No phantom "Primary submitter" in notifications |
| Producer platforms | A correct `obj_results_toc_result` in the GET |
| Related specs | `notifications/bilateral-primary-sp-request` (PSR), `notifications/bell-read-state` (archived), `bilateral/resubmit-rejected-result` (archived) |

## 8. Visual Reference

- Source: None. The change is copy-only on the card (item 1), and the rest is backend.

## 9. Bug Diagnosis

### 9.1 Primary-request card copy (confirmed)

- **Symptom.** SP12 sees "Manuel Almanzar from **SP12** has requested inclusion of **SP12** as a contributor to result 9762", with the button "**Accept as primary**". Seen in T-7.
- **Root cause.** `generateNotificationTextRequest()` has only two branches, `is_map_to_toc` and a default. The default always says "as a contributor" and never looks at `request_type`.
  - For a primary request, `obj_owner_initiative` is the requested primary. Resubmission DD-6 and PSR set `owner_initiative_id` to the requested SP.
  - The template prints "from {owner}" and "inclusion of {shared}", which renders SP12 twice.
  - The button is right; the sentence is not.
- **Fix strategy.** Add a `request_type === 'primary'` branch, for example "{requester} asked {SP} to become the primary Science Program of result {code} - {title}". Apply the same branch in the search pipe so filtering matches. This is copy plus one condition, with a spec test.

### 9.2 Inactive role-1 rows shown as primary (confirmed)

- **Symptom.** While 9550 and 9762 were ownerless, or after an owner change, the bilateral GET `obj_results_toc_result` listed SP09, SP11 and SP12 all as `initiative_role: "Primary submitter"`. The neighbouring `obj_result_by_initiatives` showed all of them with `is_active: false`.
- **Root cause.** These readers select role-1 `results_by_inititiative` rows without an `is_active = 1` filter.
  - In the bilateral GET this is confirmed.
  - The notification readers at the lines listed in §5 are flagged by a T-5 reviewer and still need confirming in specify.
  - The defect predates the resubmission: retired former owners already surfaced this way. The amended DD-5 adds a new kind of inactive row (the pending primary), so it now shows up more often.
- **Fix strategy.** Add the `is_active` filter in each reader, with one spec test per reader.

### 9.3 Seven residual checks (to verify)

| # | Check | Risk if it fails |
|---|---|---|
| a | `upDateActive` reactivates **every** inactive subnational row with a matching code, including historic duplicates | Duplicate subnationals after a resubmission |
| b | An unresolvable `lead_center` returns silently, logged only at debug level, and the old lead stays | Wrong lead centre, unnoticed |
| c | Several projects flagged `is_lead`: the last one wins | The allocation check may run against a project the platform did not intend |
| d | Accepted role-2 contributors that the payload no longer lists stay active (the reset spares role 2) | A contributor survives against `R-4` replace semantics |
| e | `result_initiative_budget` rows under an inactive parent (retired owner, declined SP) in exports and reporting readers | The amount appears where it should not (it violates JD condition 2) |
| f | p95 of a resubmission compared with a regular `create` (NFR: at most +30%) | Performance regression |
| g | Retry guidance: a 409 "pending review" after a timeout means the attempt committed | Platforms resend, or lose results |

## 10. Approach Options

| Option | Trade-off |
|---|---|
| **A. One spec, three task groups** (recommended): fix 9.1 and 9.2 first, then verify 9.3 and fix only what fails | One review cycle. 9.3 is verification-heavy and can land after the fixes |
| B. Three separate specs | More overhead for small items |
| C. Only 9.1 and 9.2, and drop 9.3 | Leaves known unverified risk (e, d) on a money field |

## 11. Recommended Approach

**Option A.** Tasks in order:

1. Card copy (client).
2. The `is_active` filter in the readers (server).
3. 9.3 e and d: money and contributor, the highest risk.
4. 9.3 a, b and c: data hygiene.
5. 9.3 f and g: performance and retry, measured on PRTest by the user, as in T-7.

## 12. Risks, Dependencies, And Open Questions

- **R1.** The notification files were recently edited by `notifications/bell-read-state` (now archived). Re-read them from the working tree; do not trust the graph.
- **R2.** For 9.3 e, there are about 40 files that touch `result_initiative_budget`. The audit must be scoped to readers that render or export, or it will blow up.
- **OQ-1.** For 9.3 d: should a resubmission retire accepted contributors the payload dropped? Today `R-15` says "requests", not accepted rows. This needs a product decision (Nicoleta, or Juan David).
- **OQ-2.** For 9.3 c: refuse several `is_lead` flags with a 400, or keep "last wins" and document it?

## 13. Success Criteria

- The primary-request card names the request correctly, covered by a spec test.
- No reader shows an inactive role-1 row as primary, covered by tests per reader and one live GET on PRTest.
- All 7 checks are closed with evidence, or fixed with a regression test.

## 14. Next Step

```text
/akili-specify bilateral/resubmit-followups
```

Bug Mode applies to 9.1 and 9.2, each needing a regression test. Item 9.3 is verify-first.
