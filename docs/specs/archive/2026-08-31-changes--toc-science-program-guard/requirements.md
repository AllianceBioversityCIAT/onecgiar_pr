# Requirements — Guard Against Removing All ToC-Planned Science Programs

## 1. Module / Feature

- **Module:** `results` (sub-feature of `rd-contributors-and-partners`, client-only)
- **Sub-feature:** Contributing Science Program minimum-count guard
- **Owner:** Santiago Sanchez
- **Status:** draft
- **Depth:** Lite
- **Ticket(s):** —
- **Proposal:** [`proposal.md`](./proposal.md)

> Note on terminology: "W1/W2" here refers to a **Window 1/2-funded result** (the funding-type context in which this field appears), not TRD workflows `W1` (Result lifecycle) / `W2` (Phase rollover) in `docs/trd/trd.md` §on workflows — no overlap.

---

## 2. Context

When a result submitter picks an indicator whose linked ToC (Theory of Change) has planned Contributing Science Programs, the `rd-contributors-and-partners` screen (`onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`) prefills those Science Programs as removable chips. Today nothing stops the user from removing every chip, silently discarding data the ToC says is planned for that result. This violates the spirit of `docs/prd.md` AC-6 (ToC alignment MUST be present at submit) — AC-6 currently checks lead-center presence but not Science Program presence when the ToC declares one is planned; this spec closes that specific gap at the point of deletion (immediate feedback) rather than only at submit time.

Related, already-shipped specs in the same component: `bugfix/lead-center-full-catalog` (analogous auto-add-back guard, but for Lead Center) and `bugfix/toc-unmapped-orange-notes` (established the `planned_result !== false` ToC-mapping guard this spec reuses).

---

## 3. In Scope / Out of Scope

### In scope

- Blocking removal of the **last** Contributing Science Program chip (combined across the ToC-origin and "Other(s)" arrays) when the result's ToC has planned Science Programs.
- Showing a blocking alert explaining at least one is required.
- Leaving current behavior unchanged when the result has no ToC-planned Science Programs, or isn't ToC-mapped at all.

### Out of scope

- The "Contributing CGIAR Centers" field and Lead Center auto-sync (separate arrays/catalogs, no code coupling — confirmed in `proposal.md` §11).
- Save-time / server-side validation (this is a client-side UX guard at the point of deletion).
- Bilateral/W3 `science_program_id` ingestion validation (unrelated flow).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Cannot delete the last ToC-planned Contributing Science Program chip; sees a blocking alert instead, and must keep at least one. |

---

## 5. User Stories

- **`TOC-SP-US-1`** — As a result submitter, I want to be stopped from removing every Contributing Science Program when the ToC says at least one is planned, so that I don't accidentally submit a result missing required ToC alignment data.

Refines PRD `AC-6` (ToC alignment presence).

---

## 6. Functional Requirements

### Required (MUST)

- **`TOC-SP-R-1`** *(REVISED 2026-08-29 — see `design.md` `TOC-SP-DD-4`, supersedes the original text below)* When the result's linked ToC has planned Contributing Science Programs for the selected indicator, the system MUST block removing the last remaining **ToC-origin** Science Program chip — counting only real (non-sentinel) entries in `scienceSelected`, ignoring `otherScienceSelected` entirely — and MUST show an alert stating at least one Contributing Science Program is required. Manually-added "Other" Science Programs do NOT count toward satisfying this floor and removing them is never blocked by this guard.
  - ~~Original (superseded): When the result's linked ToC has planned Contributing Science Programs for the selected indicator, the system MUST block removing the last remaining Science Program chip (counting both the ToC-origin `scienceSelected` array and the "Other(s)" `otherScienceSelected` array combined) and MUST show an alert stating at least one Contributing Science Program is required.~~
- **`TOC-SP-R-4`** *(NEW 2026-08-29, `TOC-SP-DD-4`)* Removing an entry from `otherScienceSelected` via `deleteOtherScience` MUST NEVER be blocked by this guard, regardless of the current ToC-origin count in `scienceSelected` — the floor applies only to `scienceSelected`'s real entries.
- **`TOC-SP-R-2`** When the result has no ToC-planned Contributing Science Programs (or the result is not ToC-mapped, per the same `planned_result !== false` check used in `toc-unmapped-orange-notes`), the system MUST allow removing all Science Program chips, unchanged from current behavior.
- **`TOC-SP-R-3`** The system MUST allow removing Science Program chips down to exactly one remaining, without any alert, when ToC-planned data exists.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | The blocking alert MUST be announced to assistive tech (reuse the existing alert/toast component already used elsewhere in this form — no new a11y pattern). |
| **Internationalization** | The new alert string MUST go through `src/app/internationalization/`. |
| **Backwards compatibility** | No change to persisted data shape or ToC prefill logic (`applyTocMappingOnLoad`) — deletion-time guard only. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `TOC-SP-AC-1` | A W1/W2 result with 3 ToC-planned Science Programs (SP01, SP02, SP03) selected | The submitter deletes SP02 and SP03, one at a time | Both deletions succeed; SP01 remains; no alert shown |
| `TOC-SP-AC-2` | Same result, now down to 1 remaining Science Program (SP01) | The submitter attempts to delete SP01 | The deletion is blocked; an alert states at least one Contributing Science Program is required; SP01 remains selected |
| `TOC-SP-AC-3` | A result whose selected indicator's ToC has **no** planned Science Programs (or is not ToC-mapped) | The submitter deletes all Science Program chips | All deletions succeed; no alert (unchanged current behavior) |
| `TOC-SP-AC-4` | *(REVISED 2026-08-29 — see `TOC-SP-DD-4`)* A result with 1 ToC-planned Science Program and 1 manually-added "Other" Science Program (2 total) | The submitter deletes the "Other" one | Deletion succeeds, no alert — deleting an "Other" entry never consults the ToC-origin count |
| ~~`TOC-SP-AC-4` (superseded reasoning)~~ | ~~Same setup~~ | ~~Delete the Other one, leaving 1~~ | ~~Succeeds because the COMBINED count (not per-array) was ≥1 after removal~~ |
| `TOC-SP-AC-5` | *(NEW 2026-08-29, `TOC-SP-DD-4`)* A result with exactly **2** ToC-planned Science Programs (SP1, SP2) selected AND 1 manually-added "Other" Science Program | The submitter deletes SP1 (succeeds), then attempts to delete SP2 (the last remaining ToC-origin chip) | The second deletion is BLOCKED with the alert, even though 1 "Other" Science Program is still selected — the floor is scored on ToC-origin count alone |
| `TOC-SP-AC-6` | *(NEW 2026-08-29, `TOC-SP-DD-4`)* A result where `scienceSelected` holds 0 real ToC-origin entries (edge/artificial state) and `otherScienceSelected` holds 1 entry | The submitter deletes that "Other" entry | Deletion always succeeds — `deleteOtherScience` never invokes the guard, by construction |

Cross-cutting project ACs already applying: `AC-6` (ToC alignment at submit — this spec strengthens it at deletion time).

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- ToC-mapping detection reuses the `planned_result !== false` / `isCP2026()` guard pattern already implemented in `bugfix/toc-unmapped-orange-notes`.
- Reads `tocReferenceSynergyInitiativeIds` / the ToC-planned Science Program set already surfaced client-side via `multiple-wps-content.component.ts`'s `syncTocReferenceIds` effect.

### Assumptions

- "The result's ToC has planned Science Programs" is evaluated the same way the existing `scienceSelected` (ToC-origin) array is populated in `applyTocMappingOnLoad()` — i.e., if that array's ToC-derived source set is non-empty, the guard is active.

---

## 10. Open Questions

- None blocking. The "reappears in Contributing CGIAR Centers" report from the proposal is explicitly out of scope pending reproduction (see `proposal.md` §11).

---

## Required cross-references

- `docs/prd.md` (`AC-6`)
- `docs/trd/trd.md` (workflows section, for terminology disambiguation only — no functional overlap)
- `docs/specs/changes/toc-science-program-guard/proposal.md`
- `docs/specs/archive/2026-08-29-bugfix--toc-unmapped-orange-notes/` (guard pattern reused)
- `docs/specs/archive/2026-08-29-bugfix--lead-center-full-catalog/` (analogous pattern, different field)
