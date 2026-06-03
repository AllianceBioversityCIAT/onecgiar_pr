## Why

The Evidence section of PRMS result forms renders every evidence as a tall, always-expanded inline block. With up to 6 pieces per result, the section becomes long and hard to scan, and reviewers cannot tell at a glance which evidence is newest, what type it is, or whether a file is public. The client (Nicoleta Trifa) and the team (Ángel Jarrín / IBD) designed a redesign — captured in a Figma Make prototype — that moves creation into a **modal** and renders each saved evidence as a **collapsible accordion** with a summary header (type, upload date, public/private padlock, impact-area tags), ordered newest-first.

This change delivers the **frontend** work for ticket **P2-2935 (INC, parent epic P2-2933)**. It builds on the labels/checkbox work already shipped in **P2-2981** (`p2-2981-evidence-labels-frontend`) and preserves all of it.

## What Changes

- **Create flow → modal.** "Add evidence" SHALL open an "Add New Evidence" modal containing the existing creation form (source Link/Upload, public-visibility question, dynamic info note, drag-and-drop file or link input, Impact-Area + typology checkboxes, 50-word description). Footer: Cancel / Add evidence. Replaces the inline-form-on-click behavior.
- **List → accordions.** Each saved evidence SHALL render as a **collapsed accordion**. The collapsed header shows: an index number, the type label ("Link Evidence" / "File Evidence"), the upload date as "Added: {date} at {time}" (plus "| Updated: {date} at {time}" when edited), a second line with the link/filename and the selected Impact Areas as small badge tags, and — **for file evidence only** — a padlock icon (closed/grey = private, open/green = public) with a hover tooltip "Private"/"Public".
- **Per-item actions.** The per-evidence **edit (pencil) button is removed**. The header keeps only a **delete** action (with a confirmation popup, reusing the existing `alertsFe` confirmation) and a **chevron** to expand/collapse. Expanding reveals the editable form (same fields as the modal).
- **No autosave (decision).** The accordion is purely visual. Edits live in memory on the evidences array; **nothing is persisted until the user clicks the section-level "Save" button** (PRMS's existing pattern). There SHALL be **no Save/Cancel buttons inside the accordion body**.
- **Newest-first ordering.** Evidences SHALL be ordered most-recent → oldest by `last_updated_date` (falling back to `creation_date`, then `id`). New evidence appears at the top. Ordering is **stable during an editing session** — re-sort only on load and after save, never while the user is editing.
- **Dates surfaced.** The evidence model SHALL carry `creation_date` and `last_updated_date` so the header can display them. The server already stores both columns; this change consumes them (see Impact for the backend dependency).

## Scope decisions (confirmed)

- **Figma-literal visuals.** Keep the numbered index and the open/closed padlock (grey closed = private, green open = public) exactly as the approved mockup. The alternative UX tweaks raised in design review (type icon instead of index, globe/lock instead of padlock, unsaved/validation header badges) are **out of scope** for this ticket.
- **`rd-evidences` only.** The sibling `user-evidence` component used inside Innovation Dev info duplicates evidence-item logic; it is **out of scope** here and keeps the legacy inline form. Aligning it (ideally by extracting a shared accordion) is a **follow-up ticket**.
- **Supplementary evidence** (the commented `supplementary` array) is out of scope.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `result-evidence`: Evidence-section presentation changes from inline blocks to a creation modal + collapsible accordion list with summary headers (type, upload/updated date, public/private padlock for files, impact-area tags), newest-first stable ordering, per-item delete-with-confirmation, and removal of the per-item edit button. All existing validations, the 6-piece limit, the knowledge-product read-only branch, link rules, green-checks, and the section-level Save flow are preserved. No autosave.

## Impact

- **Client (`onecgiar-pr-client`):**
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.{ts,html}` — container: hosts the accordion list, the create modal, ordering, and the unchanged section Save.
  - `pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.{ts,html}` — becomes the accordion body (editable form) with the per-item edit button removed; delete + collapse remain.
  - New: `components/evidence-create-modal/` — modal wrapping the creation form.
  - New: `components/evidence-accordion-item/` + `components/evidence-accordion-header/` — accordion wrapper and summary header (reuse `shared/components/collapsible-container` for expand/collapse).
  - `model/evidencesBody.model.ts` — add `creation_date?` and `last_updated_date?` to `EvidencesCreateInterface`.
  - Specs: `evidence-item.component.spec.ts`, `rd-evidences.component.spec.ts` (+ specs for the new components).
- **Backend dependency (separate task):** the evidence `GET` endpoint must return `creation_date` and `last_updated_date` in the evidences payload. Both columns already exist and are auto-populated by TypeORM (`evidence.entity.ts` `creation_date`, `last_updated_date`); they only need to be exposed in the response. Until then the header shows no date / "Date not available" and ordering falls back to `id` desc. **Sorting is done client-side**, so no server-side ordering change is required.
- No API contract changes from the client beyond consuming the two date fields; no migrations; no validation/green-check changes.
