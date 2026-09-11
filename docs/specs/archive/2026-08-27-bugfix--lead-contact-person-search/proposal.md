# Proposal — Lead Contact Person search stops responding after a no-match search

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/lead-contact-person-search` |
| Slug derivation | Derived from Jira P2-3260 title ("Lead Contact Person field search") — not a free-text sentence, path taken as given. |
| Type | Bug |
| Approval Mode | gated |
| Status | Approved by santiago.sanchez@cgiar.org on 2026-08-26 |
| Source | Jira [P2-3260](https://cgiarmel.atlassian.net/browse/P2-3260), QA of US P2-3242 (Excel — User Feedback) |
| Author (this proposal) | Claude Code, on behalf of santiago.sanchez@cgiar.org |
| Date | 2026-08-26 |

## 2. Intent

Make the Lead Contact Person search field keep working for the rest of a session, no matter how many searches return zero matches — without requiring the user to hard-reload the browser.

## 3. Problem / Current Behavior

QA on P2-3242 found the Lead Contact Person search (`app-lead-contact-person-field`, used on Result general info for P22+P25, IPSR general info, and Bilateral general info) stops returning results after a search finds nothing:

1. Type a name/email that has no AD match (e.g. `ogutu`) → "Searching…" shows, then silently disappears with no results.
2. Clear the field, type a **different, valid** name/email (e.g. `cadavid`) → nothing happens at all: no "Searching…", no dropdown, no error.
3. Only a hard reload (`Ctrl+Shift+R`) restores the field.

A second, so-far-unconfirmed symptom is also logged in the ticket: typing fewer than 4 characters shows `--` instead of no dropdown. Investigation below explains why symptom 1 happens; symptom 2 could not be reproduced in the current code (see §9).

## 4. Proposed Outcome

A zero-match or transient-error search response never breaks the field's ability to search again in the same page session. The user can search repeatedly, get "no results" as many times as they want, and still get real results on the next valid query — no reload needed.

## 5. Scope

- `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.ts` — the RxJS search pipeline.
- A regression test (Cypress CT, since `custom-fields/` is excluded from Jest coverage — see package CLAUDE.md §9) proving the pipeline survives a zero-match search followed by a real one.

## 6. Non-Goals

- Changing the `/api/ad-users/search` HTTP contract (still returns 404 for "no matches" — see §9, this is an existing, precedented pattern in the codebase, not something to redesign here).
- Any visual/UX redesign of the search dropdown.
- The unconfirmed "--" symptom (tracked as an open question, not fixed blind).

## 7. Affected Users, Systems, And Specs

- **Users:** any Result Creator / Result Detail (P22 & P25 general info), IPSR general info, or Bilateral general info user setting a Lead Contact Person.
- **Components:** `lead-contact-person-field.component.ts` (client). No server change proposed.
- **Related consumers:** `rd-general-information`, `ipsr-general-information`, `bilateral/components/section-general-info` (all render `<app-lead-contact-person-field>`).

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-logic bug fix, no new UI surface. Existing markup/styles are unchanged.

## 9. Bug Diagnosis

### Observed Symptom

After a Lead Contact Person search finds zero matches, the field stops responding to any further input — no loading state, no results, no error message — until the browser is hard-reloaded.

### Reproduction Steps

1. Open a Result/IPSR/Bilateral general-info section with the Lead Contact Person field.
2. Type a query ≥4 chars that has no AD match (any name/email not present in AD), e.g. `ogutu`.
3. Observe "Searching…" then it disappears with nothing shown — no results, no "no users found" message rendered either.
4. Clear the field, type a **valid** ≥4-char query that should return matches, e.g. `cadavid`.
5. Observe: nothing happens — no "Searching…", no dropdown, ever.
6. Hard-reload (`Ctrl+Shift+R`) → field works again until the next zero-match search.

### Root Cause (confirmed)

The search pipeline (`lead-contact-person-field.component.ts:56-97`) is built **once**, in the constructor, as a single long-lived subscription:

```ts
this.searchSubject
  .pipe(debounceTime(500), distinctUntilChanged(), switchMap(query => {
    ...
    return this.resultsApiService.GET_adUsersSearch(trimmedQuery); // inner HTTP observable
  }))
  .subscribe({ next: ..., error: ... });
```

`GET_adUsersSearch` (`results-api.service.ts:1452`) calls `GET /api/ad-users/search?query=...`. On the server, `AdUserService.searchUsers` (`onecgiar-pr-server/src/api/ad_users/ad_users.service.ts:52-60`) returns `status: HttpStatus.NOT_FOUND` (404) in its `returnFormatService` whenever both the local cache and Active Directory return zero matches — this is the **normal, expected outcome** for any name/email that isn't in AD, not an edge case.

`ResponseInterceptor` (`onecgiar-pr-server/src/shared/Interceptors/Return-data.interceptor.ts:46`) takes that `status` value and calls `response.status(modifiedData.statusCode)` — i.e. it sets the **actual HTTP response status to 404**. Angular's `HttpClient` treats any non-2xx response as a stream **error**, so the `GET_adUsersSearch(...)` Observable emits `error`, not `next`, whenever a search finds nothing.

That error is the inner observable inside `switchMap`. Per RxJS's Observable contract, **an error from an inner observable inside `switchMap` propagates to and terminates the outer subscription** — the component's `error:` callback in `.subscribe({...})` runs exactly once, resets local flags, and then the entire `searchSubject` subscription is torn down. There is no `catchError` inside the `.pipe(...)` to intercept the error and keep the outer stream alive. Because the subscription was created once in the constructor and is never recreated, every subsequent `this.searchSubject.next(query)` call afterward has **no active subscriber at all** — the Subject silently drops the emission. This is exactly the reported behavior: the very first zero-match search permanently kills the field for the rest of the component's lifetime (only recreated by a full page reload).

Confirmed by code inspection of all three layers (server service, response interceptor, client subscription) — not a guess.

### Impact & Scope

- Any zero-match AD search — a very common case, since AD only contains a limited set of registered PRMS/CGIAR users — permanently breaks the field.
- Cross-cutting: affects every consumer of `<app-lead-contact-person-field>` (Results general info P22+P25, IPSR general info, Bilateral general info) since they all share this one component implementation.
- No data-integrity risk — the bug is purely a dead client-side subscription, nothing is corrupted or mis-saved. But it is a severe UX blocker matching the ticket's "High" severity: it makes an entire required field un-usable mid-session.
- This is the same "404-for-empty-result" API convention already documented as a known gotcha elsewhere in this codebase (`src/CLAUDE.md` §9: `GET /api/results/get/all/roles/filter/:userId` also answers 404 for an empty filter match, "any new caller must treat 404 as empty, not as a failure"). The AD search endpoint follows that same established (if awkward) house convention — the defect is that this one caller doesn't yet handle it that way.

### Fix Strategy

Smallest safe correction, entirely client-side, no server contract change:

- Add `catchError` **inside** the `switchMap`'s inner observable (not just an `error:` callback on the outer `subscribe`), so a 404/empty-result or any transient HTTP error resolves to a benign "no results" `next` emission (e.g. `catchError(() => of({ response: [] }))`) instead of propagating an error that kills the outer subscription.
- This keeps the one long-lived `searchSubject` subscription alive indefinitely, regardless of how many searches return zero matches, matching how the rest of the pipeline already expects to run for the life of the component.

Route: **not** cosmetic — this is an RxJS control-flow / logic fix. Per the Triviality Gate this belongs in `/akili-specify` (Lite depth) in **Bug Mode**, which requires a regression test proving: (a) a zero-match search does not kill the pipeline, and (b) a subsequent valid search in the same component instance still returns real results without any reload. Cypress Component Testing is the right layer (`custom-fields/` is excluded from Jest coverage; see package CLAUDE.md §9) — extend `lead-contact-person-field.cy.ts`.

**Symptom 2 ("--" on <4 chars) — unconfirmed.** Current code for query length <4 synchronously sets `searchResults=[]`, `showResults=false`, `isSearching=false`, returns `EMPTY` — i.e. it should render nothing, not `--`. No literal `--` string exists anywhere in this component, `field-card`, or `pr-input`. This may have been observed on a stale bundle, or may be a knock-on visual artifact of the same dead-subscription bug from a prior search in the same QA session (worth re-checking once symptom 1 is fixed, since much of the QA session likely chained several searches). Recommend re-verifying live in-browser after the fix lands (per the client CLAUDE.md's documented "stale bundle" trap) rather than fixing blind; if it still reproduces, file as a fresh, separately-diagnosed ticket.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — `catchError` inside `switchMap` (recommended)** | Catch the inner HTTP error per-search and resolve to an empty result. | Smallest, most local change; keeps existing "one subscription for the component's life" design; matches the codebase's existing "404 means empty" convention. |
| B — Rebuild the subscription on every error | Wrap the whole pipe-and-subscribe in a method, call it again from the `error:` callback. | More moving parts, re-creates a subscription repeatedly, harder to test, no advantage over A. |
| C — Change the server to return 200 with an empty array instead of 404 | Fixes the client symptom by changing the API contract instead. | Touches a shared endpoint's contract and duplicates work already done consistently elsewhere in this codebase with 404-for-empty; higher blast radius than a client-only fix for no added benefit. |

**Recommended: Option A.**

## 11. Risks, Dependencies, And Open Questions

- **Risk:** low — the fix only changes how a known error case is absorbed inside one component's pipeline; no API or data shape changes.
- **Dependency:** none beyond the existing `GET_adUsersSearch` / `AdUserService` contract, which is left as-is.
- **Open question:** is Symptom 2 ("--" on <4 chars) reproducible on a clean, non-stale build? Needs live confirmation before deciding whether it's a separate defect.

## 12. Success Criteria

- A search that returns zero AD matches shows a normal "no users found" state (already implemented) and the field remains fully searchable afterward.
- A subsequent valid search in the same session returns real results without any page reload.
- New Cypress CT regression test covers: zero-match search → real search → results render.
- No change to the `/api/ad-users/search` contract or any other consumer of `AdUserService`.

## 13. Next Step

```text
/akili-specify bugfix/lead-contact-person-search
```

Run in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test (red before the `catchError` fix, green after).
