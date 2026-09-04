# Module Spec Requirements — CGSpace Search Auto-Retry

- **Module:** `result-framework-reporting`
- **Sub-feature:** `kp-cgspace-search-retry`
- **Type:** Change (reliability)
- **Owner:** Result Framework Reporting
- **Status:** `approved`
- **Depth:** Lite
- **Spec Path:** `docs/specs/changes/kp-cgspace-search-retry/`
- **Branch:** `qa-development-2026`
- **Extends:** archived `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/` (`KPB-R-10`, `KPB-R-11`, `KPB-AC-7`)
- **Approval Mode:** interactive (no `proposal.md`)

---

## 1. Executive Summary

When a submitter searches CGSpace from **Browse CGSpace** in Report result, a single failed call immediately shows **Try again**. Transient CGSpace / proxy failures are common; the user should not see that error until the search has been **attempted 3 times**.

This spec changes only the Browse search failure path. Manual entry, MQAP, facets, and the error copy stay as they are today.

---

## 2. Glossary

| Term | Meaning |
|---|---|
| **Browse CGSpace** | Tab in Report result that searches CGSpace for a Knowledge Product. |
| **Search request** | One `GET_cgspaceSearch` call (typed search, filter change, Enter, Load more, or **Try again**). |
| **Attempt** | One HTTP search request. **3 attempts** = first call + 2 automatic retries. |
| **Error state** | Current UI: “CGSpace search is temporarily unavailable” + **Try again** + Manual entry link. |
| **Empty state** | HTTP success with zero items — not a failure. |

---

## 3. System Context & Scope

- **User flow:** Report result → Browse CGSpace (`docs/ux-ui/design.md` Empty / error / loading: friendly message + retry).
- **Surfaces:** `app-kp-cgspace-browse` in dashboard-lab Report result and the AOW create modal (one component, both hosts).
- **Upstream:** existing JWT-gated proxy `GET …/results-knowledge-products/cgspace/search` (`docs/trd/trd.md` CGSpace integration). Client does not call CGSpace directly.
- **PRD:** `G1` (submitters can create KPs), `G4` (reliability), `US-S1`, `US-S5`, `AC-8`, `AC-9`. CGSpace is a named PRD dependency.

### In scope

- Automatic retries on Browse **search** failures before showing the error / **Try again** state.
- Keep **loading** visible for the whole retry sequence.
- Cancel leftover retries when the user starts a new search.
- **Try again** starts a fresh 3-attempt cycle.

### Out of scope

- Facet loads (`GET_cgspaceFacet`).
- MQAP / “Use this item” / Manual entry Sync.
- Server-side retry, cache, or API contract changes.
- New error copy, new tokens, or new UI states.
- Retrying a successful empty result.

---

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter | Transient CGSpace failures recover silently; **Try again** appears only after 3 failed attempts. Manual entry remains the escape hatch (`KPB-R-10`). |
| QA / PMU / admin / bilateral consumer | No change. |

---

## 5. User Stories

- **`KCSR-US-1`** — As a result submitter, I want Browse CGSpace to retry a failed search automatically so that a brief outage does not force me to click **Try again** or switch to Manual entry. Refines `US-S1`, `US-S5`.

---

## 6. Functional Requirements

### Required (MUST)

### Requirement: Exhaust three search attempts before Try again (`KCSR-R-1`)

The Browse tab SHALL send a search request up to **3 times** for the same trigger before entering the error state.

Any condition that today shows the error state (transport failure, timeout, HTTP status ≥ 400, or a 4xx/5xx envelope) MUST be retried. A successful response with zero items MUST stay the **empty** state and MUST NOT retry.

#### Scenario: Recovers on a later attempt

- GIVEN a valid search (≥ 3 characters or an explicit filter)
- WHEN the first attempt fails and the second succeeds with items
- THEN the UI shows **results**
- AND IT MUST have issued exactly 2 search requests for that trigger
- BUT it must NOT show the error state or **Try again**

#### Scenario: Persistent failure

- GIVEN a valid search
- WHEN all 3 attempts fail
- THEN the UI shows the existing error state (same copy, **Try again**, Manual entry)
- AND IT MUST have issued exactly 3 search requests for that trigger
- BUT it must NOT keep retrying after the third failure
- AND IT MUST leave Manual entry fully usable (`KPB-R-10`)

#### Scenario: First attempt succeeds

- GIVEN a valid search
- WHEN the first attempt returns items or an empty list
- THEN the UI shows **results** or **empty**
- AND IT MUST issue exactly 1 search request
- BUT it must NOT retry a successful empty list

#### Scenario: Manual Try again is a new cycle

- GIVEN the error state is visible
- WHEN the user clicks **Try again**
- THEN a new 3-attempt cycle starts
- AND if the first of those attempts succeeds, the UI shows results or empty
- BUT it must NOT skip automatic retries on the manual click

---

### Requirement: Stay loading; abandon stale retries (`KCSR-R-2`)

While automatic retries are in flight, the Browse tab SHALL stay in **loading** (or **loading more** when the trigger was Load more). A newer search trigger SHALL cancel leftover attempts from the previous trigger.

#### Scenario: No error flash between attempts

- GIVEN a search whose first attempt fails
- WHEN the second attempt has not finished
- THEN `status` remains loading (or loading more)
- BUT it must NOT render the error / **Try again** UI between attempts
- AND IT MUST keep search and filter inputs enabled (`KPB-R-11`)

#### Scenario: New query cancels leftover retries

- GIVEN retries for query A are still running
- WHEN the user starts a valid new search B (type, filter, or Enter)
- THEN leftover attempts for A stop
- AND B gets its own 3-attempt budget
- BUT it must NOT apply A’s later response to B’s results

---

### Should (SHOULD)

- **`KCSR-R-10`** The system SHOULD wait a short delay between attempts (long enough to avoid an immediate stampede, short enough that 3 attempts still feel like one search). Exact delay is a design choice.

### Could (MAY)

- None.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | One successful search stays a single request. Worst case is 3 sequential requests plus inter-attempt delay; no parallel stampede. Existing 400 ms debounce is unchanged. |
| **Availability** | CGSpace outage still MUST NOT block KP creation — Manual entry remains (`KPB-R-10`, `G4`). |
| **Security** | No new logs of tokens, upstream URLs, or raw upstream bodies (`.cursorrules`, `AC-9`). |
| **Privacy** | No new PII in errors or telemetry. |
| **Backwards compatibility** | No API, schema, auth, or bilateral/platform-report change (`AC-4`). |
| **Accessibility** | Existing live region still announces error only when the error state is actually shown (`docs/ux-ui/design.md` §10). |
| **Observability** | Inherit current search logging (`AC-8`). Do not log attempt payloads that include secrets. |

---

## 8. Defect Classes & Verification Mapping

| Defect class | What catches it | Substitute if none |
|---|---|---|
| Wrong attempt count (1 or 4+) | Jest: spy on `GET_cgspaceSearch` call count | — |
| Error / **Try again** shown before attempt 3 | Jest: assert `status !== 'error'` after failures 1–2 | — |
| Successful empty list retried | Jest: 200 + `items: []` → 1 call, `status === 'empty'` | — |
| Stale retry applied after a new query | Jest: fail-then-succeed A, start B, assert B params win | — |
| Manual **Try again** lost or not re-budgeted | Existing retry spec + new 3-attempt cycle assertion | — |
| Facet / MQAP accidentally retried | Jest / review: only `GET_cgspaceSearch` gains retries | — |
| Error copy / Manual entry escape broken | Existing error-state spec (`data-test="cgspace-error"`) | — |

No visual-token change. No T6 review required.

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `KCSR-AC-1` | Valid search; attempt 1 fails, attempt 2 returns items | Debounce / Enter / filter fires | Results render; `GET_cgspaceSearch` called twice; no error UI. |
| `KCSR-AC-2` | Valid search; all 3 attempts fail | Search fires | Error UI + **Try again** after the third failure; exactly 3 calls; Manual entry still works. |
| `KCSR-AC-3` | Valid search; attempt 1 returns `[]` | Search fires | Empty state; exactly 1 call. |
| `KCSR-AC-4` | Attempts 1–2 failed; attempt 3 not done | Observe UI | Loading (or loading more); no **Try again**. |
| `KCSR-AC-5` | Retries for query A in flight | User starts valid query B | A’s leftover calls stop; B is independently retried up to 3 times. |
| `KCSR-AC-6` | Error state visible | User clicks **Try again** | New cycle of up to 3 attempts; success on any of them leaves error. |

Cross-cutting ACs that apply without restating: `AC-3`, `AC-4`, `AC-8`, `AC-9`. `KPB-AC-7` is **modified**: the error UI is deferred until 3 failed attempts.

---

## 10. Dependencies & Assumptions

### Upstream

- CGSpace Discovery via the existing PRMS proxy (`KPB-R-9`).
- Client search pipeline in `kp-cgspace-browse` (`searchTrigger$` → `GET_cgspaceSearch`).

### Downstream

- `lab-report-form` and `aow-hlo-create-modal` (both mount the same component).

### Assumptions

- **`KCSR-A-1`** “3 intentos” means **3 total HTTP calls**, not 3 retries after a first failure.
- **`KCSR-A-2`** Retry the same failure set that already produces today’s error state. Do not invent a narrower 5xx-only policy in this Lite spec.
- **`KCSR-A-3`** Server 60 s search cache (`KPB-R-22`) may serve a repeated identical request; that is acceptable. Client still issues the attempt.

---

## 11. Open Questions

None that block design. Delay between attempts is `KCSR-R-10` (design choice).

---

## 12. Requirement ID Index

| ID | Kind | Statement |
|---|---|---|
| `KCSR-US-1` | Story | Auto-retry Browse search so transient failures do not force **Try again**. |
| `KCSR-R-1` | MUST | 3 attempts before error; empty success is not retried; **Try again** is a new cycle. |
| `KCSR-R-2` | MUST | Stay loading during retries; new trigger cancels stale attempts. |
| `KCSR-R-10` | SHOULD | Short delay between attempts. |
| `KCSR-AC-1` | AC | Recovers on attempt 2. |
| `KCSR-AC-2` | AC | Error only after 3 failures. |
| `KCSR-AC-3` | AC | Empty list is not retried. |
| `KCSR-AC-4` | AC | No error flash between attempts. |
| `KCSR-AC-5` | AC | New query cancels leftover retries. |
| `KCSR-AC-6` | AC | Manual **Try again** starts a new 3-cycle. |
| `KCSR-A-1` | Assumption | 3 = total calls, including the first. |

---

## Required cross-references

- `docs/prd.md` — `G1`, `G4`, `US-S1`, `US-S5`, `AC-8`, `AC-9`; CGSpace dependency.
- `docs/ux-ui/design.md` — Empty / error / loading (friendly message + retry).
- `docs/trd/trd.md` — CGSpace HTTP integration; `results-knowledge-products` proxy.
- Archived parent: `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/requirements.md` (`KPB-R-10`, `KPB-R-11`, `KPB-AC-7`).
