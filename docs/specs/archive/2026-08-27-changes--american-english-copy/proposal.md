# Proposal: Standardize user-facing copy to American English

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/american-english-copy` |
| Slug | `american-english-copy` — re-derived 2026-08-27 (Adjust round): user generalized the intent from "programme → program" to **all British → American English in all labels**; original slug `programme-to-program` retired |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed (adjusted) |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org (via /akili-propose) |
| Depends on | none |
| Parallel-safe | yes |

## 2. Intent

Replace every user-facing instance of British English spelling with American English, matching CGIAR's official terminology, consistently across all of PRMS. The reported ticket example is "programme → program"; the approved generalization covers **any British spelling in rendered copy** (labels, headings, tooltips, banners, error messages).

## 3. Problem / Current Behavior

British spellings appear in UI copy mixed with American ones. Reported example (screenshot in ticket):

> "Report results linked to the **programme's** 2026 ToC" → "…the **program's** 2026 ToC"

**Measured footprint (2026-08-27, full British-spelling sweep of ~50 word stems):**

| Word (rendered copy only) | Where | Fix |
|---|---|---|
| programme/Programme(s), programme's | ~15–20 client files: dashboard-lab heading (`reporting-program-band.component.ts:211`), portfolio-overview, programme-results error + group label `'Programme-level'` + CSV fallback, bilateral templates, change-phase-modal | → program (case-preserving) |
| Licence (heading) | `result-review-drawer/components/kp-content/kp-content.component.html:8` — visible "Licence:" | → "License:" |
| licence (filter label) | `results-list-filters.component.ts:216` — `'Knowledge Product — licence'` | → "license" (label value only) |

**Everything else British is NOT copy** and must not change:

| Category | Examples | Why untouchable |
|---|---|---|
| Code comments / JSDoc | `centre`, `catalogue`, `colour`, `favourites`, `behaviour`, `labelled` (client + server, incl. all 3 server hits) | Not user-facing |
| Identifiers & structure | `programmeCode`, `ProgrammeResultsComponent`, SortKey `'programme'`, folder `pages/programme-results/`, storage key `pr.programmeResults.visibleColumns` | Zero user value; regression risk (lazy routes, saved prefs) |
| Data-coupled names | DTO/entity field + DB column `licence` (CGSpace `Rights` mapping, `result.repository.ts:3052`), filter/export key `s7_kp_licence`, CLARISA centre codes/aliases | External API contracts and persisted data |

## 4. Proposed Outcome

- No rendered text in PRMS (labels, headings, tooltips, aria-labels, placeholders, banners, error/toast messages, user-visible download filenames) contains a British spelling, in any casing.
- Replacement is case- and inflection-preserving; the sweep re-checks the full word list, not only the two confirmed words.
- Unit tests pinning old strings are updated in the same change; suite stays green.

## 5. Scope

- **In:** all user-facing string literals in `onecgiar-pr-client/src` (HTML templates + TS) containing any British spelling; the Jest expectations pinning them; verification that the server emits no British user-facing text (current scan: comments and one ops log only).

## 6. Non-Goals

- No identifier, type, class, route, file/folder, or persisted-key renames.
- No changes to data-coupled names: `licence` DTO/entity field and DB column, `s7_kp_licence` key, CLARISA-matched strings.
- No rewriting of data values (initiative/institution names render as stored — official names may legitimately contain "Centre"/"Programme").
- Code comments: optional tidy-up only in already-touched files; never a goal.
- Ops-facing log messages (e.g. `result-tagged-notification.service.ts:108`).

## 7. Affected Users, Systems, And Specs

- **Users:** all PRMS users. **Systems:** `onecgiar-pr-client` only.
- **Hotspots:** result-framework-reporting (dashboard-lab, portfolio-overview, programme-results), bilateral, results-list filters, result-review-drawer kp-content, shared components.

## 8. Visual Reference

- Source: None — ticket screenshot example captured verbatim in §3; text-only change.

## 9. Requirement Delta Preview

### MODIFIED Requirements
- All user-facing copy containing a British spelling is respelled to American English, casing preserved, across every module and result typology.

### ADDED / REMOVED
- None.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Classified word-list sweep (recommended)** | Curated British-stem word list; enumerate all matches; classify each as rendered copy / comment / identifier / **data-coupled**; edit only rendered copy + pinned tests. | ✅ Smallest safe path |
| B. Blind global find-and-replace | `sed` across the repo. | ❌ Breaks lazy routes, storage keys, and the `licence` API/DB contract |
| C. Copy + identifier/field renames | Also rename `programmeCode`, `licence` field, folders. | ❌ API/DB breaking change, zero user value |

## 11. Recommended Approach

**Option A.** One bounded client-only spec. Gates: full client Jest suite + classified audit over the word list + identifier/field guard + HITL diff review.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| DB-stored copy (section descriptions, notification templates) outside the repo | Open question / accepted risk | Separate data-fix chunk if QA finds instances |
| `licence` is both a field name AND display copy in the same files | Risk | Guard: bindings/keys stay, only label text changes — the audit classifies per-hit, not per-file |
| Word list completeness (a British word not on the list) | Risk | Mitigation: list built from a ~50-stem sweep of the actual codebase; audit re-runs the same regex; anything new QA reports joins a follow-up |
| Tests pin exact strings | Dependency | Updated in the same commit |

## 13. Success Criteria

1. Audit over the word list returns zero unclassified rendered-copy hits in `onecgiar-pr-client/src`.
2. The reported label reads "Report results linked to the program's 2026 ToC"; the KP drawer heading reads "License:".
3. Client Jest suite green; no identifier, route, storage-key, field-name, or API change in the diff.

## 14. Next Step

```text
/akili-specify changes/american-english-copy
```
