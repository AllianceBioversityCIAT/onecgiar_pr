# innovation-use-info

**Verified:** 2026-09-11 · branch performance-refactor · the innovation-link picker no longer wipes the links it cannot show (`linked_result` is a shared table — see the trap below); prior: 2026-09-10 · P2-3424 moves the "link to a QA'd Innovation Development result" question INTO this section, optional (PO decision, Ángel Jarrín, 10 Sep 2026).

## What it is
The "Innovation Use" section of the result detail (`result_type_id` 2, `prHide: 2`). It is a **host**:
almost the whole form is the shared `app-innovation-use-form`. What this component owns is the
hydration of `innovationUseInfoBody`, the save, and — since P2-3424 — the innovation-link question.

## Contract
- `innovationUseInfoBody: IpsrStep1Body` — the payload object, passed straight into
  `app-innovation-use-form` as `[body]`. Shared model with IPSR step 1.
- Two portfolios, two endpoint pairs: `GET/PATCH_innovationUse` (P22) and
  `GET/PATCH_innovationUseP25`, chosen by `FieldsManagerService.isP25()`.
- `sectionLoading = signal(true)` from construction, released in **both** handlers of the GET — the
  section loads from an `effect()` gated on `currentResultSignal()?.portfolio`, so "a request is in
  flight" is not a usable signal.
- Green check: not computed here — the MySQL function `validation_innovation_use_P25`.

## Traps (⚠️ = already broke something)

- ⚠️ **The P25 hydration is written key by key, and so is the save payload.** A key the server sends
  that `getSectionInformationp25()` does not name never reaches the shared form; a key the form
  collects that `saveSectionWith()` does not name is typed by the reporter and thrown away, with no
  error. Both halves already bit: P2-3613 (five missing keys, one of them hiding a whole block) and
  P2-3295 (`innov_use_2030_justification`). A new field lives in **both** lists or it does not exist.
- ⚠️ **`new_users_added` / `use_expansion_narrative` are written by the server as `?? null`**, so
  omitting them from the payload does not "leave them alone" — it blanks what was stored.

### P2-3424 — the link to a QA'd Innovation Development result (2026 phase onwards)

The question *"Are you reporting the use of an innovation that has already been reported and quality
assessed?"* and its single searchable picker are asked HERE, and they are **optional**.

- 🛑 **It was MOVED, not copied.** `rd-contributors-and-partners` no longer renders it — and no
  longer SENDS `has_innovation_link` / `linked_results` — for these results. Both questions answer the
  same stored field (`results_innovations_use.has_innovation_link` + the `linked_result` table), and
  two editing surfaces over one answer is the defect P2-3199 removed. Enforced statically by
  `innovation-link-editing-surface.spec.ts`.
- 🛑 **The gate is `showsInnovationLink()`: result type 2 + `phase_year >= 2026`, never `isP25()`**
  (prtest holds 2025-phase results inside P25). An **unknown** year renders nothing here, the same way
  its twin in Contributors and partners falls back to the legacy control — the two gates must never
  both be on (two surfaces) nor both be off (unreachable answer), so they read the same constants from
  `shared/services/global/qa-innovation-development-results.service.ts`.
- 🛑 **`[required]="false"` on BOTH controls is what makes the field optional**, and it is not
  decoration: `app-pr-radio-button` and `app-pr-select` both default `required` to `true` and emit
  `<div class="pr-field" [ngClass]="{ mandatory: required, … }">`, which is exactly what
  `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` counts. No
  `appFeedbackValidation` marker either (the other emitter), and no `fieldRef` on the radio —
  `FieldsManagerService` overwrites `required` whenever a `fieldRef` is present.
- ⚠️ **The P2-3199 defensive re-read is skipped when this gate is ON.** `onSaveSection()` re-reads the
  stored link right before saving *for every result whose question lives in section 2*; doing that for
  these results would replace the answer the user just gave with the one already stored, silently,
  behind a successful save.
- ⚠️ **`qaInnovationOptions` injects the orphan option.** The catalogue only lists what is linkable
  TODAY, so a stored link whose innovation left those statuses would paint an EMPTY select — and
  saving the section would then wipe it without the user touching anything. The stored id is kept as
  an option; its title is unknown here (this section loads no wider catalogue), and the label says so
  rather than inventing one.
- ⚠️ **`linked_results` is NOT this question's private storage — the table is shared.**
  `getLinkedResultsByOrigin` (`results-innovations-use.repository.ts:245-259`) returns EVERY active
  `linked_result` row of the result, whoever wrote it: the P22 "Links to results" section and
  versioning replication included. The picker can only paint ONE of them, so writing `[value]` back
  deleted the rest — the payload carries the array verbatim and
  `LinkedResultRepository.updateLink` (`linked-results.repository.ts:313-330`) de-activates every
  active row missing from it. Measured 11 Sep 2026 on the test DB: **28 active Innovation use results
  carry more than one active link**; result 11164 (code 8696, 2026 phase) carries three — 8738,
  8826, 8877, all three *Policy change* results, and prtest returns all three. The setter now replaces
  only the id the getter displays and carries the rest through untouched.
  🛑 Still open and NOT fixable from the client: answering **"No"** makes the server call
  `createForInnovationUse(id, [], user)` (`innovation-use.service.ts:359-372`), which de-activates
  **every** active link of the result, the ones this surface never showed included.
- ⚠️ **Not an MDS is a CLIENT statement.** `validation_innovation_use_P25` still returns FALSE when
  `results_innovations_use.has_innovation_link IS NULL`, so the section's green check keeps expecting
  an answer. Changing that is a migration + the green check — Juan David's, not this ticket's.

## Where it is used
- Route `result/result-detail/:id/innovation-use-info?phase=<id>` (`rdResultTypesPages`, `prHide: 2`).

## Tests
`innovation-use-info.component.spec.ts` (hydration, save payload, the P2-3613 keys) ·
`innovation-use-info.innovation-link.spec.ts` (P2-3424: gate, picker, save contract, and the
not-mandatory template facts) · `innovation-link-editing-surface.spec.ts` (the single-editing-surface
invariant across every result-detail template — the duplication is invisible to any one component
test, since each surface passes its own spec in isolation).
