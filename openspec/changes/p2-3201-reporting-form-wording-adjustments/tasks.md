# Tasks — P2-3201 Reporting form wording adjustments

All work is **frontend only** (`onecgiar-pr-client/`). No server task exists in this change; no migrations, no git-state changes.

Base branch: `P2-3201-reporting-form-wording-adjustments` (from `origin/staging` `cf310c7fc`).

## Scope reality check (4 Aug)

This change targets the **current** reporting form on `staging`, not the `performance-refactor` redesign.
Three items in the ticket have no surface to land on here, and are deferred rather than forced:

- **Contributing Science Programs/Accelerators (plural label + self-registration note)** — the field itself
  is created by **P2-2929**, which is still only on `dev`. Nothing to relabel yet.
- **Policy change variant of the linked/bundled question** — on this branch the question renders only for
  Innovation use / Innovation development (`result_type_id` 2 and 7). Adding it for Policy change would be
  a new feature, not a copy change.
- **ToC note rewrite to the 2026 wording** — this branch only carries the 2025 note, which is correct for
  the 2025 cycle. Replacing it would change live 2025 copy.

The tooltip infrastructure (`PrTooltipDirective`) had to be built here: `staging` has no equivalent, and
PrimeNG's `pTooltip` is hover-only, so it cannot satisfy the ticket's "stays pinned on click" requirement
nor keep the links inside the guidance clickable.

## 1. Tooltip infrastructure (blocks group 2)

- [x] 1.1 Add `@Input() prTooltipPinnable: boolean = false` to `src/app/shared/directives/pr-tooltip.directive.ts`, defaulting to today's behaviour.
- [x] 1.2 In the same directive, change `@HostListener('click')` so that it hides when `prTooltipPinnable` is `false` (unchanged path) and pins when `true`.
- [x] 1.3 While pinned, register `document` click and `keydown.escape` listeners via `Renderer2.listen`; dismiss on Escape and on clicks whose target is **not** inside the tooltip element.
- [x] 1.4 Tear the pinned listeners down in `hide()` and `ngOnDestroy()`; verify no listener leaks when the host view is destroyed while pinned.
- [x] 1.5 Extend `src/app/shared/directives/pr-tooltip.directive.spec.ts` covering: hover shows / leave hides when unpinned; click hides when unpinned; click pins; Escape closes a pinned tooltip; outside click closes it; **inside click does not**.

## 2. Section 1 — Titles, Description and Lead contact person

- [x] 2.1 In `src/app/shared/services/fields-manager.service.ts`, rename the `Description` field label to `Description of Result`. Edit the named key only — the string `Description:` appears three times in the Section 1 DOM and each is handled differently, so no global replace.
- [x] 2.2 In the same file, key `'[general-info]-lead_contact_person'`: move the current `description` content to a `tooltip` value so the grey `Description:` header disappears with no text lost, keeping the `<strong>Examples:</strong>` markup.
- [x] 2.3 Bind that tooltip through `app-pr-field-header [tooltip]` where the Lead contact person field renders, and mark it pinnable.
- [x] 2.4 Remove the inner grey `Description:` header from `Title of Result` and `Description of Result` while keeping their guidance bullets inline (per design D2 — do **not** convert these two to tooltips).
- [x] 2.5 Add the AI assistant note in `src/app/pages/results/pages/result-detail/pages/rd-general-information/`, rendered once between the `Change result type` button and the `Title of Result` label, using the amended sentence "once all sections are completed".

## 3. Section 1 — Impact Area scores

- [x] 3.1 Move the 0/1/2 scoring guidance and its four notes into a pinnable tooltip on the `Impact Area scores` heading.
- [x] 3.2 Move each of the five Impact Areas' guidance boxes (`Example topics`, `Collective global targets`, scoring note where present) into a pinnable tooltip beside that area's tag label.
- [x] 3.3 Add the AI-assisted notification note once, above the section heading, as a static block — not collapsible, no "How it works" link.
- [x] 3.4 Confirm score-2 behaviour is untouched: the evidence warning and the `Which component of the Impact Area is this result intended to impact?` question still appear only for `(2) Principal`.

## 4. Section 2 — Contributors and partners

- [x] 4.1 In `src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts`, replace the ToC note that currently references the 2025 ToC with the approved 2026 text.
- [x] 4.2 In `rd-contributors-and-partners.component.html`, add the contributor definition above `Contributing CGIAR Centers`, with the CGIAR CLARISA Glossary words linking to the CLARISA Glossary URL.
- [x] 4.3 Rename `Contributing W3 and/or bilateral projects` → `Contributing W3/Bilateral projects` in this section only, and add the 2026 mapping-exercise note. Do **not** touch the other three files that carry the old string (`ipsr-contributors`, `step-n4-add-project`, `aow-hlo-create-modal`) — they are outside this ticket's scope.
- [x] 4.4 Change the contributing Science Program/Accelerator label to the plural `Contributing Science Programs/Accelerators`, remove its ToC note, and add the self-registration note.
- [x] 4.5 Truncate the pending-confirmation banner after `has not confirmed its contribution to this result.`, removing the trailing ToC-mapping clause.

## 5. Section 2 — Linked / bundled question

- [x] 5.1 Verify P2-3199's removal of the Section 4 duplicate is present on this branch before editing; if the field is still there, stop and report — do not remove it twice.
- [x] 5.2 Update the label in `fields-manager.service.ts` key `'[innovation-use-form]-has-innovation-link'` to the unified wording.
- [x] 5.3 Update `linkedResultQuestionLabel` (`rd-contributors-and-partners.component.ts:218`) so the generic and innovation variants collapse into the unified wording, leaving `Policy change` as the only remaining conditional branch. Keep the computed and its template binding — do not replace the mechanism.
- [x] 5.4 Leave the key name `[contributors-partners]-is-lead-by-partner` as is; it is referenced by `fieldRef` and renaming it is out of scope despite being misleading.

## 6. Section 5 — Evidence guidance

- [x] 6.1 In `src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.ts::alertStatus()`, remove `All CGIAR publications should be shared using a CGSpace link.` from the public-accessibility bullet, keeping the rest of that bullet.
- [x] 6.2 Change `Files can be also uploaded to the PRMS repository.` → `Files can be uploaded to the PRMS repository.`
- [x] 6.3 Rewrite bullet 5 to the approved text with `respond with "No" to the confidentiality question` wrapped in `<b>`, as one running line.
- [x] 6.4 Leave the `isKnowledgeProduct` early return and the two `result_type_id === 5` notes (GDPR, sub-sample) untouched; leave the SharePoint video tutorial URL untouched.
- [x] 6.5 Extend `rd-evidences.component.spec.ts` to assert the Knowledge Product branch and the Capacity-sharing branch each still render their own text, plus the three edits above.

## 7. Section 3 — Geographic location (unblocked 4 Aug 08:32)

- [x] 7.1 ~~Blocked~~ — resolved by Santiago via Slack and recorded on P2-3213. Both questions answered; point 5 is in scope for this change.
- [x] 7.2 In `src/app/pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.html`, replace the three-way `labelText` expression with the single unified string `What is the geographic focus of the result?`, for every result type and phase year.
- [x] 7.3 Do the same for the `[label]` binding passed to `app-geoscope-management` so the question reads identically wherever it is rendered.
- [x] 7.4 Leave the `[description]` binding untouched — Santiago explicitly asked for no change to the `This should reflect…` guidance.
- [x] 7.5 Leave the sub-questions and `has_extra_geo_scope` untouched; they keep their current behaviour and wording.
- [x] 7.6 Do **not** delete `FieldsManagerService.isGeographicLocation2026()`. It stops driving this label but removing the computed is a wider refactor than this ticket.
- [x] 7.7 Update the `P2-3036 (AC9)` comment at the top of the template to record that the label was unified by P2-3201, so the next reader does not think the variant was lost by accident.
- [x] 7.8 Extend `rd-geographic-location.component.spec.ts` asserting the unified question renders for an Innovation result in 2026, an Innovation result in 2025, and a non-innovation result.

## 8. Verification

- [x] 8.1 `cd onecgiar-pr-client && npm run lint` — clean.
- [x] 8.2 `npm run test` — **5261/5262 green**, coverage 81.66/73.55/77.06/82.30 (thresholds 60/50/60/60, all cleared). ⚠️ `reporting-aow-table.component.spec.ts › labels outcome tiers differently from outputs` failed on one run and passed on the next with no code change in between, and also failed with this change stashed — it is **flaky on `origin/staging`**, not broken by this work. Final run: 5262/5262 green, 420/420 suites.
- [x] 8.3 `npm start` and open a real result on prtest. For each converted tooltip: hover opens it, click pins it, Escape closes it, an outside click closes it, and a click **inside** it does not.
- [x] 8.4 In the pinned contributor-definition tooltip, click the CLARISA Glossary link and confirm it opens.
- [x] 8.5 Open a **Knowledge Product** result and confirm the Evidence section still shows its own sentence and not the bullet list.
- [x] 8.6 Open a **Capacity sharing for development** result and confirm the GDPR and sub-sample notes are still appended.
- [x] 8.7 Open a `Policy change` result and a non-policy result and confirm each shows its correct linked/bundled wording, and that Section 4 asks nothing.
- [x] 8.8 Confirm each AI note renders exactly once and in its specified position.
