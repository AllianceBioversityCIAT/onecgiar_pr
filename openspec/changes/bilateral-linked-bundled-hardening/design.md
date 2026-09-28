## Context

`b7195d72e` implemented P2-3368 AC10–AC14 for bilateral results with the P2-3424 narrow protocol. The second pass (server + client, independent, read-only, every finding re-opened by the author of this design) confirmed the protocol and found the holes listed in the proposal. This design fixes them in the smallest surface: the section component and the bilateral service. Nothing shared changes.

Verified facts this design relies on (file:line at `origin/performance-refactor` `6f21d0d58`):

- `pr-multi-select.component.ts:289-303` — `writeValue` remaps raw ids through `source.find(...)` and `.filter(Boolean)`; unknown ids vanish. `:447-461` — `onSelectOption` builds the new value on top of that trimmed list.
- `innovation-use-results.service.ts:8-13` — `resultsList = []`, filled asynchronously in the constructor; not a signal, no re-emission.
- `result.repository.ts:3074-3117` (`getResultsForInnovUse`) — catalogue restricted to `status_id IN (2, 6)`.
- `section-contributors.component.ts:586-592` — keys attached to every payload once `linkedHydrated()`; `:794-806` — the two question handlers; `:272-281` (html) — radio disabled only by `readOnly()`; `:312-315` — `hiddenFieldsWithValues()` ignores hydration.
- `bilateral-center.service.ts:1480-1482` — key-presence guard; `:1555-1606` — `syncLinkedBundledAnswer`: `Boolean(dto.has_innovation_link)`, `dto.linked_results` passed through untouched.
- `results-innovations-use.repository.ts:283-347` — `replaceLinkedResultsByOrigin`: reactivate/insert the given ids, deactivate every other row with `linked_results_id IS NOT NULL`. Empty list = deactivate all id rows.
- `bilateral-center.controller.ts:206-211` — `@Body()` without a pipe; no `useGlobalPipes`/`APP_PIPE` anywhere in the server.
- `contributors-partners.service.ts:755-769` — `filterActiveLinkedResults` (classic hygiene).

## Goals / Non-Goals

**Goals**
- A stored link can only disappear because the user removed it or answered No.
- An unrelated autosave (centres, projects, partners) never touches `linked_result`.
- A hand-made payload cannot flip the answer or wipe rows through type coercion.
- The read-only view shows every stored link, even one the catalogue cannot name.
- Every hole has a test that fails without its fix.

**Non-Goals**
- Changing `pr-multi-select` (shared) or `replaceLinkedResultsByOrigin` (P2-3424 contract).
- Sparing P22 id rows (impossible to tell apart in `linked_result`; same contract as Innovation Use).
- Transactions, phase replication of the flag, catalogue duplicates — pre-existing, documented in the proposal.

## Decisions

### D1 — Union in the caller, not in the primitive
`onLinkedResultsModelChange(selected)` computes `pickerIds = ids(selected)`, `knownIds = ids present in innovationUseResultsSE.resultsList`, and sets
`selectedLinkedResultIds = pickerIds ∪ (previousSelected − knownIds)`.
A stored id the catalogue cannot show can therefore never be removed by omission; it can only be removed by answering No (AC12, whole-list retraction) — which is the only way the user could ever have intended it. Rationale: `pr-multi-select` has ~40 callers; changing its `filter(Boolean)` risks every one of them, and the classic W1/W2 caller has the same exposure but is out of this change's scope (noted for its owner).

### D2 — Late catalogue: re-emit the model, not the primitive
The section already holds the ids in a signal. A `computed` `linkedResultOptions()` returns `resultsList` **plus** a synthetic `{ id, title: 'Result #<id>', result_code: <id>, unknown: true }` entry for every selected id the catalogue lacks. Because the picker's `[options]` is now a new array whenever the selection or the catalogue changes, `writeValue` keeps finding every id, and AC14 chips render as `Result #<id>` instead of vanishing. `formatResultLabel` already handles a missing `name`. The catalogue itself stays a plain array; the section reads it inside the computed through a `signal` refreshed by the same `effect` that hydrates (poll-free: the section re-reads `resultsList.length` when the detail GET resolves, and once more on the first picker open — `(onPanelShow)` is not available on this primitive, so the fallback is the hydration tick; documented as such).

### D3 — Keys only on question change (REVISED during apply, 2026-09-24)
> ⚠️ The first version below ("only the two handlers include the keys") would have LOST answers:
> `BilateralAutoSaveService.schedulePayload` stores one pending body per endpoint and REPLACES it
> (`_pendingPayloads.set`), flushed only on Save draft / page leave. Answer Yes, then change a
> centre → the centre body replaces the answer body → the answer never reaches the server.
> Implemented instead: two flags, `linkedAnswerTouched` / `linkedListTouched`, reset on hydration.
> Untouched → no keys (fixes the stale-snapshot defect). Touched → every later payload carries the
> user's state (survives the queue). The list travels only when the picker was touched, or when a
> No cleared a non-empty list.

Original text, kept for the record:
`buildContributorsPayload(includeLinked = false)`. `persistContributors()` keeps calling it with the default; `onHasLinkedResultChange` calls `persistLinked({ flagOnly: value === true })`, `onLinkedResultsModelChange` calls `persistLinked({ flagOnly: false })`. `persistLinked` builds the payload with `includeLinked = true` and, when `flagOnly`, deletes `linked_results` from it. The `linkedHydrated()` guard stays inside `buildContributorsPayload` as the last line of defence. The server contract already covers the three shapes (flag only / flag + list / No with empty list).

### D4 — Radio disabled until hydrated
`[disabled]="readOnly() || !linkedHydrated()"`. The picker is only rendered when `hasLinkedResult() === true`, which cannot happen before hydration once the radio is locked, so it needs no extra guard.

### D5 — AC13 counter gated by hydration
`hiddenFieldsWithValues()` returns 0 for this question while `!linkedHydrated()`. The partner keys already follow this rule through `partnersHydrated`.

### D6 — Server normalisation without a pipe
In `syncLinkedBundledAnswer`: `const answer = typeof dto.has_innovation_link === 'boolean' ? dto.has_innovation_link : null` (a string, number or null = "not answered" = return early; the `result` row is not touched). `const list = Array.isArray(dto.linked_results) ? dto.linked_results.filter(n => Number.isInteger(n) && n > 0) : undefined` — a `null` list is *absent*, never "empty". Then `list = list.filter(id => id !== bilResult.id)` and `await this.filterActiveResultIds(list)` (a private copy of the classic query, `SELECT id FROM result WHERE id IN (...) AND is_active > 0`). Rationale for not adding a global `ValidationPipe`: that is a server-wide behaviour change affecting every controller — "config/infra del server", out of bounds.

### D7 — Truthful documentation
Rewrite the two comments and the spec scenario: "Retraction deactivates every `linked_result` row of this result that carries a `linked_results_id`, including rows written by the P22 *Links to results* section through the classic editor; only `legacy_link` rows (NULL id) survive. This is the P2-3424 contract."

## Risks / Trade-offs

- **D1 hides a removal path**: a link the catalogue cannot show cannot be removed individually. Accepted: such links were not written by this section, and answering No still clears them (AC12). Alternative (letting the picker drop them) is the data-loss hole being fixed.
- **D2 synthetic options** could show `Result #<id>` for a link to a result that later left status 2/6. Accepted: showing an opaque chip is strictly better than showing nothing on a read-only result.
- **D3** makes the linked keys absent from the centres/projects autosave; nothing on the server depends on their presence there (`syncLinkedBundledAnswer` is behind the key guard).
- **D6** silently ignores a malformed flag instead of returning 400. Accepted: consistent with how every other block of `saveContributors` treats bad input, and the only client sends well-typed values.

## Migration Plan

No schema change. Deploy order irrelevant (client and server changes are independently safe: an old client with the new server, or the reverse, degrades to today's behaviour). Rollback = `git revert`.

## Open Questions

None that block coding. The classic W1/W2 form shares hole C1 through the same primitive; it is **not** fixed here (owner JC / result-framework-reporting) and is recorded in P2-3823 as a one-line note.
