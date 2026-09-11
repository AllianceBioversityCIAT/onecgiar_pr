# Module Spec Design — CGSpace Search Auto-Retry

- **Module:** `result-framework-reporting`
- **Sub-feature:** `kp-cgspace-search-retry`
- **Type:** Change (reliability)
- **Status:** `shipped`
- **Depth:** Lite
- **Spec Path:** `docs/specs/changes/kp-cgspace-search-retry/`
- **Requirements:** `./requirements.md`

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~80 production + ~90 tests (~170 total) |
| Expected review rounds | 1 |
| Depth check | Matches Lite — one local pipeline change, no API/schema |

---

## 1. Summary

Browse CGSpace already fails soft (`KPB-R-10`) but shows **Try again** after the first failed search. This design keeps that UI and adds **three sequential client attempts** on the existing search pipeline before flipping to error.

The work is confined to `KpCgspaceBrowseComponent`. No server, DTO, or visual-token change. The accepted trade-off: a persistent outage can wait up to three proxy timeouts (~8 s each) plus two short delays before the error appears; Manual entry remains the escape hatch.

Links: `./requirements.md`; `docs/prd.md` `G4` / `US-S5`; `docs/ux-ui/design.md` Empty / error / loading; `docs/trd/trd.md` CGSpace integration; archived `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/design.md`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touch |
|---|---|
| **Server modules** | None. Existing `GET /api/results/results-knowledge-products/cgspace/search` is unchanged. |
| **Client** | `kp-cgspace-browse.component.ts` + its spec. Template/copy unchanged. Both Report result hosts (`lab-report-form`, `aow-hlo-create-modal`) inherit the behavior. |
| **External** | Same CGSpace Discovery hop the proxy already makes (`docs/trd/trd.md`). |

**Verified existing constraints (`KZ-KPB-1`):** the proxy times out at 8 s and returns a controlled 502-shaped body; it caches **successful** searches for 60 s only — failed searches are not cached, so a client retry re-issues upstream work.

### 2.2 Sequence / interaction diagram

```
[Submitter types / filters / Enter / Load more / Try again]
  └── existing debounce (400 ms) or immediate trigger
        └── switchMap (cancels the previous inner sequence)
              └── search attempt 1 → GET_cgspaceSearch
                    ├── success (items or []) → results / empty
                    └── failure → wait 600 ms
                          └── attempt 2 → same params
                                ├── success → results / empty
                                └── failure → wait 600 ms
                                      └── attempt 3
                                            ├── success → results / empty
                                            └── failure → existing error UI + Try again
```

A newer trigger unsubscribes this inner sequence, so leftover delays and HTTP calls for the old query do not complete (`KCSR-R-2`).

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| — | — | No change |

### 3.2 Migrations

None.

### 3.3 CLARISA / external-data implications

None. CGSpace remains a read-only proxy (`KPB-R-9`). Client still must not call CGSpace directly.

---

## 4. API Surface

### 4.1 New / changed endpoints

None. Same method, path, auth, DTOs, and 502 message as the archived browse spec.

### 4.2 Bilateral / platform-report impact

None (`AC-4`).

---

## 5. Server Workflow / Business Rules

No server workflow change. Result reporting still follows `W1` (create/edit) on the client after the user picks an item.

Client-side rules that implement `KCSR-R-1` / `KCSR-R-2`:

- Count **three attempts** for one trigger: first subscription plus two automatic re-subscriptions.
- Treat as a failed attempt: a thrown HTTP/network error **or** a completed body whose `status` / `statusCode` is ≥ 400 (the proxy often returns HTTP 200 with `status: 502` — today’s subscriber already treats that as error).
- Do **not** treat a 200 with zero items as failure.
- Do **not** apply this budget to facet calls.
- Set error state only after the third failed attempt. Keep `loading` (or `loadingMore` for Load more) for the whole sequence.
- **Try again** is the same pipeline with a new trigger, so it gets a fresh three-attempt budget.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route or lazy-load change.

### 6.2 Components & services

| Piece | Role |
|---|---|
| `KpCgspaceBrowseComponent.initSearchPipeline` | Only production change. Wrap `GET_cgspaceSearch` with retry **before** the path that swallows errors into UI state. |
| `ResultsApiService.GET_cgspaceSearch` | Unchanged. |
| Named constants on the component | Attempt budget = 3; automatic re-subscribe count = 2; inter-attempt delay = 600 ms. |

State stays component-local (`status`, `items`, `total`, `loadingMore`). No new service.

Reuse the same retry shape already shipped on `CentersService` (two automatic re-subscriptions, 600 ms delay). Do not extract a shared helper in this Lite spec.

### 6.3 Design system usage

- No new tokens, colors, or copy.
- Existing error card, **Try again** button, and Manual entry link stay as-is (`docs/ux-ui/design.md` Error: friendly message + retry).
- Live region still announces error only when `status === 'error'`.
- No new i18n keys (existing hardcoded Browse strings are out of scope).

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

- Search remains JWT-gated by the existing interceptor (`auth` header, `AC-3`).
- No new logs. Do not log tokens, query text that is unnecessary, upstream URLs, or raw 502 bodies (`.cursorrules`, `AC-9`).
- No new input surface; existing min-length / filter rules stay (`KPB` AC-8).

---

## 8. Performance & Capacity

- Happy path: still one request after the existing 400 ms debounce.
- Worst case: 3 sequential proxy calls (each up to 8 s) + 2 × 600 ms ≈ 25 s before **Try again**. Acceptable because it is the outage path and Manual entry stays available.
- No parallel stampede. `switchMap` keeps at most one retry sequence live per component instance.
- Server 60 s success cache (`KPB-R-22`) is unchanged. Failed attempts are not cached, so retries can recover a transient upstream blip.
- No new dependencies; no Lambda / bundle impact.

---

## 9. Observability

- Inherit current proxy logs (`cgspace.search` start/finish, no upstream URL).
- Client adds no new telemetry in this Lite spec.
- Moves `G4` reliability for the Browse path only; does not change `M4.x` server SLOs.

---

## 10. Testing Plan (forward-looking)

All coverage in the existing `kp-cgspace-browse.component.spec.ts` (scoped Jest — never the full client suite).

Must prove:

| Requirement / AC | Proof |
|---|---|
| `KCSR-AC-1` | Fail then items → `status === 'results'`, exactly 2 `GET_cgspaceSearch` calls, no error node. |
| `KCSR-AC-2` | Three thrown or 502-body failures → error UI after the third, exactly 3 calls. |
| `KCSR-AC-3` | 200 + empty items → `empty`, 1 call. |
| `KCSR-AC-4` | After first failure, before later attempts finish → `status === 'loading'` (or loading more), no `[data-test="cgspace-error"]`. |
| `KCSR-AC-5` | Start B while A is retrying → last calls use B’s params; A’s late success must not paint B. |
| `KCSR-AC-6` | Click **Try again** after a 3-fail → a new cycle (up to 3 more calls). |
| Facet isolation | `GET_cgspaceFacet` call count unchanged on a search retry. |

Update the current spec that expects **one** failed call then error — that assertion is now wrong.

Use fakeAsync and a spec-overridable delay (same idea as `CentersService.retryDelayMs`) so tests do not wait 600 ms for real.

**Disqualifier:** a green suite that only asserts the error template exists, or that only counts calls without flushing the retry delay, is not evidence.

**Input that would FAIL:** mock `GET_cgspaceSearch` to fail once then succeed — if the UI still shows **Try again**, the task fails.

---

## 11. Backwards Compatibility & Migration Plan

- Additive client behavior only. No flag, no migration, no consumer comms.
- Error copy, Manual entry, debounce, year lock, and MQAP selection path stay as shipped.
- Rollback: revert the pipeline wrap; Browse returns to single-attempt fail-soft.

---

## 12. Design Decisions (ADRs)

### `KCSR-DD-1` — Client retry inside the existing search pipeline

- **Context:** User asked for three attempts before **Try again**. Failures are often transient (timeout / 502). The proxy already fail-softs; the gap is the client giving up immediately.
- **Decision:** Retry only `GET_cgspaceSearch` inside `initSearchPipeline`, before mapping into UI state. Leave the server and facets alone.
- **Alternatives considered:** Server-side retry (multiplies every consumer and the 8 s timeout; out of Lite scope). User-visible “Retrying 2/3” (new UI state, forbidden by requirements). Shared retry helper (YAGNI for one call site).
- **Consequences:** Both Report result hosts pick it up. Persistent CGSpace outage costs up to three timeouts before the familiar error.

### `KCSR-DD-2` — Two automatic re-subscriptions, 600 ms apart

- **Context:** `KCSR-A-1` pins 3 **total** calls. `KCSR-R-10` wants a short gap without a stampede.
- **Decision:** Match `CentersService`: automatic re-subscribe count = 2, delay = 600 ms. Named constants on the component; delay overridable in tests.
- **Alternatives considered:** Zero delay (can hammer a recovering host). Exponential backoff (overkill for three tries). Three retries **after** the first call (four total — contradicts the approved assumption).
- **Consequences:** Implementers must not use a retry count of 3 (that would be 4 HTTP calls).

### `KCSR-DD-3` — 502-shaped success bodies count as failures

- **Context:** `KZ-KPB-1` — `CgspaceDiscoveryService.search` returns `{ status: 502, message }` without throwing. HttpClient therefore often completes. Today’s UI already treats `res.status >= 400` as error.
- **Decision:** Lift that same rule onto the attempt itself so retry sees it. A thrown error and a 502 body share one budget.
- **Alternatives considered:** Retry only thrown HTTP errors (would miss the live 502 path and leave **Try again** on attempt 1). Retry only 5xx (narrower than `KCSR-A-2`).
- **Consequences:** Validation 400s from bad client params would also retry three times. Browse already blocks those via `canSearch()` / DTO rules; residual risk accepted for Lite.

### `KCSR-DD-4` — Rely on existing `switchMap` for cancellation

- **Context:** `KCSR-R-2` forbids applying query A’s late retry to query B.
- **Decision:** Keep retry **inside** the current `switchMap`. Unsubscription cancels in-flight HTTP and the inter-attempt timer.
- **Alternatives considered:** Manual attempt counter + `concat` (more state, easy to leak). `exhaustMap` (would ignore Enter / new filters until retries finish).
- **Consequences:** Tests must start B before A’s delayed retry fires, then assert B’s params.

---

## 13. Open Gaps & Follow-ups

- Server-side retry or un-caching of 502s is deferred. Not needed: failures are not cached today.
- Facet retry is deferred (out of scope).
- A shared client retry helper is deferred until a second call site needs the same budget.
- Risk: three 8 s timeouts feel slow. Mitigation: loading stays visible; Manual entry remains on the error card and during loading (`KPB-R-11` inputs stay enabled).
- No Step 2.3 reversion challenge — this adds retries; it does not remove the error UI, Manual entry, or the existing **Try again** control.

---

## Required cross-references

- `docs/specs/changes/kp-cgspace-search-retry/requirements.md`
- `docs/prd.md` — `G1`, `G4`, `US-S1`, `US-S5`, `AC-8`, `AC-9`
- `docs/ux-ui/design.md` — Empty / error / loading
- `docs/trd/trd.md` — CGSpace HTTP integration
- Archived parent design: `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/design.md`
- Precedent: `onecgiar-pr-client/src/app/shared/services/global/centers.service.ts` retry budget
- Lesson applied: `KZ-KPB-1` (`docs/specs/kaizen/changes--kp-cgspace-browse.md`)
