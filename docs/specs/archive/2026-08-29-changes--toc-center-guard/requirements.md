# Requirements — Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Module / Feature

- **Module:** `results` (sub-feature of `rd-contributors-and-partners`, client-only)
- **Sub-feature:** Contributing CGIAR Centers minimum-count guard
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Depth:** Lite
- **Ticket(s):** —
- **Proposal:** [`proposal.md`](./proposal.md)

---

## 2. Context

When a result submitter picks an indicator whose linked ToC (Theory of Change) has planned Contributing CGIAR Centers, the `rd-contributors-and-partners` screen (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`) prefills those Centers as removable chips (either directly into `contributing_center` in the flat/unmapped UI, or split across `contributing_center`/`otherCentersSelected` in the CP2026-mapped UI). Today nothing stops the user from removing every chip, silently discarding data the ToC says is planned for that result. This violates the spirit of `docs/prd.md` AC-6 (ToC alignment MUST be present at submit) the same way the now-fixed gap for Contributing Science Programs did — this spec closes the equivalent gap for Centers, at the point of deletion (immediate feedback) rather than only at submit time.

Related, already-shipped specs in the same component: `changes/toc-science-program-guard` (identical guard pattern — `getRealScienceCount`/`hasTocPlannedScience`/`blockIfLastScience` — already shipped for the twin Science Program field, commit `7bee37dec`), `bugfix/lead-center-full-catalog` (established `contributing_center`/`otherCentersSelected` semantics, the `OTHER_CENTERS_CODE` sentinel, and the flat-vs-split UI distinction via `isUnmappedOrFlat()`), and `bugfix/toc-unmapped-orange-notes` (established the `planned_result !== false` ToC-mapping guard this spec reuses).

---

## 3. In Scope / Out of Scope

### In scope

- Blocking removal of the **last** Contributing CGIAR Center chip (combined across `contributing_center`, excluding the `OTHER_CENTERS_CODE` sentinel, and `otherCentersSelected`) when the result's ToC has planned Centers.
- Showing a blocking alert explaining at least one is required.
- Leaving current behavior unchanged when the result has no ToC-planned Centers, or isn't ToC-mapped at all.
- Working correctly under both UI shapes this field can render as: the flat/unmapped single dropdown (bound directly to `contributing_center`) and the split CP2026 ToC/Other(s) dropdowns.

### Out of scope

- The "Contributing Science Program/Accelerator" field — its guard already shipped (`changes/toc-science-program-guard`).
- Lead Center auto-sync / full-catalog sourcing (`bugfix/lead-center-full-catalog`) — this spec does not change `setPossibleLeadCenters`, `onLeadCenterSelected`, or how a Lead Center gets auto-added into these arrays; it only adds a deletion-time floor on top.
- Save-time / server-side validation (this is a client-side UX guard at the point of deletion).
- ToC prefill logic (`applyTocMappingOnLoad`, `preselectCentersEffect`) — only gating removal.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Cannot delete the last ToC-planned Contributing CGIAR Center chip; sees a blocking alert instead, and must keep at least one. |

---

## 5. User Stories

- **`TOC-C-US-1`** — As a result submitter, I want to be stopped from removing every Contributing CGIAR Center when the ToC says at least one is planned, so that I don't accidentally submit a result missing required ToC alignment data.

Refines PRD `AC-6` (ToC alignment presence).

---

## 6. Functional Requirements

### Required (MUST)

- **`TOC-C-R-1`** *(REVISED 2026-08-29 — see `design.md` `TOC-C-DD-5`, supersedes the original text below)* When the result's linked ToC has planned Contributing CGIAR Centers for the selected indicator, the system MUST block removing the last remaining **ToC-origin** Center chip — counting only real (non-sentinel) entries in `contributing_center`, ignoring `otherCentersSelected` entirely — and MUST show an alert stating at least one Contributing CGIAR Center is required. Manually-added "Other" Centers do NOT count toward satisfying this floor and removing them is never blocked by this guard.
  - ~~Original (superseded): When the result's linked ToC has planned Contributing CGIAR Centers for the selected indicator, the system MUST block removing the last remaining Center chip (counting `contributing_center` minus the `OTHER_CENTERS_CODE` sentinel, combined with `otherCentersSelected`) and MUST show an alert stating at least one Contributing CGIAR Center is required.~~
- **`TOC-C-R-2`** When the result has no ToC-planned Contributing CGIAR Centers (or the result is not ToC-mapped, per the same `planned_result !== false` check used by the sibling guards), the system MUST allow removing all Center chips, unchanged from current behavior.
- **`TOC-C-R-3`** The system MUST allow removing Center chips down to exactly one remaining, without any alert, when ToC-planned data exists.
- **`TOC-C-R-4`** *(REVISED 2026-08-29 — see `design.md` `TOC-C-DD-4`, supersedes the original text below)* Deleting the `OTHER_CENTERS_CODE` sentinel chip itself MUST always be allowed, regardless of the ToC-planned guard and regardless of the cascade it causes on `otherCentersSelected` (which continues to clear per existing behavior). The guard applies only to deleting a real chip — a non-sentinel entry in `contributing_center`, or any entry in `otherCentersSelected` via `deleteOtherCenter`.
  - ~~Original (superseded): Deleting the `OTHER_CENTERS_CODE` sentinel chip itself MUST be evaluated against the real count it would cascade to zero (i.e. count `otherCentersSelected.length` as the removal impact, since removing the sentinel clears `otherCentersSelected` per existing behavior), not treated as a no-impact deletion.~~
- **`TOC-C-R-5`** The guard MUST apply identically whether the field is rendered in the flat/unmapped single-dropdown UI (`contributing_center` only) or the split CP2026 ToC/Other(s) UI (`contributing_center` + `otherCentersSelected`).
- **`TOC-C-R-6`** *(NEW 2026-08-29, `TOC-C-DD-5`)* Removing an entry from `otherCentersSelected` via `deleteOtherCenter` MUST NEVER be blocked by this guard, regardless of the current ToC-origin count in `contributing_center` — the floor applies only to `contributing_center`'s real entries.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The blocking alert MUST be announced to assistive tech (reuse the existing `CustomizedAlertsFeService` alert component already used by the twin Science Program guard — no new a11y pattern). |
| **Internationalization** | The new alert string MUST go through `src/app/internationalization/` conventions already established for this file's sibling notes (plain hardcoded string, matching precedent — see design). |
| **Backwards compatibility** | No change to persisted data shape, ToC prefill logic (`applyTocMappingOnLoad`), or Lead Center auto-sync (`onLeadCenterSelected`) — deletion-time guard only. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `TOC-C-AC-1` | A result with 3 ToC-planned Contributing CGIAR Centers selected | The submitter deletes 2 of them, one at a time | Both deletions succeed; 1 remains; no alert shown |
| `TOC-C-AC-2` | Same result, now down to 1 remaining Center | The submitter attempts to delete it | The deletion is blocked; an alert states at least one Contributing CGIAR Center is required; the Center remains selected |
| `TOC-C-AC-3` | A result whose selected indicator's ToC has **no** planned Centers (or is not ToC-mapped) | The submitter deletes all Center chips | All deletions succeed; no alert (unchanged current behavior) |
| `TOC-C-AC-4` | *(REVISED 2026-08-29 — see `TOC-C-DD-5`)* A result (CP2026, ToC-mapped) with 1 ToC-planned Center and 1 manually-added "Other" Center (2 total) | The submitter deletes the "Other" one | Deletion succeeds, no alert — deleting an "Other" entry never consults the ToC-origin count |
| ~~`TOC-C-AC-4` (superseded reasoning)~~ | ~~Same setup~~ | ~~Delete the Other one, leaving 1~~ | ~~Succeeds because the COMBINED count (not per-array) was ≥1 after removal~~ |
| `TOC-C-AC-7` | *(NEW 2026-08-29, `TOC-C-DD-5`)* A result (CP2026, ToC-mapped) with exactly **2** ToC-planned Centers (ToC1, ToC2) selected AND 1 manually-added "Other" Center | The submitter deletes ToC1 (succeeds, 1 ToC-origin + 1 Other remain), then attempts to delete ToC2 (the last remaining ToC-origin chip) | The second deletion is BLOCKED with the alert, even though 1 "Other" Center is still selected — the floor is scored on ToC-origin count alone, not the combined total |
| `TOC-C-AC-8` | *(NEW 2026-08-29, `TOC-C-DD-5`)* A result (CP2026, ToC-mapped) where `contributing_center` holds 0 real ToC-origin entries (edge/artificial state) and `otherCentersSelected` holds 1 entry | The submitter deletes that "Other" entry | Deletion always succeeds — `deleteOtherCenter` never invokes the guard, by construction |
| `TOC-C-AC-5` | *(REVISED 2026-08-29 — supersedes the original row below, see `design.md` `TOC-C-DD-4`)* A result (CP2026, ToC-mapped) with exactly 1 ToC-planned Center plus the `OTHER_CENTERS_CODE` sentinel and 1 "Other" Center selected | The submitter deletes the sentinel chip, which cascades to clear `otherCentersSelected` | The deletion always succeeds — the sentinel chip is never blocked by this guard, even though the cascade brings the real combined count to 0 |
| ~~`TOC-C-AC-5` (superseded)~~ | ~~Same setup~~ | ~~Delete the sentinel~~ | ~~Blocked exactly as if a real chip were removed~~ |
| `TOC-C-AC-6` | A result in the flat/unmapped UI (`planned_result === false` or non-CP2026) with ToC-planned Centers reported by `tocReferenceCenterInstitutionIds()` (edge case: guard condition also requires `planned_result !== false`, so an unmapped result never triggers the guard) — and a result in the flat UI that IS mapped (non-CP2026 phase but `planned_result !== false`) down to its last Center | The submitter attempts to delete the last Center directly from `contributing_center` | The guard blocks the deletion the same way it would in the split CP2026 UI |

Cross-cutting project ACs already applying: `AC-6` (ToC alignment at submit — this spec strengthens it at deletion time).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- ToC-mapping detection reuses the `planned_result !== false` guard pattern already implemented in `bugfix/toc-unmapped-orange-notes` and the twin `changes/toc-science-program-guard`.
- Reads `tocReferenceCenterInstitutionIds()` — already exposed by `RdContributorsAndPartnersService` and already consumed by the existing `hasReferenceCenters` computed (`component.ts:146`).
- Reuses the `OTHER_CENTERS_CODE` sentinel constant (`component.ts:152`) and the existing cascade behavior (`if (!this.showOtherCenters) otherCentersSelected = []`, `component.ts:428`) — not reimplemented.

### Assumptions

- "The result's ToC has planned Contributing CGIAR Centers" is evaluated the same way `hasReferenceCenters` already evaluates it (`tocReferenceCenterInstitutionIds().length > 0`), combined with the `planned_result !== false` ToC-mapping check — mirroring exactly how `hasTocPlannedScience` combines the equivalent two conditions for Science Programs.
- `contributing_center` and `otherCentersSelected` never contain overlapping real centers (by `code`) in normal operation, so a plain length-sum (excluding the sentinel) is a correct "combined count," matching the Science Program guard's approach — not a deduplicated union.

---

## 10. Open Questions

- None blocking.

---

## Required cross-references

- `docs/prd.md` (`AC-6`)
- `docs/specs/changes/toc-center-guard/proposal.md`
- `docs/specs/changes/toc-science-program-guard/` (identical guard pattern, twin field)
- `docs/specs/archive/2026-08-29-bugfix--toc-unmapped-orange-notes/` (guard pattern reused)
- `docs/specs/archive/2026-08-29-bugfix--lead-center-full-catalog/` (array/sentinel/flat-vs-split semantics reused)
