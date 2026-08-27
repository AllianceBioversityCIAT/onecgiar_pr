# Module Spec — `design.md`

Bug fix spec. **Depth: Lite.** Implements [`requirements.md`](./requirements.md) (`LCP-R-1`, `LCP-R-2`).

---

## 1. Summary

Add `catchError` **inside** the `switchMap` of the Lead Contact Person search pipeline so a failed search request (404 "no matches", or any transient error) resolves to an empty-result `next` emission instead of an `error` notification. This keeps the one long-lived `searchSubject` subscription — created once in the component constructor — alive for the life of the component, no matter how many searches fail. No API, markup, or template change; the fix is a single RxJS operator inserted at one point in `lead-contact-person-field.component.ts`.

Biggest constraint accepted: the `/api/ad-users/search` 404-for-empty contract stays as-is (out of scope per requirements §3); the fix absorbs it client-side, matching how the codebase already expects callers to treat that convention elsewhere.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.ts` only.
- **No server modules touched.**
- **No external integrations touched.**

### 2.2 Sequence / interaction diagram

Current (broken) flow:

```
[user types] → searchSubject.next(query)
  → debounceTime(500) → distinctUntilChanged() → switchMap
        → GET_adUsersSearch(query)  [inner observable]
              ├─ 200 with matches  → next(results)      (pipeline stays alive)
              └─ 404 no matches    → ERROR notification → outer subscribe() terminates
                                                             └─ searchSubject has no subscriber from here on
[user types again] → searchSubject.next(query) → dropped silently (dead subscription)
```

Fixed flow:

```
[user types] → searchSubject.next(query)
  → debounceTime(500) → distinctUntilChanged() → switchMap
        → GET_adUsersSearch(query).pipe(catchError(() => of({ response: [] })))
              ├─ 200 with matches → next(results)
              └─ 404 / any error  → next({ response: [] })   ← caught, stream stays alive
[user types again] → searchSubject.next(query) → pipeline still subscribed, executes normally
```

---

## 3. Data Model Changes

None. No entity, migration, or CLARISA implication.

---

## 4. API Surface

No new or changed endpoint. `GET /api/ad-users/search` keeps returning HTTP 404 for zero matches, per requirements §3 (out of scope). The client now treats that response the same way it already treats a 200-with-empty-array.

---

## 5. Server Workflow / Business Rules

Not applicable — this is a client-only fix.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. `custom-fields.module.ts` declaration is unchanged.

### 6.2 Components & services

- **`lead-contact-person-field.component.ts`** — the constructor's `searchSubject.pipe(...)` chain gets one addition: `catchError` wrapping the inner `this.resultsApiService.GET_adUsersSearch(trimmedQuery)` call inside `switchMap`, imported from `rxjs/operators` (`of` already needed from `rxjs`, both are cheap additions to the existing `rxjs` import line).
- The existing outer `subscribe({ next, error })`'s `error:` callback becomes dead code once the inner error is caught before it reaches the outer subscription — **kept as-is, not removed**: it remains a defensive backstop for any error the `catchError` itself doesn't anticipate (e.g. a synchronous throw building the request). Removing it is out of scope and not required to satisfy `LCP-R-1`/`LCP-R-2`.
- `catchError`'s replacement emission MUST look like a normal empty-result response — the same shape the `next` handler already reads (`response?.response || []`) — so the existing `next:` handler (filters users, sets `searchResults = []`, `showResults = true`, `isSearching = false`, `hasValidContact` per §L85 of the current file) runs unchanged and produces exactly today's zero-match UX. This is what satisfies `LCP-R-2` without touching the `next:` handler at all.

### 6.3 Design system usage

Not applicable — no template/markup/styling change.

### 6.4 Real-time / notification UX

Not applicable.

---

## 7. Security & Authorization

No change. `GET_adUsersSearch` keeps going through the existing JWT-gated `auth` header interceptor; no new input surface is introduced (`catchError`'s fallback is a static empty array, not derived from user input).

---

## 8. Performance & Capacity

Negligible: one additional RxJS operator per search request, no additional HTTP calls, no additional re-renders beyond what the existing zero-match path already does.

---

## 9. Observability

No new logging added. This is not a regression the team needs a new signal to detect after the fact — the regression test (design §10) is the guardrail.

---

## 10. Testing Plan (forward-looking)

- **Cypress Component Test (primary gate — `custom-fields/` is excluded from Jest coverage, see `onecgiar-pr-client/CLAUDE.md` §9):** extend `lead-contact-person-field.cy.ts` with a case that (1) intercepts the search request to return a 404 for one query, confirms no crash / dropdown, then (2) types a second, different query intercepted to return a match, and asserts the result renders — all within the same mounted component instance (no remount). This is the regression test: **red on current code** (second search never fires / times out because the RxJS pipeline is dead), **green after** the `catchError` fix.
- **Existing Jest unit spec** (`lead-contact-person-field.component.spec.ts`) already has zero-match and single-error cases (`GET_adUsersSearch` mocked with `throwError`) — re-run to confirm they still pass with the added `catchError` (they test single-search behavior, not the multi-search sequence, so they don't currently catch this bug, but must not regress).

---

## 11. Backwards Compatibility & Migration Plan

Fully backwards compatible — no contract, schema, or flag change. No rollout coordination needed beyond the normal PR/merge.

---

## 12. Design Decisions (ADRs)

### `LCP-DD-1` — Catch the error inside `switchMap`, not by rebuilding the subscription

- **Context:** the outer `searchSubject` subscription dies once, permanently, on the first request error, because nothing inside the piped operators intercepts it.
- **Decision:** add `catchError(() => of({ response: [] }))` to the inner observable, inside `switchMap`, so the error never reaches the outer subscription.
- **Alternatives considered:**
  1. *Rebuild the subscription from the `error:` callback* (Option B in `proposal.md` §10) — rejected: more moving parts, re-subscribes repeatedly, harder to reason about and test, no benefit over catching in place.
  2. *Change the server to return HTTP 200 with an empty array instead of 404* (Option C in `proposal.md` §10) — rejected: touches a shared endpoint's contract that's already precedented elsewhere in this codebase (`onecgiar-pr-client/src/CLAUDE.md` §21.5), larger blast radius for no added benefit, and out of scope per requirements §3.
- **Consequences:** the pipeline becomes error-resilient by construction — any future failure mode from `GET_adUsersSearch` (network error, 5xx, timeout) is absorbed the same way, not just the specific 404 case. The trade-off is that a genuine backend outage on this endpoint will now silently show "no results" instead of a distinct error state — acceptable, since that's already indistinguishable from a real zero-match in today's UI (no error-vs-empty visual difference exists to preserve).

### Step 2.3 — Reversion challenge

This DD does not revert any already-delivered behavior — it only adds resilience around an existing failure path. **Challenge skipped** per the Lite-depth exemption (no test currently covers the reverted-behavior surface, and there is none to revert).

---

## 13. Open Gaps & Follow-ups

- `LCP-OQ-1` (from requirements) carries forward: re-verify the "--" symptom live in-browser after this fix ships; not addressed by this design.
- Not addressed: whether a genuine backend outage on `/api/ad-users/search` should surface a distinct "search unavailable" state instead of "no results" — out of scope, no current UI supports that distinction anywhere in this component.

---

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~10–15 (one `catchError`/`of` import + one pipe operator + the Cypress CT regression case) |
| Expected review rounds | 1 |

This is far below `Lite`'s already-small ceiling — a single-task, single-file, ~10–15 LOC change. Depth stays **Lite**, no further reduction possible (this is not cosmetic — it's a real logic fix — so `/akili-quick` remains the wrong tool per the original Triviality Gate escalation).

---

## Required cross-references

- `docs/specs/bugfix/lead-contact-person-search/requirements.md` (`LCP-R-1`, `LCP-R-2`) — same folder.
- `docs/prd.md`, `docs/trd/trd.md` — no specific module section covers this shared field; see requirements §"Required cross-references" for the same note.
- `onecgiar-pr-client/CLAUDE.md` §9 (Cypress CT gate for `custom-fields/`), `onecgiar-pr-client/src/CLAUDE.md` §21.5 (Lead fields, 404-for-empty precedent).
