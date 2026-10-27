# Proposal — Discard several AI draft results at once

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/ai-drafts-bulk-discard/` |
| Slug | `ai-drafts-bulk-discard`, derived from free-text argument (INC-166545 point 2) |
| Type | **Change** |
| Status | approved 2026-10-27 (owner) |
| Approval Mode | `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-26 |
| Ticket | Freshdesk **INC-166545**, point 2 (Nicoleta Trifa, 26-Oct-2026). Due 30-Oct |
| Depends on | none |
| Parallel-safe | **yes** with `bilateral/center-overview-pa-contribution` (no shared module, endpoint or migration) |
| Branch | from `staging` |
| Requirement prefix (proposed) | `ABD` (AI drafts Bulk Discard) |

## 2. Intent

Let a Center user select several AI draft results and discard them in one action.

Nicoleta, 26-Oct-2026:

> *"For a single donor report, AI created 14 draft results, while likely we would report 2 or 3 max. Please add tick marks next to AI draft results in order to allow the user to discard several results at the same time."*

The same ask is already noted as pending in `my-draft-results/CLAUDE.md` ("select several drafts at once").

## 3. Problem / Current Behavior

| Aspect | Today |
|---|---|
| Screen | `/bilateral/:centerAcronym/drafts` (`my-draft-results`). Drafts are grouped by AI session (`sessionGroups()`, `my-draft-results.component.ts:417`), one card + table per upload |
| Discard | One draft at a time: trash icon per row (`.html:382`) or Discard in the review panel (`.html:449-457`), each with a confirmation dialog (`discardTarget`, `.ts:800-815`) |
| Cost for the user | 12 unwanted drafts = 12 × (click, confirm). No way to keep 2 and drop the rest |
| Client service | `BilateralAiService.discardDraft(id)` (`bilateral-ai.service.ts:545-557`): removes the draft from `draftList()`, clears `currentDraft`, **navigates to `/drafts`**, generic error toast. Built for one call |
| Endpoint | `DELETE api/bilateral/center/ai/drafts/:draftId` (`bilateral-ai.controller.ts:142-148`) |
| Server | `discardDraft` (`services/bilateral-ai.service.ts:936-945`): soft delete in two writes — draft `is_discarded=true`, linked result `is_active=false`. **No transaction**, no audit, no `last_updated_by` |
| Permission | `getDraftRaw(...,'act')` → 404 if already discarded; `assertCenterEntitlement`: Center User of the draft's job center. Admins are not let through on `'act'` (`ASC-R-15`) |
| Bulk support | None — no endpoint, no multi-select UI |

## 4. Proposed Outcome

On the AI Draft Results tab, a Center member can:

1. Tick a checkbox on each draft row.
2. Tick a checkbox in each upload's card header to select / clear every **visible** draft of that upload (respects search, project and Created-by filters — `BADF-R-*`).
3. See a sticky action bar: **"N selected · Discard selected · Clear"**.
4. Confirm once ("Discard 12 draft results? This can't be undone from PRMS.").
5. Get one summary toast: "12 drafts discarded" — or, on partial failure, "10 discarded, 2 could not be discarded" with the failed rows kept selected.

Discarded drafts leave the list optimistically, as the single discard does today. No navigation happens. The single-row trash icon and the panel Discard keep working as now.

## 5. Scope

| Layer | Item |
|---|---|
| Server | New `POST api/bilateral/center/ai/drafts/discard` with body `{ draftIds: number[] }` (cap, e.g. 100). Per id: same `getDraftRaw(...,'act')` + entitlement check, both writes **in one transaction per draft**, independent commit per success (pattern `ADE-R-9`). Response: `{ discarded: number[], failed: { id, reason }[] }`. Controller `@ApiBody`/Swagger, DTO with `class-validator`, specs |
| Server (small hardening) | Single `discardDraft` reuses the same per-draft transactional helper, so the two writes can no longer split |
| Client API | `bilateral-api.service.ts`: `POST_bilateralAiDraftsDiscard` |
| Client service | `BilateralAiService.discardDrafts(ids)`: optimistic removal, summary toast, **no navigation**; restores failed rows |
| Client UI | `my-draft-results`: row checkbox column, header select-all per group, action bar, one confirmation dialog. Spartan `hlm-checkbox` (pattern: `results-notifications.component.html:170`), selection held in a signal (pattern: `kp-cgspace-browse` `selectedRepositories`). Checkboxes only when `isCenterMember()` |
| Docs | `my-draft-results/CLAUDE.md` (close the "Pending" item, update the "Verified" stamp), `bilateral-ai` server guide if it lists endpoints |
| Tests | Server service + controller specs (entitlement, already discarded, partial failure, cap). Client component + service specs. Jest `--findRelatedTests` on changed files, `--maxWorkers=2` |

## 6. Non-Goals

- Bulk **Create Result** (promote). Promote is not idempotent (`isPromoting()` guard) and carries evidence transfer (`ADE-*`); out of scope.
- Changing who may discard (any Center member, not only the uploader). Unchanged.
- Undo / restore of discarded drafts.
- Reducing how many drafts the AI generates per document (prompt/model tuning). Worth a separate conversation with Nicoleta, not this change.
- Selection across pages of other tabs, or in `bilateral-ai-draft-detail` (single-draft page).

## 7. Affected Users, Systems, And Specs

| Type | Item |
|---|---|
| Users | Center Users reviewing AI drafts (IFPRI raised it via Nicoleta) |
| Server | `api/bilateral-ai` (controller, service, new DTO) |
| Client | `pages/bilateral/pages/my-draft-results/`, `pages/bilateral/services/bilateral-ai.service.ts`, `shared/services/api/bilateral-api.service.ts` |
| Specs touched | archive `2026-09-14-bilateral--ai-drafts-redesign` (`BADR-R-*` button hierarchy: the action bar must keep Create Result as the only primary). `2026-09-16-changes--bilateral-ai-draft-filters` (`BADF-R-*`: select-all acts on filtered rows only). `bilateral/ai-processing-queue` (`AIQ-*` `?job=` highlight effect must keep working) |

## 8. Visual Reference

- Source: **None** (screenshot of the current list only, in the ticket PDF).
- Notes: small pattern addition on an existing table — checkbox column, header checkbox, sticky action bar. A mockup is optional; `/akili-specify` can describe it against `docs/ux-ui/design.md` §8.

## 9. Requirement Delta Preview

### ADDED Requirements

- `ABD-R-1`: Each draft row has a checkbox (Center members only).
- `ABD-R-2`: Each upload card header has a select-all checkbox (checked / indeterminate / unchecked) over its **visible** drafts.
- `ABD-R-3`: With ≥ 1 selected, an action bar shows the count, **Discard selected** and **Clear**.
- `ABD-R-4`: One confirmation dialog for the whole selection.
- `ABD-R-5`: `POST .../ai/drafts/discard` discards each id with the same entitlement rules as the single endpoint, commits each draft independently and returns `discarded` + `failed`.
- `ABD-R-6`: Partial failure is reported in one toast; failed rows stay in the list and stay selected.
- `ABD-R-7`: Selection clears when filters or phase change (no hidden selected rows get discarded).

### MODIFIED Requirements

- Single discard (server): its two writes run in one transaction.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Bulk endpoint + checkboxes (recommended)** | New `POST .../drafts/discard`, per-draft transaction, per-item outcome | One request, one entitlement pass, clean partial-failure report, fixes the missing transaction | Server + client change |
| B. Client loop over the existing `DELETE` | `forkJoin` of N single calls; refactor `discardDraft` to not navigate | No server change | N requests, N error toasts to merge, the two-write split risk stays ×N |
| C. "Discard all drafts of this upload except…" | One button per upload card, then untick the ones to keep | Matches the 14→2 case closely | Not what was asked (tick marks); inverted mental model; still needs the same endpoint |

## 11. Recommended Approach

**Option A.** It is what Nicoleta described (tick marks), keeps the existing single-discard rules as the one source of truth, and closes the two-write gap in passing. The endpoint is additive; the single `DELETE` keeps its contract.

## 12. Risks, Dependencies, And Open Questions

| ID | Type | Description | Recommendation |
|---|---|---|---|
| `ABD-OQ-1` | Scope (owner) | Selection per upload card only, or across cards on the page? | Across the page, with select-all per card. Her case fits in one card; across-page costs nothing extra |
| `ABD-OQ-2` | Copy | Confirmation and toast wording | Specify drafts it; reuse the single-discard dialog tone |
| `ABD-OQ-3` | Limit | Max ids per request | 100 (largest session seen is ~14–20 drafts); confirm in specify with a count query |
| `ABD-RISK-1` | Data | Discard also deactivates the linked result (`is_active=0`) — bulk makes a mistake bigger | Explicit count in the confirm dialog; selection cleared on filter change (`ABD-R-7`) |
| `ABD-RISK-2` | Regression | `my-draft-results` `?job=` highlight effect and optimistic removals (`CLAUDE.md` constraints) | Keep both signals read before any early return; component spec for the `?job=` case |
| `ABD-RISK-3` | Shared DB | Local stack writes to the shared prdb (memory) | Browser checks must not click Discard on real drafts; verify on PRTest with test drafts |

## 13. Success Criteria

- A Center member discards 12 of 14 drafts of one upload with: tick header, untick 2, Discard selected, confirm — 4 clicks, one request.
- Discarded drafts disappear from the list and their results have `is_active=0`; the 2 kept are untouched.
- A non-member sees no checkboxes; the endpoint returns the failed ids for drafts of another center.
- Single discard behaves as before.
- Jest green with `--findRelatedTests` on changed files and `--maxWorkers=2`; lint clean on touched files.

## 14. Next Step

```text
/akili-specify bilateral/ai-drafts-bulk-discard
```
