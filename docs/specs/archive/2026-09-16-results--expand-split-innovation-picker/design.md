# Module Spec — `design.md`

## 1. Summary

Broaden the merge/split-target innovation pool (server) to any active, non-discontinued Innovation Development result, and upgrade the merge/split picker UI in `rd-annual-updating` from a plain `app-pr-multi-select` to the same component **with a new opt-in server-side search mode**, so it reads/feels like the "linked result" search pattern without forking a new component. Biggest trade-off accepted: this **reverts a documented business decision** (P2-3292 Step 3) — see `RES-DD-1`.

Links: `docs/specs/results/expand-split-innovation-picker/requirements.md`; `docs/trd/trd.md` §"Results" module; `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/CLAUDE.md`.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `onecgiar-pr-server/src/api/results/result.repository.ts` (`MERGE_SPLIT_TARGET_STATUS_IDS` removal from the query), `results.service.ts` / `results.controller.ts` (no signature change — `search`/`limit` already exist on `getMergeSplitTargetInnovations`).
- **Client modules touched:** `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/` (new opt-in server-search capability), `pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/` (wiring + info text + i18n keys), `shared/services/api/results-api.service.ts` (`GET_mergeSplitTargetInnovations` — already accepts `search`, just needs to be called with it).
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

```
[rd-annual-updating]
  ├── on open (unchanged): loadMergeSplitCatalogue() [guarded, fetch-once]
  │     └── GET /v2/api/results/get/merge-split-target-innovations/:resultId
  │           └── populates mergeSplitCatalogue (now unrestricted by status_id)
  └── on search input (NEW, debounced ~300ms):
        └── app-pr-multi-select emits (searchTextChange)
              └── rd-annual-updating calls a NEW, UNGUARDED method: searchMergeSplitCatalogue(term)
                    └── GET .../:resultId?search=<term>
                          └── result.repository.ts: is_active=TRUE AND NOT discontinued AND type=INNOVATION_DEVELOPMENT
                              AND result_code/title LIKE %term% AND id <> self  (status_id filter REMOVED)
                    └── mergeSplitCatalogue reassigned to: [...currently-selected candidates not in the response, ...response]
                          (selection-preserving merge — see RES-DD-3)
```

Both the merge and split `app-pr-multi-select` instances continue to read the same `mergeSplitCatalogue`, distinguished only by `transition_type`, exactly as today — no change to that sharing model (`SIP-OQ-2`, resolved: same filter for both).

**Judgment-day round 1 correction (both judges, confirmed severe — see `judgment.md`):** the original draft of this section said the search response simply "replaces" `mergeSplitCatalogue`. Two real defects were found in that shape and are fixed by the plan above and `RES-DD-3`:
1. **Selection loss:** `selectedTargets()` (`rd-annual-updating.component.ts:277-281`) resolves each stored `target_result_id` via `.find()` inside `mergeSplitCatalogue` and drops anything not found. A search that narrows the catalogue past an already-selected item would silently unselect it. Fixed by merging currently-selected candidates back into the array before reassignment, never dropping them purely because a search term excludes them.
2. **Stability risk:** `rd-annual-updating.component.ts:207-229` documents a previously-fixed NG0103 "could not stabilize" production bug from handing `pr-multi-select` a fresh array reference every change-detection pass. Reassigning `mergeSplitCatalogue` outright on every keystroke reproduces that reference-churn shape. Fixed by reusing the same `selectionCache`-style stability pattern that fixed it the first time (§6.2 below) — the search path must go through the same stable-reference discipline as the initial load, not around it.
3. **Guard reuse:** `loadMergeSplitCatalogue()` is guarded by `mergeSplitCatalogueRequested` to fetch once. The search path is a **separate, unguarded method** (`searchMergeSplitCatalogue`) — reusing the guarded method as originally implied would silently no-op after the first load and break `SIP-AC-5` (search would never update the list).

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Result` | `api/results/entities/result.entity.ts` | No change — `status_id`, `is_active`, `is_discontinued` already exist and are already read by this query. |

No new columns, no new tables. `merge_split_targets` already stores arbitrary target result ids regardless of their status, so broadening the source pool is purely a `WHERE`-clause change.

### 3.2 Migrations

None required.

### 3.3 CLARISA / external-data implications

None — this feature does not touch CLARISA catalogs.

---

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `GET /v2/api/results/get/merge-split-target-innovations/:resultId` (existing — no route/DTO shape change) |
| **Version** | `v2/api` |
| **Auth** | JWT required (unchanged). |
| **Role** | Any authenticated submitter with access to the result (unchanged — no new role gate). |
| **Request DTO** | Unchanged: `resultId` path param, optional `search` (string) and `limit` (number) query params — both already declared, `search` simply goes from "accepted but unused by the client" to "used." |
| **Response DTO** | Unchanged shape — same candidate rows, just a larger/different set given the same or a text filter. |
| **Errors** | Unchanged (`result not found` on bad `resultId`). |
| **Telemetry** | No new logging needed — this is a `WHERE`-clause change, not a new code path. |

### 4.2 Bilateral / platform-report impact

None. `merge_split_targets` is not part of any bilateral or platform-report payload (confirmed by grep — no summary builder under `api/results/summary/` reads `merge_split_targets`). `SIP-AC` list does not need a payload fixture.

---

## 5. Server Workflow / Business Rules

- **Controller** (`results.controller.ts`, `getMergeSplitTargetInnovations`): unchanged — still `@Version('2')`, `ParseIntPipe` on `resultId`, passes `search`/`limit` through.
- **Service** (`results.service.ts`, `getMergeSplitTargetInnovations`): unchanged — still validates the result exists and derives `excludeResultCode`.
- **Repository** (`result.repository.ts`, `getMergeSplitTargetInnovations`): the only change. Remove `AND r.status_id IN (${statusPlaceholders})` from both the main `WHERE` and the de-dup `NOT EXISTS` subquery, and remove the now-unused `statusPlaceholders`/`MERGE_SPLIT_TARGET_STATUS_IDS` binding from `params`. Everything else — `is_active`, `is_discontinued`, `result_type_id = INNOVATION_DEVELOPMENT`, `excludeResultCode`, `search` LIKE clause, `ORDER BY result_code DESC`, `LIMIT` — stays exactly as-is.
- **`MERGE_SPLIT_TARGET_STATUS_IDS` constant fate:** delete it (and its block comment) once the query no longer references it, rather than leaving a dead, misleading constant in the file. `QA_LINKABLE_INNOVATION_STATUS_IDS` (the sibling constant for the unrelated QA-linkable-innovation feature, P2-3420/P2-3421) is untouched.
- **Transactions/concurrency:** none — read-only query, no change.
- **Background jobs:** none involved.

No workflow (`W1..W8`) in `docs/trd/trd.md` names this flow explicitly; it is a sub-flow of the Innovation Development annual-update lifecycle.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. Same `rd-general-information` module, same `rd-annual-updating` component.

### 6.2 Components & services

- **`pr-multi-select` (custom-fields)** gets one new **opt-in** capability: an optional `serverSearch` mode.
  - New input: `[serverSearchDebounceMs]` (default e.g. `300`) — only meaningful when `serverSearch` is used.
  - New output: `(searchTextChange)` — emits the trimmed search string, debounced, when `serverSearch` mode is on. When this output has a listener wired (i.e., the parent opts in), the component's own `filterFlatOptions` local filtering is **bypassed** for that instance — the parent owns filtering by replacing `[options]` after each server response. When not wired, existing behavior (client-side `filterFlatOptions`) is 100% unchanged — this is why the change is safe for the other ~78 template instances.
  - No change to `ControlValueAccessor`, chip rendering, grouping, or the mandatory-marker behavior (`CLAUDE.md` trap #1) — none of that is touched by this feature.
- **`rd-annual-updating.component.ts`**:
  - Wires `(searchTextChange)` on both the merge and split `app-pr-multi-select` instances to a new `searchMergeSplitCatalogue(term: string)` method (separate from the guarded `loadMergeSplitCatalogue()` — see `RES-DD-3`) that calls `GET_mergeSplitTargetInnovations(resultId, term)` and reassigns `mergeSplitCatalogue` using the **selection-preserving merge** described above and in `RES-DD-3` — never a bare overwrite.
  - The reassignment MUST go through the same stable-reference discipline (`selectionCache`-style handling, per the existing NG0103 fix at lines 207–229) that the initial load already uses — this is a correction, not new architecture: the search path reuses the pattern, it does not invent a second one.
  - Removes the "quality-assessed" wording from both `description` strings (merge L109, split L127); both stay textually identical to each other, per `SIP-AC-4`.
  - No change to how selections are read/written (`generalInfoBody.merge_split_targets`, `transition_type` discrimination) — that data contract is untouched.
- **`results-api.service.ts`**: no signature change to `GET_mergeSplitTargetInnovations` — it already accepts `search`; `rd-annual-updating` simply starts passing it.

### 6.3 Design system usage

- No new Spartan/Helm component — reusing `pr-multi-select`'s existing search box and virtual-scroll list is the whole point (it already renders the "search + scrollable checkbox rows" shape `SIP-R-5`/`SIP-R-6` ask for; the visual gap with Image #11 was about *filter chips*, and `SIP-R-20`/`SIP-OQ-3` resolves those as out of scope for now — search-only is sufficient given the candidate set is always single-typology).
- Tokens: none new. `pr-multi-select` already uses `--pr-*` tokens.
- Responsive: no change — same field, same section layout.
- A11y: `pr-multi-select`'s existing labelled search input, checkable rows, and keyboard support carry over unchanged; no new a11y surface introduced.
- i18n: the two `description` strings and any new placeholder text move under `src/app/internationalization/` as new `TermKey`s if they must vary P22/P25 — confirm during implementation whether Annual Updating is P25-only (if so, plain string is acceptable per existing pattern in that file, matching the current unmigrated string).

### 6.4 Real-time / notification UX

None — no socket/notification surface touched.

---

## 7. Security & Authorization

- No change to JWT gating (endpoint already requires JWT).
- No change to role checks — Annual Updating already requires the same access as before; broadening *which innovations appear as candidates* does not broaden *who can open the picker*.
- No new input surface beyond the existing `search` string, which already flows through a parameterized `LIKE` (confirmed in the existing repository code — bound params, not string interpolation).
- No secrets/logging changes.

---

## 8. Performance & Capacity

- Removing the status filter can only **grow** the eligible pool (Editing/Submitted innovations that were previously excluded now qualify), never shrink it. The existing `LIMIT` (default 50) and the new server-side `search` wiring (`SIP-R-10`) are the mitigation — without them, a large portfolio could return an unbounded list to `app-pr-multi-select`'s virtual scroll. Confirm the default `limit` is still appropriate for the current Innovation Development volume (`docs/trd/trd.md` doesn't give a portfolio-wide row count; check via a manual query on `test`/`staging` before rollout, not a new automated check — see `RES-DD-2`).
- No Lambda cold-start impact — no new dependency.

---

## 9. Observability

- No new structured logs needed; this is a query-shape change on an existing, already-logged-on-error path.
- No new `docs/prd.md` metric moves; this is a UX/data-completeness fix, not a tracked M1.x–M4.x metric today.

---

## 10. Testing Plan (forward-looking)

**Defect classes this spec can produce, and what catches each:**

| Defect class | Catching command | Coverage note |
|---|---|---|
| Server query regresses (e.g. still excludes Editing/Submitted, or now leaks discontinued/inactive/self) | `result.repository.spec.ts` — new/updated unit test asserting the SQL/params no longer include the status placeholder set, plus a repository-level test against a seeded in-memory/test dataset per `SIP-AC-1/2/3` | Automated, server unit test |
| `search` param silently ignored by the client (regression risk: it already existed unused for months) | `rd-annual-updating.component.spec.ts` — assert `GET_mergeSplitTargetInnovations` is called with the typed search term after the debounce, **and** that `mergeSplitCatalogue`/the rendered options actually narrow to the response (not just that the call fired) | Automated, client unit test (Jest) |
| Selecting a target then searching past it silently drops the selection (`RES-DD-3`, judgment-day round 1) | `rd-annual-updating.component.spec.ts` — new case: select a target, search with a term that excludes it from the raw server response, assert it remains in `generalInfoBody.merge_split_targets` and in the rendered selection | Automated, client unit test (Jest) — **this is the test that did not exist in the pre-judgment-day draft** |
| Search-driven catalogue reassignment reproduces the previously-fixed NG0103 reference-churn bug (`component.ts:207-229`) | `rd-annual-updating.component.spec.ts` / manual browser check — assert the stable-reference pattern is reused, not bypassed, on the search path | Automated assertion is a proxy (reference-identity check); full confidence needs the manual browser pass already planned below, since NG0103 is a runtime change-detection failure jsdom may not reproduce |
| Info text still says "quality-assessed" | `rd-annual-updating.component.spec.ts` — snapshot/string assertion on both `description` bindings | Automated, cheap presence check — **note:** this proves the *string* changed, not that the eligibility rule matches the string; the repository test above is what proves the behavior |
| `pr-multi-select`'s new opt-in server-search mode breaks the other ~78 existing instances that don't use it | `pr-multi-select.cy.ts` (Cypress CT, existing suite) — must stay green untouched, since the change is additive and gated behind an unwired-by-default output | Automated, `npm run test:ct` — **this is the component excluded from Jest DOM coverage per client `CLAUDE.md` §9, so CT is the only harness that can see its real overlay/scroll behavior** |
| Visual match to the "linked result" search pattern (subjective, no chips) | No automated check — layout/visual fit is not something Jest/Cypress CT can judge for "does this feel consistent" | **Accepted gap, substituted:** manual verification in a real browser per client `CLAUDE.md` §9 "Verifying in a REAL browser" before marking the task done; not blocking a T6 review since no new visual design artifact was generated (`Visual Reference: None` beyond the two reference screenshots) |

### Test list

- Unit (server): `result.repository.spec.ts` — updated to assert the broadened `WHERE` clause; new cases for `SIP-AC-1/2/3`.
- Unit (client): `rd-annual-updating.component.spec.ts` — updated for the new search wiring and the info-text change (`SIP-AC-4/5`).
- Component test (client): `pr-multi-select.cy.ts` — add one new case exercising `serverSearch`/`searchTextChange` opt-in mode; confirm all existing cases still pass unmodified.
- Manual: open `rd-annual-updating` in a real browser (per client `CLAUDE.md` §9 trap list — inject both `token` and `user`, confirm the served bundle isn't stale), verify an Editing-status innovation now appears, verify search narrows the list.

Coverage uplift: no new files beyond touched ones; existing thresholds (server 5/20/35/40, client 50/60/60/60) are not expected to move meaningfully — this is a targeted change to already-covered files.

---

## 11. Backwards Compatibility & Migration Plan

- API contract: additive-safe (`search` was already declared; no shape change). No `v2` rollout needed beyond the version already in place.
- No feature flag — the business-rule change is immediate on deploy, per the user's confirmed sign-off (`SIP-OQ-1`).
- No data backfill — `merge_split_targets` rows already reference arbitrary result ids; nothing to migrate.
- No downstream consumer notification needed (§4.2 — not part of any external payload).

---

## 12. Design Decisions (ADRs)

### `RES-DD-1` — Supersede the P2-3292 Step 3 status gate for merge/split targets

- **Context:** `MERGE_SPLIT_TARGET_STATUS_IDS` (`result.repository.ts` ~L59–85) is a **documented business decision** from P2-3292 Step 3 restricting merge/split targets to `QualityAssessed`/`Approved`. The current request asks to override it so a newly reported, not-yet-QA'ed innovation can be selected as a split/merge target.
- **Decision:** Remove the status_id restriction entirely for `getMergeSplitTargetInnovations()`. Confirmed with the user 2026-09-16 (recorded in `requirements.md` §2 and resolved `SIP-OQ-1`). This is a **superseding** decision, not a bug fix — the old rule was correct for its own story; the business need changed.
- **Reversion challenge (Step 2.3):** *"What does removing this break?"* — Nothing currently reads `MERGE_SPLIT_TARGET_STATUS_IDS` outside `getMergeSplitTargetInnovations()`'s own query (confirmed by grep: the constant has exactly the two internal usages already documented in the code comments, both inside this one method). The sibling `QA_LINKABLE_INNOVATION_STATUS_IDS` is a separate, unrelated constant guarding a different feature (P2-3420/P2-3421 innovation-use linking) and is not touched. No other caller, test fixture, or downstream payload depends on the removed restriction (§4.2). **No breakage found; safe to proceed.**
- **Alternatives considered:**
  1. Add a *new*, separately-named constant and leave `MERGE_SPLIT_TARGET_STATUS_IDS` in place unused — rejected: leaves dead, misleading code exactly of the kind the existing comments warn against ("Change THIS constant — and nothing else").
  2. Keep the QA gate but add a manual "override" checkbox for submitters — rejected: not what was asked, adds UI complexity for a rule the business explicitly wants gone.
- **Consequences:** The next time someone reads `result.repository.ts` they will not find `MERGE_SPLIT_TARGET_STATUS_IDS` — this design deletes it along with its block comment (§5). Any future ticket that wants to *reintroduce* a status gate for merge/split targets starts from zero context, not from editing a stale constant. `docs/trd/trd.md` §11 (technical ADR log) should record this supersession as part of the archive sync, per root `CLAUDE.md`'s ADR-superseding convention.

### `RES-DD-2` — Extend `pr-multi-select` with an opt-in server-search mode instead of building a new picker component

- **Context:** The proposal considered building a purpose-built picker component to match the "linked result" search+scroll UI. Design research found `pr-multi-select` (the canonical multi-select, 80 instances / 34 templates) already renders a search box + virtual-scrolled checkable list — the exact shape `SIP-R-5`/`SIP-R-6` need. Its search is currently client-side only (`filterFlatOptions`), which conflicts with `SIP-R-10` (prefer server-side search at scale).
- **Decision:** Add an additive, opt-in `(searchTextChange)` output (+ optional debounce input) to `pr-multi-select`. When a consumer wires it, the component's internal client-side filtering is bypassed for that instance and the parent supplies pre-filtered `[options]`. When unwired (all ~78 other current call sites), behavior is byte-for-byte unchanged.
- **Alternatives considered:**
  1. Build a new `shared/components/result-picker/` from scratch — rejected: duplicates virtual-scroll, checkbox-row, and a11y work `pr-multi-select` already has proven in production; higher LOC and review surface for the same visual outcome.
  2. Fork `pr-multi-select` into a second component for this one field — rejected: guarantees drift between two components that render the same thing, the exact anti-pattern the client `src/CLAUDE.md` §10 warns against ("Re-implementations are the #1 source of UI drift").
- **Consequences:** `pr-multi-select.cy.ts` gains one more case to keep green forever; any future feature needing server-side search on a multi-select can reuse this mode instead of re-solving it. No filter-chip infrastructure is added (`SIP-R-20` stays a MAY, resolved as "not needed now" per `SIP-OQ-3`) — if a future spec needs chips on top of this, it composes them alongside `pr-multi-select`, it does not fork it.

---

### `RES-DD-3` — Selection-preserving merge on search, and a separate unguarded search method

- **Context:** Judgment-day round 1 (`judgment.md`) confirmed, via both independent judges, that naively replacing `mergeSplitCatalogue` with each search response (a) silently drops already-selected targets not present in the narrowed result set (`selectedTargets()`'s `.find()`+filter behavior), and (b) risks reproducing a previously-fixed NG0103 stability bug from reference churn. A third, related gap: reusing the fetch-once-guarded `loadMergeSplitCatalogue()` for search would silently no-op after the first load.
- **Decision:**
  1. `searchMergeSplitCatalogue(term)` is a new method, separate from `loadMergeSplitCatalogue()` — it is never guarded by `mergeSplitCatalogueRequested`.
  2. Before reassigning `mergeSplitCatalogue`, merge in any candidate currently referenced by `generalInfoBody.merge_split_targets` (for either `transition_type`) that is missing from the new search response, so an active selection is never dropped purely because it doesn't match the current search text.
  3. The reassignment follows the same stable-reference pattern that fixed the original NG0103 bug (component.ts:207–229) — new array identity only when content actually changes, not on every keystroke/response cycle.
- **Alternatives considered:**
  1. Keep two separate arrays (one for "all loaded," one for "currently selected," rendered as a combined view) — rejected: bigger surface change to `pr-multi-select`'s binding contract than necessary; the merge-before-assign approach fixes the defect with a small, local change.
  2. Disable search once at least one target is selected — rejected: defeats the point of the feature (finding a target among many candidates) the moment it's needed.
- **Consequences:** `rd-annual-updating.component.spec.ts` must add a test case: select a target, search for something that would exclude it from the raw server response, confirm it remains selected and present in the rendered list. This is additional task scope beyond the original estimate (see revised Budget below).

---

## 13. Open Gaps & Follow-ups

- `SIP-R-20`/`SIP-OQ-3`: no additional filter (portfolio/phase) is being added now. If usage feedback shows the broadened candidate list is too large to scan by search alone, revisit with a follow-up spec — do not silently add scope here.
- Confirm during implementation whether `rd-annual-updating`'s Annual Updating block is P25-only (affects whether the two `description` strings need a new `TermKey` or can stay a plain string, matching the file's current unmigrated pattern).
- Manually verify the current default `limit` (50) is still reasonable now that the pool is unrestricted by status (§8) — not a blocking risk, just worth a spot-check on `staging`.

---

## Budget (Step 2.4, revised after judgment-day round 1)

- **Expected tasks:** ~6 (server query change + test, `pr-multi-select` server-search mode + CT test, `rd-annual-updating` wiring incl. selection-preserving merge (`RES-DD-3`) + info text + spec update, the new selection-preservation regression test, manual browser verification incl. NG0103 stability check, docs/CLAUDE.md touch-ups for the two folders' `Verified:` stamps).
- **Expected LOC:** ~190–260 (revised up from 150–220 — `RES-DD-3`'s merge-before-assign logic and its dedicated test case add real lines beyond the original estimate; still mostly test code).
- **Expected review rounds:** 2 (revised up from 1–2) — the selection-preserving merge and its interaction with the NG0103-fix pattern is exactly the kind of logic worth a careful second look, not a rubber-stamp.

**Sizing check (Step 2.4):** Still within **Standard** depth after the revision — the increase is real but not large enough to warrant Full (no new entity, no migration, no auth/security surface). No depth change recommended.

---

## Required cross-references

- `docs/specs/results/expand-split-innovation-picker/requirements.md` (same folder).
- `docs/prd.md` (`G2`, `US-S2`), `docs/ux-ui/design.md` (§10 a11y), `docs/trd/trd.md` (`api/results/` module).
- No bilateral/platform-report doc touch needed (§4.2).
