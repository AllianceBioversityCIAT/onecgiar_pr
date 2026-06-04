## Why

The Evidence section of PRMS result forms renders every evidence as a tall, always-expanded inline block. With up to 6 pieces per result, the section becomes long and hard to scan, and reviewers cannot tell at a glance which evidence is newest, what type it is, or whether a file is public. The client (Nicoleta Trifa) and the team (Ángel Jarrín / IBD) designed a redesign — captured in a Figma Make prototype — that moves create/edit into a **modal** and renders each saved evidence as a **compact flat card** with a summary (type, upload date, public/private padlock, link/filename, impact-area tags, details), ordered newest-first.

This change delivers the **frontend** work for ticket **P2-2935 (INC, parent epic P2-2933)**. It builds on the labels/checkbox work already shipped in **P2-2981** (`p2-2981-evidence-labels-frontend`) and preserves all of it.

> **Design pivot (P2-2935, after review with the client).** The original proposal rendered each evidence as a **collapsible accordion** whose expanded body was the editable form. During implementation review this was changed: the accordion is **dropped** because all the relevant information fits in a single compact card, and **editing moves entirely into the modal** (reached via a pencil button). The sections below describe the **delivered** design; the accordion approach is retained in git history only.

## What Changes

- **Create & edit flow → modal.** A single modal handles both create and edit. "Add evidence" opens it in create mode ("Add New Evidence" / confirm "Add evidence"); the per-card **pencil** opens it in edit mode ("Edit Evidence" / confirm "Save changes") pre-filled with a clone of the evidence (Cancel discards). The form is unchanged (source Link/Upload, public-visibility question, dynamic info note, drag-and-drop file or link input, Impact-Area + typology checkboxes, 50-word description).
- **List → flat cards (no accordion).** Each saved evidence renders as a **flat card** with everything visible at once. The card **top** shows: index number, type label ("Link Evidence" / "File Evidence"), the date as "Added: {date}" (plus "| Updated: {date}" when edited), and — **for file evidence only** — a padlock (closed/grey = private, open/green = public) with a "Private"/"Public" tooltip. The card **body** shows the link/filename (clickable), the Impact-Area tags, and the description details, flowing **horizontally** and wrapping to use the card width.
- **Per-item actions.** The card top exposes an **edit (pencil)** action and a **delete** action (delete keeps the existing `alertsFe` confirmation popup). There is no expand/collapse chevron.
- **Save on modal confirm.** Confirming the modal applies the draft to the in-memory list (prepend when creating, replace in place when editing) and **immediately runs the section Save** (the existing upload-then-`POST_evidences` flow). The section-level "Save" button remains for changes made outside the modal (a delete, or the section-level tag checkboxes).
- **Newest-first ordering.** Evidences SHALL be ordered most-recent → oldest by `last_updated_date` (falling back to `creation_date`, then `id`). New evidence appears at the top. Ordering is **stable during an editing session** — re-sort only on load and after save.
- **Dates surfaced.** The evidence model SHALL carry `creation_date` and `last_updated_date` so the card can display them. The server already stores both columns; this change consumes them (see Impact for the backend dependency).
- **Shared alert components.** The repository-upload note reuses the shared `app-pr-field-header` (title + required asterisk) + `app-alert-status`, instead of a bespoke alert with inline HTML/styles.

## Scope decisions (confirmed)

- **Flat card over accordion.** All evidence info fits in one compact card, so the accordion/expand interaction was dropped. Editing is modal-only (pencil), keeping a single source of truth for the form.
- **Padlock kept.** The open/closed padlock (grey closed = private, green open = public) is kept from the approved mockup for file evidence.
- **`rd-evidences` only.** The sibling `user-evidence` component used inside Innovation Dev info duplicates evidence-item logic; it is **out of scope** here and keeps the legacy inline form. Aligning it is a **follow-up ticket**.
- **Supplementary evidence** (the commented `supplementary` array) is out of scope.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `result-evidence`: Evidence-section presentation changes from inline blocks to a create/edit modal + a flat (non-collapsible) card list with a summary top (type, upload/updated date, public/private padlock for files) and a horizontal body (link/filename, impact-area tags, details), newest-first stable ordering, per-item edit (opens the modal) and delete-with-confirmation. Confirming the modal persists immediately via the existing save flow; the section-level Save remains for out-of-modal changes. All existing validations, the 6-piece limit, the knowledge-product read-only branch, link rules, and green-checks are preserved.

## Impact

- **Client (`onecgiar-pr-client`):**
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.{ts,html,scss}` — container: hosts the flat card list, the create/edit modal (`editingIndex`, `editEvidence`, `confirmCreateEvidence` persisting via `onSaveSection`), ordering, and the section Save.
  - `pages/results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component.{html,scss}` — the form used inside the modal; the repository-upload note now uses shared `app-pr-field-header` + `app-alert-status`.
  - `rd-evidences.module.ts` — `CollapsibleContainerModule` import removed (no longer used).
  - `model/evidencesBody.model.ts` — `creation_date?` and `last_updated_date?` on `EvidencesCreateInterface`.
  - Specs: `rd-evidences.component.spec.ts` (edit/create + save-on-confirm), `evidence-item.component.spec.ts`.
- **Backend dependency (separate task):** the evidence `GET` endpoint must return `creation_date` and `last_updated_date` in the evidences payload. Both columns already exist and are auto-populated by TypeORM (`evidence.entity.ts`); they only need to be exposed in the response. Until then the card shows no date and ordering falls back to `id` desc. **Sorting is done client-side**, so no server-side ordering change is required.
- No API contract changes from the client beyond consuming the two date fields; no migrations; no validation/green-check changes.
