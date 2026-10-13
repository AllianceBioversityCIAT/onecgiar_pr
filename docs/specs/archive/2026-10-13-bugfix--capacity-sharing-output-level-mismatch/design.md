# Module Spec — `design.md`

> Depth: **Lite** (Bug Mode). Linked: `docs/specs/bugfix/capacity-sharing-output-level-mismatch/requirements.md`.

---

## 1. Summary

Swap two return values in `BilateralResultCreatorComponent.resultLevelName`'s `switch` so the W3/Bilateral breadcrumb strip shows the correct level label for `result_level_id` 3 and 4. No server change, no migration, no API/data-model change. The only trade-off: the fix is a minimal two-line swap rather than extracting a shared label constant (see DD-1).

---

## 1A. Premise Ledger

**Count:** 5 verified, 0 `UNVERIFIED` (0 High, 0 Low).
**Blast-radius triggers:** `live-path` fired (the bug is reached by a real user action — creating/viewing a W3/Bilateral result). `consumer` fired (the computed feeds a template binding). `shared-state` does not apply — `resultLevelName` is a private computed with exactly one reader.

| # | Premise | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| `BIL-P-1` | The backend persists the submitted `result_level_id` for a bilateral result unchanged — it is not re-derived from `result_type_id` | existence | `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts:555-567` — `resultRepository.save({..., result_level_id: dto.result_level_id, ...})`, and lines 527-535 validate the (level,type) pair via `resultByLevelRepository.getByTypeAndLevel` before save, throwing `BadRequestException` on an invalid pair rather than silently coercing it | HEAD of `qa-development-2026-mc-2` at spec time | Fix location moves to the backend; `BIL-T-2` is re-specified |
| `BIL-P-2` | The breadcrumb's level label is driven by `resultLevelName`, a `computed()` in `bilateral-result-creator.component.ts` reading `creationService.resultLevelId()` | live-path | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts:197-211` (the computed) → `.html:227` (`[resultLevelName]="resultLevelName()"`) → `bilateral-page-header.component.html:18-19` (`@if (resultLevelName(); ...)`, `data-testid="bilateral-header-level"`); `resultLevelId` itself is set from the server GET response at `bilateral-creation.service.ts:208` (`this.resultLevelId.set(cf.result_level_id ?? null)`), not derived from `result_type_id` | HEAD | Fix target changes; re-specify |
| `BIL-P-3` | `resultLevelName` has exactly one consumer in the codebase: the `bilateral-page-header` binding | consumer | `grep -rn "resultLevelName" onecgiar-pr-client/src onecgiar-pr-client/cypress` → hits only at `bilateral-result-creator.component.ts:197` (declaration), `.html:227` (binding), plus the unrelated same-named symbols in `result-creator.component.ts:234` (W1/W2, different component, different data source) and `bilateral-page-header.component.ts:152` (the `input()` it feeds, tested independently at `bilateral-page-header.component.spec.ts:740`) | HEAD | A hidden second consumer would need its own test row; none found |
| `BIL-P-4` | The current mapping (3→'Output', 4→'Outcome') is inverted relative to every other `result_level_id` mapping in the repo | data-env | Side-by-side: `onecgiar-pr-server/src/shared/constants/result-level.enum.ts` (`INITIATIVE_OUTCOME=3`, `INITIATIVE_OUTPUT=4`) vs. `onecgiar-pr-client/.../bilateral-result-level-selector.component.ts:3-6` (`{id:3,label:'Outcome'}`,`{id:4,label:'Output'}`) vs. `onecgiar-pr-client/.../shared/result-types-by-level.ts:17-18` (`RESULT_LEVEL_LABELS={3:'Outcome',4:'Output'}`) vs. `bilateral-change-result-type-dialog.component.ts:19` (`{id:5, levelId:4, levelLabel:'Initiative Output'}`) — all four agree with each other and disagree with the buggy computed | HEAD | N/A — premise is the bug itself |
| `BIL-P-5` | Levels 1 (`Initiative`) and 2 (`End of Initiative Outcome`) in the same `switch` are not reachable from the bilateral creation flow, so they are out of scope for this fix | live-path | `onecgiar-pr-client/.../bilateral-result-level-selector.component.ts:3-6` — `RESULT_LEVELS` only offers `id:3` and `id:4`; no bilateral entry point sets `resultLevelId` to 1 or 2 | HEAD | Scope would need to expand to cases 1/2; Impact: Low (same file, same task, no new test surprise since they're untouched by the swap) |

**No `UNVERIFIED` rows** — every claim was checked against the actual source during the Bug Mode investigation (see `requirements.md` §2) before this design was written.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/` only.
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence (unchanged, display-only)

```
[Bilateral result detail page loads]
  └── BilateralCreationService.loadResult() → GET /api/bilateral/... (unchanged)
        └── resultLevelId.set(response.result_level_id)   // already correct (BIL-P-2)
              └── BilateralResultCreatorComponent.resultLevelName (computed)
                    ├── BEFORE: 3→'Output', 4→'Outcome'   (inverted — the bug)
                    └── AFTER:  3→'Outcome', 4→'Output'    (matches ResultLevelEnum)
                          └── bilateral-page-header renders the corrected label
```

---

## 3. Data Model Changes

None. No entity, no migration.

---

## 4. API Surface

### 4.1 New / changed endpoints

None.

### 4.2 Bilateral / platform-report impact

None — `/api/bilateral/*` response shape is unchanged; this is a client-side label fix downstream of an already-correct payload. No change-log entry needed in `bilateral-result-summaries.en.md`.

---

## 5. Server Workflow / Business Rules

Not applicable — no server change.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` — the only file changed.

### 6.2 Components & services

- `resultLevelName` computed (lines 197-211): swap the `case 3` and `case 4` return values.

```
BEFORE                          AFTER
case 3: return 'Output';        case 3: return 'Outcome';
case 4: return 'Outcome';       case 4: return 'Output';
```

- `case 2: return 'End of Initiative Outcome';` and `case 1: return 'Initiative';` are unchanged (BIL-P-5).
- No change to `bilateral-page-header.component.ts` (its `resultLevelName` is an `input()` that already renders whatever string it's given — `bilateral-page-header.component.spec.ts:740` already covers that it renders an arbitrary passed-in label correctly, independent of which label is correct).

### 6.3 Design system usage

None — no visual/token change, only the text value bound into an existing element.

### 6.4 Real-time / notification UX

Not applicable.

---

## 7. Security & Authorization

Not applicable — no new surface, no auth change.

---

## 8. Performance & Capacity

Not applicable — a `computed()` return-value swap has no measurable performance impact.

---

## 9. Observability

Not applicable — no new logging needed for a display-label fix.

---

## 10. Testing Plan (forward-looking)

- **Unit test (client, Jest):** add a `describe('resultLevelName (bugfix: capacity-sharing-output-level-mismatch)')` block to `bilateral-result-creator.component.spec.ts` asserting `component.resultLevelName()` returns `'Outcome'` when `creationService.resultLevelId` is `3`, and `'Output'` when it is `4`. This is a genuinely new test — `grep -rn "resultLevelName" onecgiar-pr-client/src onecgiar-pr-client/cypress` confirms no existing spec exercises this computed today (only the unrelated W1/W2 `result-creator.component.ts` getter and the `bilateral-page-header` input share the name).
- No integration/Cypress test needed — the computed is pure and fully exercised at the unit level; the one template consumer (`bilateral-page-header`) is already tested independently for rendering whatever string it receives.
- Coverage uplift: trivial (one computed, already-covered file); stays well above the 50/60/60/60 client threshold.

---

## 11. Backwards Compatibility & Migration Plan

- No migration. No API contract change. No rollout flag needed — this is a one-release client fix.
- Rollback: revert the PR; no data to roll back (nothing was persisted incorrectly — only the display was wrong).

---

## 12. Design Decisions (ADRs)

### `BIL-DD-1` — Swap the two `case` values in place, do not extract a shared label map

- **Context:** The correct mapping already exists in three other places (`BilateralResultLevelSelectorComponent`, `RESULT_LEVEL_LABELS` in `result-types-by-level.ts`, `bilateral-change-result-type-dialog`). A DRY-er fix would have `bilateral-result-creator.component.ts` import `RESULT_LEVEL_LABELS` instead of maintaining its own `switch`.
- **Decision:** Swap the two values in the existing `switch` only; do not refactor to a shared constant in this spec.
- **Alternatives considered:**
  1. **Import `RESULT_LEVEL_LABELS` from `shared/result-types-by-level.ts`.** Rejected for this spec: it would touch an additional shared file's export surface and widen the diff/review scope for what the user reported as a one-field display bug; a reasonable follow-up, not a blocker to fixing the regression now.
  2. **Read a `result_level_name` string already computed server-side**, mirroring how W1/W2's `result-creator.component.ts:234` getter works. Rejected: `BilateralCreationService` does not currently carry a server-provided level name for this flow (only `result_level_id`, confirmed at `bilateral-creation.service.ts:208`); re-plumbing that is out of scope for a Lite bugfix.
- **Consequences:** The inverted-mapping failure mode (a hardcoded label switch drifting from the canonical enum) remains structurally possible if a future level is added. Recorded as a follow-up in §13, not fixed here.

No reversion challenge applies (Step 2.3) — this fix does not remove, disable, or invert any delivered behavior; it corrects an inverted mapping back to the intended one.

---

## 13. Open Gaps & Follow-ups

- **Follow-up (not required for this fix):** consider extracting a single shared `RESULT_LEVEL_LABELS` constant (already exists in `shared/result-types-by-level.ts`) and having `bilateral-result-creator.component.ts` consume it, so a future level addition cannot silently re-diverge. Not required here because the current fix is scoped to the regression itself (`requirements.md` §3 Out of scope).
- No other known risks — this is a contained, display-only correction confirmed against the full consumer list (`BIL-P-3`).

---

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 2 |
| Expected LOC | ~6 (2 lines swapped + ~25-35 lines of new test) |
| Expected review rounds | 1 |

Estimate is far below the `Standard` depth boundary and matches `Lite` — no depth change needed, no `/akili-quick` redirect (the fix requires a proven regression test per Bug Mode, which `/akili-quick` does not carry).

---

## Required cross-references

- `docs/specs/bugfix/capacity-sharing-output-level-mismatch/requirements.md` (same folder).
- `docs/prd.md`, `docs/ux-ui/design.md` §6/§8, `docs/trd/trd.md` §2/§6.
- No authoritative module doc payload change (bilateral contract untouched).
