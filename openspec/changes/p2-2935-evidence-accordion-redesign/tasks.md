> **Design pivot:** the accordion is dropped in favour of a flat card; editing is modal-only. Tasks below reflect the delivered design (see proposal.md / spec.md).

## 1. Model & data

- [x] 1.1 In `model/evidencesBody.model.ts`, add optional `creation_date?` and `last_updated_date?` to `EvidencesCreateInterface`
- [x] 1.2 In `rd-evidences.component.ts` `getSectionInformation()`, keep the dates from the GET response on each evidence (no stripping)
- [x] 1.3 Add a stable sort helper (`sortEvidences`): order by `last_updated_date` desc → `creation_date` desc → `id` desc; call it after load and after a successful save reload only (NOT during editing)
- [ ] 1.4 Backend dependency (separate task, tracked here): evidence GET must return `creation_date` and `last_updated_date`. Until then, the card omits the date and ordering falls back to `id`

## 2. Create / edit modal

- [x] 2.1 Reuse `<app-evidence-item [embedded]="true">` inside a `p-dialog` modal hosting the full form (source, public question, dynamic info note via `dynamicAlertStatusBasedOnVisibility()`, file drag-and-drop or link, Impact-Area + per-typology checkboxes, 50-word description)
- [x] 2.2 The repository-upload note uses shared `app-pr-field-header` (title + required asterisk) + `app-alert-status` — no bespoke inline-HTML alert
- [x] 2.3 `addEvidence()` opens the modal in create mode (clean draft, `editingIndex = null`); `editEvidence(i)` opens it in edit mode pre-filled with a clone (`{ ...evidence }`)
- [x] 2.4 Modal title + confirm button are dynamic: "Add New Evidence"/"Add evidence" vs "Edit Evidence"/"Save changes" (`isEditingEvidence`)
- [x] 2.5 `confirmCreateEvidence()` prepends (create) or replaces in place (edit), then calls `onSaveSection()` to persist immediately; `cancelCreateEvidence()` discards the draft
- [x] 2.6 Preserve the 6-piece limit (hide "Add evidence" at 6) and the knowledge-product / readOnly gating

## 3. Flat card list

- [x] 3.1 Replace the accordion (`app-collapsible-container`) with a flat `.evidence_card` `*ngFor`; remove the `CollapsibleContainerModule` import
- [x] 3.2 Card top: index number, type label ("Link Evidence" / "File Evidence"), "Added: {date}" (+ "| Updated: {date}"), edit/delete actions
- [x] 3.3 Card top padlock for FILE evidence only: open/green = public, closed/grey = private, hover tooltip "Public"/"Private". No padlock for links
- [x] 3.4 Card body: link/filename (clickable), Impact-Area badge tags, details — flowing horizontally and wrapping to use the card width
- [x] 3.5 Format dates with Angular `DatePipe`
- [x] 3.6 Visual polish (modern-web-guidance): subtle border (`accents-2`), single white surface (no hard divider / no second background), soft hover shadow
- [x] 3.7 Upload loading state: while saving, a file evidence without a resolved link shows its file name + a `p-skeleton` bar (`isSaving` flag, `isEvidenceUploading`/`evidenceUploadingName`), switching to the link once it resolves; import `SkeletonModule`

## 4. Per-item actions

- [x] 4.1 Edit (pencil) action in the card top → opens the edit modal (`editEvidence(i)`)
- [x] 4.2 Delete action → existing `alertsFe` confirmation popup (`deleteEvidenceWithConfirm`)
- [x] 4.3 On confirmed delete, remove from the in-memory array and re-run section validations
- [x] 4.4 Keep edit/delete hidden for readOnly roles, submitted results, and the knowledge-product branch
- [x] 4.5 Preserve inline file-replacement inside the modal (`onDeleteSPLink()`) so the user can swap the file

## 5. Save flow

- [x] 5.1 Confirming the modal persists immediately via `onSaveSection()` (file upload session loop + `POST_evidences`, then reload + re-sort)
- [x] 5.2 The section-level Save button remains for out-of-modal changes (delete, section tag checkboxes); `validateButtonDisabled` unchanged

## 6. Preserve P2-2981 + business rules

- [x] 6.1 Carry P2-2981 copy verbatim into the modal (public-file label, dynamic checkbox-group title, per-typology checkbox, intro notes, KP intro branch)
- [x] 6.2 `validateCGLink()` / `validateCloudLink()` link rules still work in the modal form
- [x] 6.3 Green-checks (`appFeedbackValidation`) and the Impact-Area score-of-2 warning still gate/inform correctly

## 7. Tests & local verification

- [x] 7.1 Update `rd-evidences.component.spec.ts` (create/edit modal, edit-in-place, save-on-confirm)
- [x] 7.2 `evidence-item.component.spec.ts` still green
- [x] 7.3 Run the affected specs — 60 passing
- [x] 7.4 Verify in the browser: flat card (type, date, padlock for files, link, tags, details), edit via pencil opens the modal, save persists, KP read-only, 6-piece limit

## 8. Out of scope (follow-up tickets)

- [ ] 8.1 (Not now) Align the Innovation Dev `user-evidence` component — ideally by extracting a shared card/modal
- [ ] 8.2 (Not now) Supplementary evidence

> Decisions: accordion dropped (all info fits a flat card); editing is modal-only; modal confirm persists immediately. Visual decisions backed by the modern-web-guidance CSS guide (subtle border, single surface, no black divider).
