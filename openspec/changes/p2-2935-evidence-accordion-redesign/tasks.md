## 1. Model & data

- [ ] 1.1 In `model/evidencesBody.model.ts`, add optional `creation_date?: Date` and `last_updated_date?: Date` to `EvidencesCreateInterface`
- [ ] 1.2 In `rd-evidences.component.ts` `getSectionInformation()`, keep the dates from the GET response on each evidence (no stripping)
- [ ] 1.3 Add a stable sort helper: order by `last_updated_date` desc → `creation_date` desc → `id` desc; call it after load and after a successful save reload only (NOT during editing)
- [ ] 1.4 Backend dependency (separate task, tracked here): evidence GET must return `creation_date` and `last_updated_date`. Until then, header omits the date line and ordering falls back to `id`

## 2. Creation modal

- [ ] 2.1 Create `components/evidence-create-modal/evidence-create-modal.component.{ts,html,scss,spec.ts}` wrapping the creation form (source, public question, dynamic info note via `dynamicAlertStatusBasedOnVisibility()`, file drag-and-drop or link, Impact-Area + per-typology checkboxes, 50-word description)
- [ ] 2.2 Modal emits a fresh `EvidencesCreateInterface` on "Add evidence"; discards on Cancel; does NOT upload files (carry the `File` on the model for the section-Save upload loop)
- [ ] 2.3 In `rd-evidences.component.ts`, open the modal from "Add evidence"; on confirm, prepend the new evidence and mark the section dirty; re-run `validateCheckBoxes()`
- [ ] 2.4 Preserve the 6-piece limit (hide/disable "Add evidence" at 6) and the knowledge-product / readOnly gating

## 3. Accordion list

- [ ] 3.1 Create `components/evidence-accordion-item/evidence-accordion-item.component.{ts,html,scss,spec.ts}` using `shared/components/collapsible-container` for expand/collapse; body hosts the editable `evidence-item` form
- [ ] 3.2 Create `components/evidence-accordion-header/evidence-accordion-header.component.{ts,html,scss,spec.ts}`: index number, type label ("Link Evidence" / "File Evidence"), "Added: {date} at {time}" (+ "| Updated: ..."), link/filename line, Impact-Area badge tags
- [ ] 3.3 Header padlock for FILE evidence only: open/green = public, closed/grey = private, hover tooltip "Public"/"Private" (Figma-literal). No padlock for links
- [ ] 3.4 In `rd-evidences.component.html`, replace the `*ngFor` of inline `<app-evidence-item>` with the accordion list
- [ ] 3.5 Format dates with Angular `DatePipe`
- [ ] 3.6 Best-effort: preserve each item's expand/collapse state across a save; if it complicates the reload, fall back to the default post-save behavior

## 4. Per-item actions

- [ ] 4.1 In `evidence-item.component.html`, remove the per-item edit (pencil) button; keep delete + chevron in the header
- [ ] 4.2 Wire delete in the header to the existing `alertsFe` confirmation popup; call `$event.stopPropagation()` so delete does not toggle the accordion
- [ ] 4.3 On confirmed delete, remove from the in-memory array and re-run section validations; persistence deferred to section Save
- [ ] 4.4 Keep delete hidden for readOnly roles, submitted results, and the knowledge-product branch
- [ ] 4.5 Preserve current inline file-replacement: deleting the uploaded file (`onDeleteSPLink()`/`cleanSP()`) re-shows the drag-and-drop so the user can swap the file without deleting the whole evidence

## 5. No-autosave & save flow

- [ ] 5.1 Ensure accordion edits mutate the existing `evidencesBody.evidences[i]` (in-memory); NO Save/Cancel buttons inside the accordion body
- [ ] 5.2 Leave `onSaveSection()` (file upload session loop + `POST_evidences`) and `validateButtonDisabled` unchanged; confirm save still reloads + re-sorts

## 6. Preserve P2-2981 + business rules

- [ ] 6.1 Carry P2-2981 copy verbatim into modal + accordion (public-file label, dynamic checkbox-group title, per-typology checkbox, intro notes, KP intro branch)
- [ ] 6.2 Verify `validateCGLink()` / `validateCloudLink()` link rules still work in the modal and expanded form
- [ ] 6.3 Verify green-checks (`appFeedbackValidation`) and the Impact-Area score-of-2 warning still gate/inform correctly

## 7. Tests & local verification

- [ ] 7.1 Update `evidence-item.component.spec.ts` (edit button removed, accordion body)
- [ ] 7.2 Update `rd-evidences.component.spec.ts` (modal open/confirm, ordering, delete confirmation, no-autosave)
- [ ] 7.3 Add specs for `evidence-create-modal`, `evidence-accordion-item`, `evidence-accordion-header`
- [ ] 7.4 Run `npm run test` for affected specs; keep coverage above thresholds (50/60/60/60)
- [ ] 7.5 Verify in the browser: modal create, collapsed headers (type, date, padlock for files, tags), newest-first stable order, delete confirmation, no autosave, KP read-only, 6-piece limit

## 8. Out of scope (follow-up tickets)

- [ ] 8.1 (Not now) Align the Innovation Dev `user-evidence` component — ideally by extracting a shared accordion
- [ ] 8.2 (Not now) Supplementary evidence accordion

> Decisions resolved 2026-06-03 (see design.md "Resolved decisions"): file replacement = keep current inline behavior (task 4.5); expand/collapse across save = best-effort (task 3.6); legacy dates = `creation_date` always present, hide-line is only a defensive guard; 6-piece cap = keep current frontend validation.
