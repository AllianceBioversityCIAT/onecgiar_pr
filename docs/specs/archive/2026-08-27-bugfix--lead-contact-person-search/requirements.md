# Module Spec — `requirements.md`

Bug fix spec. **Depth: Lite.** Source: [`proposal.md`](./proposal.md) (Bug Diagnosis, confirmed root cause).

---

## 1. Module / Feature

- **Module:** `bugfix/lead-contact-person-search` (touches `custom-fields` in `onecgiar-pr-client`)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** approved
- **Ticket(s):** P2-3260

---

## 2. Context

`app-lead-contact-person-field` is shared by Result general info (P22+P25), IPSR general info, and Bilateral general info (`onecgiar-pr-client/src/CLAUDE.md` §21.5 "Lead fields"). Its search pipeline dies the first time a search returns zero AD matches — a routine outcome, not an edge case — and stays dead for the rest of the page session. Confirmed root cause in `proposal.md` §9: `GET /api/ad-users/search` answers HTTP 404 for "no matches" (`ad_users.service.ts:52-60` via `Return-data.interceptor.ts:46`), and the client's `switchMap`-over-a-single-long-lived-`Subject` pipeline (`lead-contact-person-field.component.ts:56-97`) has no `catchError`, so that 404 terminates the outer subscription permanently.

---

## 3. In Scope / Out of Scope

### In scope

- Keep the search `Subject` subscription alive across any number of zero-match or transient-error searches, for the life of the component.

### Out of scope

- Changing the `/api/ad-users/search` HTTP contract (404-for-empty is an existing, precedented convention elsewhere in this codebase — see `onecgiar-pr-client/src/CLAUDE.md` §21.5).
- The unconfirmed "--" symptom for <4-character queries (proposal §9 — no such string exists in the current component; flagged for live re-verification after this fix, not fixed blind).
- Any visual/UX change to the search dropdown.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (P22/P25) | Can search Lead Contact Person repeatedly without a page reload, even when early searches find nothing. |
| IPSR / Bilateral general-info editor | Same fix, same shared component. |

---

## 5. User Stories

- **`LCP-US-1`** — As a result submitter, I want the Lead Contact Person search to keep working after a search finds no matches, so that I don't have to hard-reload the page mid-form to try another name.

---

## 6. Functional Requirements

### Required (MUST)

- **`LCP-R-1`** When a Lead Contact Person search request resolves with zero matches (HTTP 404) or any other request error, the system MUST keep the search pipeline active so that the next valid query still executes a request and can return results.
- **`LCP-R-2`** When a search request errors, the system MUST render the existing "no results" UX (no dropdown, `isSearching` cleared) rather than leaving the field in a stuck "Searching…"/no-feedback state.

---

## 6.1 Scenarios

### Requirement: `LCP-R-1` — Search pipeline survives a zero-match search

#### Scenario: Zero-match search followed by a valid search

- GIVEN the Lead Contact Person field is empty and unlocked
- WHEN the user types a query ≥4 characters that has no AD match (server responds 404)
- THEN the field shows no results (no crash, no stuck state)
- AND WHEN the user then types a different, valid query ≥4 characters that has AD matches
- THEN the field issues a new search request and renders the matching results
- BUT it must NOT require a page reload for the second search to work
- AND IT MUST work the same way after any number of consecutive zero-match searches (not just one)

#### Scenario: Transient request error also does not kill the pipeline

- GIVEN the Lead Contact Person field is empty and unlocked
- WHEN a search request fails for any reason (network error, 5xx, 404)
- THEN a subsequent valid search still executes and can return results

### Requirement: `LCP-R-2` — Error path renders the existing empty-result UX

#### Scenario: Zero-match search shows the standard "not stuck" state

- GIVEN a search request resolves with zero matches
- THEN `isSearching` becomes `false` and no dropdown is shown
- BUT it must NOT leave `isSearching` stuck `true` or show a raw error to the user

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Reliability** | The search `Subject` subscription MUST NOT terminate for the life of the component, regardless of how many search requests error. |
| **Backwards compatibility** | MUST NOT change the `/api/ad-users/search` request/response contract or any other consumer of `AdUserService`. |
| **Regression safety** | MUST NOT change user-visible behavior or any other assertion in `lead-contact-person-field.component.spec.ts`. **Exception (reconciled during LCP-T-1 execution):** the single-error test's `showResults` assertion is expected to flip from `false` to `true` — design.md §6.2 mandates routing the caught error through the unchanged `next:` handler, which by construction sets `showResults = true` (the same zero-match rendering path). User-visible output is unchanged either way (no dropdown renders in both cases); only the internal flag differs. See `execution.md` LCP-T-1 for the reconciliation record. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `LCP-AC-1` | The field is unlocked, a search for `"ogutu"` resolves 404 (no matches) | The user then searches `"cadavid"` (has matches) in the same component instance | Results for `"cadavid"` render — no reload needed |
| `LCP-AC-2` | The field is unlocked, three consecutive searches each resolve 404 | The user then searches a valid query | Results still render on the fourth search |
| `LCP-AC-3` | A search request errors | — | `isSearching` is `false` and `showResults` reflects the empty state, matching current zero-match rendering |

Cross-cutting project ACs that already apply: `AC-1` Typed result integrity (unaffected — this field's write path is untouched); `AC-9` Security and secrets (unaffected).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `ResultsApiService.GET_adUsersSearch` (`onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts:1452`) — unchanged.
- `GET /api/ad-users/search` (`onecgiar-pr-server/src/api/ad_users/*`) — unchanged, left returning 404 for empty results per existing convention.

### Downstream consumers

- `rd-general-information`, `ipsr-general-information`, `bilateral/components/section-general-info` — all render `<app-lead-contact-person-field>` and benefit automatically; no changes needed in those callers.

### Assumptions

- The 404-for-empty-results contract on `/api/ad-users/search` is intentional and out of scope to change (matches the precedent already documented for a similar endpoint in `onecgiar-pr-client/src/CLAUDE.md` §21.5).

---

## 10. Open Questions

- `LCP-OQ-1` — Is the "--" symptom for <4-character queries (Jira P2-3260 Symptom 1) still reproducible on a clean build after this fix lands? Not blocking this spec (see proposal §9); re-verify live in-browser once `LCP-T-1` ships.

---

## 11. Out-of-Band Notes

None.

---

## Defect Classes → Verification Mapping

| Defect class this spec can produce | Verification |
|---|---|
| Pipeline still dies on error (fix doesn't actually catch the error, or catches at the wrong pipe stage) | Regression test in `lead-contact-person-field.cy.ts` (Cypress CT) simulating a 404 response then a second, successful search in the same mounted instance — asserts results render on the second search |
| Fix masks real errors as "success" in a way that corrupts `searchResults`/`isSearching` state for the *valid* path | Existing + extended assertions in the same CT spec on `isSearching`/`showResults` after both the error and the success branch |
| Regression in the already-covered zero-match / single-error Jest unit specs (`lead-contact-person-field.component.spec.ts`) | Re-run `npm run test -- --testPathPattern="lead-contact-person-field.component.spec"` — must stay green |

No visual/rendered-output defect class applies — this is a pure RxJS control-flow fix with no markup change, so no T6/manual visual check is needed.

---

## Required cross-references

- `docs/specs/bugfix/lead-contact-person-search/proposal.md` — Bug Diagnosis (confirmed root cause), same folder.
- `docs/prd.md`, `docs/trd/trd.md` — no module-specific `G#`/`US-*`/`AC-*` cover this shared field explicitly; treated as a defect against the existing (undocumented-in-PRD) Lead Contact Person UX, not a new capability.
- `onecgiar-pr-client/src/CLAUDE.md` §9 (Cypress CT is the gate for `custom-fields/`), §21.5 (Lead fields table; 404-for-empty precedent).
