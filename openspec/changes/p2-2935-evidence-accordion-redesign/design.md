# Design — Evidence accordion redesign (P2-2935)

## Context

Today `RdEvidencesComponent` renders `*ngFor` of `<app-evidence-item>`, each an always-expanded inline form. Saving is centralized: `onSaveSection()` builds `EvidencesBody`, uploads files via the create-upload-session loop, then `POST_evidences`. The redesign keeps that save model and only changes presentation + the create entry point.

Sources for this design: the Figma Make prototype (versions 17–24, authored by Ángel/IBD), a code audit (Explore), and a design/UX review (Antigravity). Two scope decisions were taken by the assignee: **Figma-literal visuals** and **`rd-evidences` only** (not `user-evidence`).

## Component breakdown

```
rd-evidences/
├── rd-evidences.component.{ts,html}        # Smart container (existing) — list, ordering, modal host, section Save
├── components/
│   ├── evidence-create-modal/              # NEW — "Add New Evidence" dialog (creation form)
│   ├── evidence-accordion-item/            # NEW — collapsible wrapper (uses collapsible-container)
│   └── evidence-accordion-header/          # NEW — collapsed summary row
├── evidence-item/evidence-item.component.{ts,html}  # Editable form body (existing, edit-button removed)
└── model/evidencesBody.model.ts            # + creation_date, last_updated_date
```

| Component | Responsibility |
|---|---|
| `RdEvidencesComponent` (container) | Fetch evidences, order them, host the create modal, keep the in-memory array, run section validations, and persist on the section-level Save. Owns dirty state. |
| `EvidenceCreateModalComponent` | Presentational dialog. Wraps the creation form (source, public question, dynamic info note, file/link, checkboxes, description). Emits a new `EvidencesCreateInterface` on "Add evidence"; discards on Cancel. Reuses `dynamicAlertStatusBasedOnVisibility()` for the info note. |
| `EvidenceAccordionItemComponent` | Wraps `collapsible-container`; renders the header in the collapsed/peek row and the editable `evidence-item` form in the body. |
| `EvidenceAccordionHeaderComponent` | Collapsed summary: index, type label, "Added/Updated" dates, link/filename, impact-area tags, padlock (files only), delete button + chevron. |
| Delete confirmation | Reuse existing `this.api.alertsFe.show({...})` (as in current `deleteItem()`). No new component. |

## Key decisions

### D1 — No autosave; in-memory editing
Editing an expanded accordion mutates the same `evidencesBody.evidences[i]` object the form already binds to (current behavior). Collapsing keeps changes in memory and the section dirty. Persistence happens only on the section Save (`onSaveSection()`), unchanged. **No Save/Cancel inside the accordion body.** Route-guard / unsaved-changes behavior is whatever PRMS already does for the section.

### D2 — Creation modal returns a model, container appends
The modal builds a fresh `EvidencesCreateInterface`. On confirm, the container **prepends** it to the array (newest-first) and marks the section dirty. File objects selected in the modal are carried on the model and uploaded by the existing section-Save upload loop — files are **not** uploaded from the modal, preserving today's "no orphan files" behavior.

### D3 — Stable ordering
Sort `evidences` by `last_updated_date` desc, then `creation_date` desc, then `id` desc — **only** (a) right after `getSectionInformation()` load and (b) after a successful save reload. New items from the modal are prepended. The array is **not** re-sorted while a user edits, so rows don't jump. Done **client-side**; no backend ordering change.

### D4 — Dates from the model
Add `creation_date?: Date` and `last_updated_date?: Date` to `EvidencesCreateInterface`. The header formats them with Angular `DatePipe`. The defensive fallback (omit the date line, order by `id`) only matters while the GET does not yet expose the fields — at the DB level `creation_date` is `NOT NULL` for every row, so once the endpoint returns it, the date is always available (see Resolved decision 3). `last_updated_date` may be absent for never-edited rows; treat its "Updated:" segment as optional.

### D5 — Padlock only for files
Link evidence has no repository privacy, so no padlock. File evidence shows the padlock from `is_public_file` (open/green = public, closed/grey = private) with a hover tooltip — Figma-literal.

### D6 — Header click bubbling
The delete button calls `$event.stopPropagation()` so clicking delete does not toggle the accordion; the chevron/header toggles expand/collapse.

## Preserve (must-not-break)

- `isKnowledgeProduct` branch: KP shows evidences read-only — no Add button, no delete/edit. The accordion must render KP evidences without the create modal or delete.
- `validateButtonDisabled` (duplicate links, empty/invalid links, SharePoint file-or-link) gates the section Save — unchanged.
- `validateCheckBoxes()` (Impact-Area score-of-2 requirement) and `validateHasInnoReadinessLevelEvidence()` — re-run on add/delete/checkbox change; warning banners stay at the top of the section.
- 6-piece limit: hide/disable "Add evidence" at 6 (current `*ngIf evidences.length < 6`).
- `readOnly` role and submitted-result status gating of delete — unchanged.
- Link rules: `validateCGLink()` (CGSpace auto-replace message) and `validateCloudLink()` (reject Drive/OneDrive/Dropbox/SharePoint).
- Green-checks via `appFeedbackValidation` — unchanged.
- All P2-2981 copy (public-file label, dynamic checkbox-group title, per-typology checkbox, intro notes) — carried into the modal + accordion verbatim.

## Backend dependency

`GET /api/results/evidences/get/{resultId}` must include `creation_date` and `last_updated_date` per evidence. Columns exist and are auto-populated (`evidence.entity.ts`); only serialization/DTO exposure is needed. This is the only backend touchpoint; everything else is client-only. Tracked as a separate backend task — the frontend degrades gracefully until it lands (D4).

## Resolved decisions (assignee, 2026-06-03)

1. **File replacement in edit mode → keep current behavior.** Today, deleting the uploaded file inside the expanded item (`onDeleteSPLink()` → `cleanSP()` clears `sp_file_name` + `link`) re-shows the drag-and-drop zone, so a user can replace the file inline without deleting the whole evidence. Preserve exactly this; do NOT force delete-and-recreate.
2. **Expand/collapse state across save → best-effort, else default.** Try to keep each item's expand/collapse state as it was at save time; if that turns out to complicate the reload flow, fall back to the default automatic behavior (whatever the post-save reload produces). Not worth heavy engineering.
3. **Legacy dates → hide the line if absent, but `creation_date` is in fact always present.** The `evidence` table was created (base migration `1663947616790-resultsnew.ts`) with `creation_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` and `last_updated_date datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`. The column was never added by a later ALTER, so **every row — legacy included — has a real `creation_date`**. Ordering by `creation_date` is reliable. The "omit the date line / fall back to `id`" rule (D4) stays only as a defensive guard for the case where the GET does not yet expose the field.
4. **6-piece cap → keep current frontend validation as-is.** Do not change how the limit is enforced; the existing client-side `evidences.length < 6` gate on the "Add evidence" button stands. Server-side enforcement is not investigated and not relied upon by this change.
