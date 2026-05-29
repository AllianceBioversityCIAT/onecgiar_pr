## Context

Exploration of `rd-contributors-and-partners` shows lead assignment is **already a front-end concern** until save:

| State (UI) | Persisted on save |
|------------|-------------------|
| `leadCenterCode` | `contributing_center[].is_leading_result` |
| `leadPartnerId` | `institutions` / `mqap_institutions` `.is_leading_result` |
| `is_lead_by_partner` | drives which branch runs in `onSaveSection()` |

`possibleLeadCenters` / `possibleLeadPartners` are derived lists (only entities already added in the section). `setLeadCenterOnLoad` / `setLeadPartnerOnLoad` hydrate UI from API `is_leading_result` after `GET_ContributorsPartners`.

The yes/no toggle currently clears the opposite lead field inline:

```html
(selectOptionEvent)="$event ? (leadCenterCode = null) : (leadPartnerId = null)"
```

Contributing centers refresh via `(selectOptionEvent)="setPossibleLeadCenters(true)"` on the multi-select; partners refresh via `normal-selector.emitPartnerEvent` → `setPossibleLeadPartners(true)`.

**P22** uses `rd-partners` — out of scope.

## Goals / Non-Goals

**Goals:**

- Auto-fill Lead Center when center-led and exactly one `possibleLeadCenters` entry.
- Auto-fill Lead Partner when partner-led and exactly one `possibleLeadPartners` entry.
- Run after list rebuilds and after lead-type toggle, without breaking load-from-API or delete-center/partner cleanup.
- Preserve P2-2960 validation behavior (fields still required; user can clear with `[showClear]` but next eligible refresh may re-assign if still empty/invalid).

**Non-Goals:**

- Backend auto-assign, new endpoints, or SQL changes.
- Auto-save (user still clicks section Save).
- Changing mandatory rules or green-check computation.
- P22 / `rd-partners`.
- Auto-assign when `no_applicable_partner` hides partners but user cannot select partner-led (center-led path only in that mode).

## Decisions

### 1. Implement in `RdContributorsAndPartnersService` (not template-only)

**Choice:** `tryAutoAssignLeadCenter()` / `tryAutoAssignLeadPartner()` called at end of `setPossibleLeadCenters` / `setPossibleLeadPartners`.

**Rationale:** Same place that rebuilds option lists; avoids duplicating logic in HTML and `normal-selector`.

**Alternative rejected:** Component-only watchers — harder to test, duplicates subscription points.

### 2. Assign only when empty OR current value not in possible list

**Choice:**

```text
if (!is_lead_by_partner && possibleLeadCenters.length === 1) {
  if (!leadCenterCode || !possibleLeadCenters.some(c => c.code === leadCenterCode))
    leadCenterCode = possibleLeadCenters[0].code
}
```

(Symmetric for partners when `is_lead_by_partner`.)

**Rationale:** Respects persisted/manual selection on load (`setLeadCenterOnLoad` runs before auto-assign in `getSectionInformation`). When user deletes a center and one remains, updates stale lead. Does **not** fight user who cleared dropdown while two centers still exist.

**Alternative rejected:** Always overwrite when length === 1 — would reset intentional clear while two centers existed then one removed (acceptable) but would also overwrite on every `setPossibleLeadCenters` call after load with one center (bad if user cleared intentionally with one center — rare; mitigated by empty-only default; invalid-code branch handles delete-lead-center case).

### 3. Call order in `getSectionInformation`

Keep: `setPossibleLead*` → `setLead*OnLoad` → **then** `tryAutoAssign*` (or call try at end of setPossible after onLoad in getSectionInformation).

**Rationale:** API `is_leading_result` wins on load; auto-fill only fills gap when still empty.

**Implementation note:** Call `tryAutoAssign` at end of `setPossibleLeadCenters`/`setPossibleLeadPartners` but guard with flag `skipAutoAssign` during initial load if needed — prefer calling try after both onLoad methods in `getSectionInformation` only, and at end of setPossible for user-driven updates. Simplest: invoke try at end of each `setPossible*` **and** after toggle handler; inside try, skip if `leadCenterCode` already valid in list (decision 2 covers this).

### 4. Toggle handler: service method `onLeadByPartnerChange(isPartnerLed: boolean)`

**Choice:** Replace inline template assignment with method that clears opposite field, then `setPossibleLeadCenters/Partners(true)` which triggers auto-assign.

**Rationale:** Ensures auto-fill runs when switching to center-led with one center (currently only nulls `leadPartnerId`).

### 5. No change to `onSaveSection` mapping

Auto-assign only sets UI models; existing `is_leading_result` loop unchanged.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| User clears lead with `[showClear]` while one center remains; field refills on next `setPossibleLeadCenters` | Accept per Jira (“without additional user interaction”); only when empty/invalid per decision 2 |
| `updatingLeadData` flicker on dropdown | Reuse existing flag in `setPossible*`; auto-assign is sync before timeout |
| `mqap_institutions` + `institutions` duplicate counts | `possibleLeadPartners` already dedupes via filter — auto-assign uses `possibleLeadPartners.length === 1` |
| Regression on delete center/partner | Existing clears `leadCenterCode`/`leadPartnerId`; try runs after setPossible — may re-assign if one entity left (desired) |
| KP / `no_applicable_partner` | Auto center when `!is_lead_by_partner`; partner path disabled when N/A partners |
| P2-2960 alerts | Auto-fill sets `leadCenterCode` → `appFeedbackValidation` completes sooner (positive) |

## Migration Plan

Frontend-only. Deploy with P2-2962 branch. Rollback = revert commit. Verify: one center + center-led, one partner + partner-led, two centers no auto, toggle yes/no, delete lead entity, save + green-check unchanged.

## Open Questions

- Confirm with Business: when user **clears** lead with one center still contributing, should we re-auto-assign immediately? **Proposed yes** (ticket AC).
- Phase gate: component is P25 Contributors & Partners route only — no extra `isP25()` guard unless product asks to limit to portfolio 25 only (same section as P2-2960).
