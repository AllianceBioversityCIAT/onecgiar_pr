# complementary-innovation (IPSR Step 2.1)

**Verified:** 2026-09-28 · branch performance-refactor · P2-3846 (working tree)

## What it is
IPSR Step 2 – Package > 2.1. Lets the user bundle PRMS-reported Innovation Developments with the core
innovation, and create/edit ad-hoc "complementary innovation / enabler / solution" entries
(`result_type_id === 11`) through a modal.

## Contract
- `ComplementaryInnovationComponent` (parent) owns the catalogs: `complementaryFunction` (flat list from
  `GETComplementataryInnovationFunctions`) and `cols` (the same objects chunked 5-per-column by
  `setupColumns()`), passed down as `[columns]="cols"`.
- `ComplementaryInnovationService` (root-provided) owns the modal state: `dialogStatus`, `isEdit`,
  `idInnovation`, `bodyNewComplementaryInnovation` (the `CreateComplementaryInnovationDto`), and
  `complementaries` — a **signal-backed boolean** (P2-3322) that remounts the checkbox list.
- `NewComplementaryInnovationComponent` renders the modal and does `POSTNewCompletaryInnovation` /
  `PATCHcomplementaryinnovation`; it never loads data — rehydration for edit happens in the parent's
  `getComplementaryInnovation()`.
- Endpoints via `ResultsApiService`: `GETComplementaryById`, `GETComplementataryInnovationFunctions`,
  `POSTNewCompletaryInnovation`, `PATCHcomplementaryinnovation`, `PATCHComplementaryInnovation`,
  `PATCHComplementaryInnovationPrevious`, `GET_resultsLinked`, `POST_resultsLinked`.

## Where it is used
- `.../step-n2/step-n2.component.html` — routed child of Step 2 (see `complementary-innovation-routing.module.ts`).
- `complementary-innovation.component.html:39` — the pencil/eye icon calls `getComplementaryInnovation()`;
  `result_type_id !== 11` opens the result detail in a new tab instead of the modal.

## Children without their own file
| Component | What it does | Trap |
|---|---|---|
| `components/new-complementary-innovation/` | The create/edit modal (`app-pr-dialog`, `styleClass="new-complementary-innovation-dialog"`) | Its `.scss` owns the dialog's scroll model — see traps |
| `components/table-innovation/` | P2-3846: search-first list of PRMS results (type chips, `+ Link / ✓ Linked` rows, "Show more" by 10) | Ranking + highlight reuse `result-framework-reporting/pages/dashboard-lab/pipes/planned-search.util.ts` (exact phrase → all words any order → typos). The evaluation is memoised on (list ref, length, query, types) — it runs Levenshtein over ~1,300 rows, so never move it into a template call without the cache. Type label comes from `result_type_id` because the wire sends type 7 as "Innovation development (QAed)" even when Submitted; the status has its own chip (`result-status-tokens`). |

## Traps (⚠️ = already broke something)
- ⚠️ **The Function checkboxes match by REFERENCE, not by value** (P2-3529). They are native inputs with
  the `prCheckboxValue` CVA (`shared/directives/pr-checkbox-value-accessor.directive.ts`), which resolves
  membership with `indexOf`. The PrimeNG `p-checkbox` it replaced used deep equality. So
  `bodyNewComplementaryInnovation.complementaryFunctions` MUST hold the very objects from `cols` /
  `complementaryFunction` — a structurally identical literal renders every box unchecked while the text
  fields on the same modal reload fine. Locked by `complementary-innovation.zoneless.spec.ts`.
- ⚠️ **`complementaries` must stay signal-backed** (P2-3322). `getComplementaryInnovation()` sets it false
  then true 100 ms later so the checkbox list remounts against the loaded selection. It is read by a
  *different* component's template, so a plain field notifies nothing under zoneless CD and the list stays
  blank.
- ⚠️ **The modal's scroll lives on `.pr-dialog__body`, not on the panel** (P2-3530). The panel is clamped
  (`max-height: 90vh; overflow: hidden`) and `.modal_content` scrolls; `.buttons` is a pinned footer so
  "Save and continue" stays reachable at low resolutions. Restoring `overflow: auto` on the panel, or
  dropping `min-height: 0` from the body, puts the action row ~500px below the fold again.
- `disableSaveButton()` requires short_title + title + (at least one function OR `other_funcions`) +
  a yes/no answer. `other_funcions` is coerced to `''` on create only, never on update.
- The parent pushes into `innovationPackageCreatorBody` on create but the section is only persisted by
  `onSaveSection()` / `onSavePreviousNext()` — closing the modal does not save the bundle.

## Pending / Coming soon
- None.
