# Design — Discard several AI draft results at once (`ABD`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-drafts-bulk-discard/` |
| Depth | Standard (re-checked against this design: 4 tasks, ~520 LOC incl. specs → Standard holds) |
| Approval Mode | gated |
| Status | draft — awaiting owner review |
| Linked requirements | `requirements.md` (ABD-R-1 … R-8, NFR-1 … 6) |
| **Budget (tripwire for `/akili-execute`)** | **4 tasks · ~520 LOC (≈220 prod + ≈300 spec) · ≤ 2 review rounds per task** |
| Reversion challenge (Step 2.3) | No DD removes shipped behavior. Single discard keeps its contract; the only change is adding a transaction (additive). Not triggered |

## 2. Executive Summary

Additive server endpoint `POST api/bilateral/center/ai/drafts/discard` that loops over ids through a shared per-draft transactional helper (also used by the existing single `DELETE`). Client adds a bulk method on the API + `BilateralAiService`, and a component-local selection state on `my-draft-results` with a Spartan checkbox column, per-card select-all, a sticky action bar and one confirmation dialog.

## 3. Architecture Overview

```text
my-draft-results (component)
  ├─ selection signal (Set<draftId>)  ── cleared by filter/center/list changes (ABD-R-7)
  ├─ row + header hlm-checkbox        ── ABD-R-1/R-2
  ├─ action bar + confirm dialog      ── ABD-R-3/R-4
  └─ BilateralAiService.discardDrafts(ids)          ── ABD-R-6
        └─ BilateralApiService.POST_bilateralAiDraftsDiscard
              └─ POST api/bilateral/center/ai/drafts/discard   (BilateralAiController)
                    └─ BilateralAiService.discardDrafts(ids, userId)       ── ABD-R-5
                          └─ per id: discardOne(id, userId)  [getDraftRaw 'act' + tx]
DELETE …/drafts/:draftId ──► discardDraft ──► discardOne                    ── ABD-R-8
```

## 4. Extended Directory Structure

```text
onecgiar-pr-server/src/api/bilateral-ai/
├── bilateral-ai.controller.ts            # + POST drafts/discard
├── bilateral-ai.controller.spec.ts       # + route test
├── dto/discard-bilateral-ai-drafts.dto.ts        # NEW
├── dto/discard-bilateral-ai-drafts.dto.spec.ts   # NEW
└── services/bilateral-ai.service{,.spec}.ts      # + discardDrafts, discardOne (private), discardDraft refactor

onecgiar-pr-client/src/app/
├── shared/services/api/bilateral-api.service{,.spec}.ts      # + POST_bilateralAiDraftsDiscard
├── pages/bilateral/services/bilateral-ai.service{,.spec}.ts  # + discardDrafts
├── pages/bilateral/services/bilateral-ai.interfaces.ts       # + BulkDiscardResponse
└── pages/bilateral/pages/my-draft-results/
    ├── my-draft-results.component.{ts,html,spec.ts}          # selection, bar, dialog
    └── CLAUDE.md                                             # contract + Verified stamp
```

## 5. Data Model

No schema change (ABD-NFR-5). Writes per draft, unchanged in meaning:

| Table | Column | Value |
|---|---|---|
| `bilateral_ai_draft` | `is_discarded` | `true` |
| `result` | `is_active` | `false` |

Both in one transaction per draft (ABD-S-5.3). No audit / `last_updated_by` added (out of scope; same as today).

## 6. API Design

### `POST api/bilateral/center/ai/drafts/discard` (new)

| Item | Value |
|---|---|
| Auth | Same guard chain as the controller (custom `auth` header) |
| Body | `{ draftIds: number[] }` — `IsArray`, `ArrayNotEmpty`, `ArrayMaxSize(100)`, each `IsInt` + `Min(1)`; duplicates removed server-side before processing |
| 200 response (envelope `response`) | `{ discarded: number[]; failed: { id: number; reason: 'not_found' \| 'forbidden' \| 'error' }[] }` |
| 400 | Validation failure — nothing written |
| Partial failure | Still 200; caller reads `failed` |
| Route ordering | `drafts/discard` (POST) does not collide with `drafts/:draftId/promote` (POST, 3 segments) or `DELETE drafts/:draftId` |

Mapping of per-id errors: `NotFoundException` → `not_found` (missing or already discarded), entitlement `ForbiddenException`/`UnauthorizedException` → `forbidden`, anything else → `error` (logged with draft id only, no user data — `.cursorrules`).

### `DELETE api/bilateral/center/ai/drafts/:draftId` (unchanged contract)

Same path, params, response `{ id, discarded: true }`, message `AI draft discarded`. Internally calls the shared transactional helper.

## 7. Backend Module Design

| Element | Design |
|---|---|
| `discardOne(draftId, userId)` (private) | `getDraftRaw(draftId, userId, 'act')` (unchanged checks), then both updates inside one transaction via the repository's `manager.transaction`, using the transactional manager's repositories for `BilateralAiDraft` and `Result` |
| `discardDraft(draftId, userId)` | Calls `discardOne`, returns the current envelope (ABD-R-8) |
| `discardDrafts(draftIds, userId)` | Dedupe; **sequential** loop (not `Promise.all`: ≤ 100 small writes, avoids pool exhaustion and keeps logs ordered); each `discardOne` in its own try/catch → push to `discarded` or `failed`; returns envelope with message `N AI drafts discarded` |
| Entitlement | Reused per id. Admin-only users fail as `forbidden` (`ASC-R-15`, ABD-S-5.5) |
| Controller | `@Post('drafts/discard')`, `@Body() dto: DiscardBilateralAiDraftsDto`, `@UserToken() user`; Swagger `@ApiBody` |
| Observability | One log line per batch: count requested / discarded / failed (no ids of other centers' data beyond the numeric id) |

## 8. Frontend / UX Component Architecture

### 8.1 State (component-local, `my-draft-results.component.ts`)

| Signal / computed | Purpose |
|---|---|
| `selectedIds = signal<Set<number>>(new Set())` | Selection (ids normalized with `Number()` — TypeORM serializes ints as strings, CLAUDE.md trap) |
| `selectedCount = computed` | Bar count |
| `cardSelectionState(group)` | `'all' \| 'some' \| 'none'` over the group's **visible** drafts |
| `isBulkDiscarding = signal(false)` | In-flight guard (ABD-S-6.4) |
| `showBulkDiscardDialog = signal(false)` | Confirmation |
| Clearing effect | Reads `drafts()` (filtered list) and the center id; when the visible id set no longer contains every selected id **or** filters/center change, clears the selection (ABD-R-7). Must read its signals unconditionally before any early return (same trap as the `?job=` effect) |

Selection is component-scoped (not on `BilateralAiService`), matching the component-provided filter service: leaving the tab or switching center drops it.

### 8.2 Template

| Piece | Design |
|---|---|
| Row checkbox | New first column in each card table, `hlm-checkbox` with `aria-label="Select draft: {title}"`; rendered only under `isCenterMember()` |
| Header checkbox | In the card header, before the hash; `checked` = all, `indeterminate` = some; `aria-label="Select all drafts of this upload"` |
| Action bar | Sticky at the bottom of the tab's scroll container (`#workArea`), shown when `selectedCount() > 0`: "N selected" (mono figure) · **Discard selected** (destructive outline) · **Clear selection** (ghost). No new brand button (ABD-S-3.2, UI rule 1) |
| Dialog | Reuse the page's existing discard dialog pattern (`app-pr-dialog`, click-driven confirm — acceptable per src/CLAUDE.md §21.7) with bulk copy; confirm disabled while `isBulkDiscarding()` |
| Styling | Tailwind utilities, `--pr-*` tokens, px sizes; Spartan MCP consulted for `hlm-checkbox` indeterminate API before writing |
| Scrolling | Never `scrollIntoView` (CLAUDE.md trap) — the bar is sticky, no programmatic scroll |

### 8.3 Service (`BilateralAiService.discardDrafts(ids)`)

| Step | Behavior |
|---|---|
| Optimistic | Snapshot `draftList()`; remove the ids |
| Call | `POST_bilateralAiDraftsDiscard(ids)` |
| Success | Restore any id in `failed`; return `{ discarded, failed }` to the component; one toast (success or partial) |
| Error | Restore the snapshot; one error toast (generic message, server text hidden — existing convention) |
| Navigation | **None** (unlike single `discardDraft`, which reloads the route — unchanged) |
| `currentDraft` | Cleared only if its id is in `discarded` |

The component, on return: selection = `failed` ids (ABD-S-6.2) or empty.

## 9. Shared Contracts or Package Extensions

- Client interface `BulkDiscardDraftsResponse { discarded: number[]; failed: { id: number; reason: string }[] }` in `bilateral-ai.interfaces.ts`.
- API method name `POST_bilateralAiDraftsDiscard` (`HTTP_METHOD_descriptiveName`).
- Copy strings: hard-coded English acceptable as structural copy per src/CLAUDE.md §11, kept as constants at the top of the component for one-place edits (ABD-OQ-2).

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| ABD-DD-1 | Dedicated bulk endpoint | Client `forkJoin` over N `DELETE`s | One request, one summary, no N-toast merging; fixes atomicity once (ABD-NFR-1) |
| ABD-DD-2 | Per-draft transaction, independent commits | One transaction for the whole batch | One stale/forbidden id would cancel the user's other 11 discards; matches `ADE-R-9` |
| ABD-DD-3 | Sequential loop | `Promise.all` | ≤ 100 rows; predictable connection use and error mapping |
| ABD-DD-4 | 200 with `failed[]` on partial failure | 207 / 4xx | Envelope consumers expect 200; partial results are data, not an error |
| ABD-DD-5 | Selection state in the component | In `BilateralAiService` (root) | Must reset on tab/center leave, same reason as the filter service |
| ABD-DD-6 | Clear selection on any visible-set change | Keep and silently drop hidden ids | Guarantees ABD-S-7.1: what is discarded is what is on screen |
| ABD-DD-7 | Select-all per upload card, selection page-wide | Page-level select-all | Avoids one click discarding every draft of every upload; matches "one donor report" mental model (ABD-OQ-1) |
| ABD-DD-8 | Cap 100 | No cap | Bounded request; largest observed job ~14–20 drafts (to confirm with ABD-OQ-3 query) |

## 11. Risks & Rollback

| Risk | Mitigation |
|---|---|
| Bulk mistake deactivates many results | Count in dialog; selection cleared on filter change; per-card select-all only |
| Shared prdb in local checks | Browser checks never confirm a discard on real drafts; verify on PRTest with throwaway drafts |
| Rollback | Revert the client commit (endpoint stays unused) or both; no data migration to undo |
