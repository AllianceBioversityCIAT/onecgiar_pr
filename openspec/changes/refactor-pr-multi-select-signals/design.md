## Context

`pr-multi-select` is a `ControlValueAccessor` multi-select (search + `cdk-virtual-scroll` flat list, plus a grouped mode) with chip rendering. 58 usages / 32 templates. `standalone: false` (declared in `CustomFieldsModule`), consumed via `[(ngModel)]`.

Root problems (all in the current `.ts`):
- `get optionsIntance()` runs on every CD. It caches `_optionsIntance = [...options]` (shallow — **same object references**), resets `.selected`/`.disabled` on those shared objects, re-derives selection by mutation, and — in the `selectAll === true/false` branches — **reassigns `this.value`** (`= []` or `= newSelection`). A getter mutating the model is the worst offender.
- `syncSelectionFlags()` mutates `option.selected` on the **original** options (shared by reference) → two multi-selects sharing a list corrupt each other.
- `selectAllF()` emits via `setTimeout(500)`.
- `_beforeValueLength` assigned (line ~96) but never read → dead.

The **only** external coupling to internals: `admin-section/pages/user-management/user-management.component.ts` "Clear filters" → `@ViewChild('entitiesSelect')` → `entitiesSelect.writeValue([])` + `entitiesSelect._value = []`. Its spec **mocks** `entitiesSelect` as a plain object, so the real bridge is not exercised by Jest — but the runtime behavior must be preserved. `manage-user-modal.component.html` has a `#entitiesSelect` template ref but its `.ts` only `@ViewChild`s `userSearchSelect` (no internals poking of the multi-select).

## Goals / Non-Goals

**Goals:**
- Inputs → `input()` signals; outputs → `output()`; value → internal `signal` with side-effect-free CVA bridge.
- Flat-mode option decoration (selected/disabled) as a **pure derivation over a cloned copy** — never mutate `this.options` originals; fixes the shared-reference corruption.
- Move the `selectAll`/`unselectAll` model mutation out of the `optionsIntance` getter into `selectAllF()`.
- Preserve `_value` as a public bridge so `user-management` keeps working **untouched**.
- Reactive flat reset: setting the bound model to `[]`/`null` clears the visible selection **without** a `*ngIf` destroy/recreate.
- Preserve `logicalDeletion` (soft-delete `is_active`), `confirmDeletion`, `selectedPrimary`, `cannotRemoveOptionValues`, `displayLabelFormatter`, chip UI, search, and virtual scroll exactly.
- Remove dead code; move DI to `inject()`.

**Non-Goals:**
- Not rewriting **grouped mode** into the pure-clone model (see decision below). Grouped keeps its current in-place `syncSelectionFlags` decoration.
- Not removing the consumer reset hacks (Phase B).
- Not touching `user-management`, `manage-user-modal`, `.scss`, or the PrimeNG primitives.
- Not converting to `standalone: true` or reactive forms.

## Decisions

- **Value channel:** `private readonly _valueSig = signal<any[]>([])`.
  - `get value(){ return this._valueSig(); }`
  - `set value(v){ if (v !== this._valueSig()) { this._valueSig.set(v); this.onChange(v); if (this.group()) this.syncSelectionFlags(); } }`
  - `writeValue(v)`: keep the array-of-IDs → objects mapping, then `this._valueSig.set(mapped)`; if grouped, `syncSelectionFlags()`.
  - Backward-compat: `get _value(){ return this._valueSig(); }` / `set _value(v){ this._valueSig.set(v); }` (public, NOT `@Input` — nothing binds `[_value]`).
  - Rejected `model()`: `[(ngModel)]` template-driven consumers make the CVA bridge the low-risk path (same call as `pr-input`/`pr-select`).

- **Flat `optionsIntance` → pure `computed`.** `computed(() => { clone options(); apply disableOptions(); set selected from _valueSig() (honoring logicalDeletion is_active); return clones; })`. Cloning fixes shared-reference corruption. The template's `*cdkVirtualFor` has no `trackBy` today, so identity churn is unchanged (the computed only recomputes when `options()`/`value()`/`disableOptions()` change). `onSelectOption`/`removeOption` operate on the value (the source of truth); the decorated clones are re-derived next tick.

- **Select all / unselect all in `selectAllF()`.** Move the model mutation here (explicit), preserving the exact end state:
  - flat + selectAll ⇒ `value = options().map(o => ({...o}))` (all options selected, cloned);
  - flat + unselect ⇒ `value = []`;
  - grouped handled symmetrically over `getAllChildrenFromGroups(options())`.
  - Keep the `setTimeout(() => selectOptionEvent.emit({}), 500)`.
  - Behavior nuance vs. today: today the getter re-applied select-all on **every** CD while the flag was set; now it applies once on click. End state is identical; this removes an accidental repeated mutation, not a feature.

- **Grouped mode kept as-is (deliberate).** The grouped template iterates the **original** `options` (`*ngFor="let grp of options"`) and binds `[(ngModel)]="option.selected"` on the original children; `syncSelectionFlags()` decorates them in place. Rewriting grouped to a pure clone requires restructuring the group template and the checkbox two-way binding — higher risk on the **admin entities selector** (`user-management` + `manage-user-modal`) for little benefit (only 2 grouped consumers). Grouped therefore keeps its current in-place decoration and its existing shared-reference caveat. This is called out for QA. A future change can port grouped to the pure model.

- **`syncSelectionFlags()` scope.** Guard it to the grouped branch (`if (!this.group()) return;` then decorate grouped children). Flat rendering is covered by the `computed`, so flat no longer needs (and no longer performs) original-object mutation — this is what fixes the flat shared-reference bug.

- **Template** updates every signal-input read to a call (`label()`, `required()`, `optionValue()`, `optionLabel()`, `placeholder()`, `hideSelect()`, `readOnly()`, `isStatic()`, `showSelectAll()`, `group()`, `optionGroupLabel()`, `optionGroupChildren()`, `flagsCode()`, `selectedLabel()`, `selectedOptionLabel()`, `logicalDeletion()`, `confirmDeletion()`, `showPartnerAlert()`, `labelDescInlineStyles()`, `showDescriptionLabel()`, `description()`). `selectAll` and `searchText` remain plain fields (local UI state). `value`, `optionsIntance`, and the helper methods (`filterFlatOptions`, `filterChildrenBySearch`, `getDisplayLabel`, `validateShowDeleteButton`, `selectedLabelDescription`, `getAllChildrenFromGroups`) stay callable as before.

## Risks / Trade-offs

- **`user-management` "Clear filters" breakage** (pokes `_value`, calls `writeValue([])`) → Mitigation: public `_value` get/set bridge; run `user-management.component.spec.ts` as a gate; manual QA the Clear-filters button.
- **Grouped entities selector regressions** (admin) → Mitigation: grouped path left behaviorally unchanged; manual QA the user-management + manage-user-modal entity multi-select (open, select several across groups, save, reset).
- **`logicalDeletion` chip behavior** (soft-delete keeps the chip but marks `is_active=false`) → Mitigation: port the `is_active` logic verbatim into the flat computed and `onSelectOption`/`removeOption`; QA the ipsr experts (`logicalDeletion=true`) and ToC/contributors confirm-deletion chips.
- **Virtual-scroll identity churn** if the computed returned fresh objects each CD → Mitigation: `computed` only recomputes on real signal changes; no `trackBy` existed before, so no regression.
- **Select-all timing** (value now set on click, not repeatedly in CD) → Mitigation: end state identical; QA the init-general-results-report "Select all"/"Unselect all".
- **Broad, low-coverage surface** (custom-fields + ToC/Contributors excluded from Jest) → Mitigation: the manual test map below is mandatory before merge.

## Migration Plan (this change = Phase A only)

1. Refactor `.ts` (inputs→signals, outputs→output(), value signal + `_value` bridge, flat pure `computed`, select-all into `selectAllF`, guard `syncSelectionFlags` to grouped, remove `_beforeValueLength`, DI→`inject()`).
2. Update `.html` signal reads.
3. `npm run test` for `pr-multi-select.component.spec.ts`, `user-management.component.spec.ts`, and the consumer specs that declare `PrMultiSelectComponent` (step-n1, step-n1-institutions, step-n1-eoi-outcomes, ipsr-contributors + centers/toc/non-cgiar, rd-theory-of-change, rd-partners + normal-selector, init-general-results-report, init-completeness-status, global-completeness-status, policy-change-info).
4. `npm run build:dev` (typecheck all 32 consumers + strictTemplates).
5. Manual smoke test — the map below.
6. Rollback = revert the single component's `.ts`/`.html`.

**Phase B (separate, later):** remove the `*ngIf`-toggle reset hacks now that flat reset is reactive — one consumer at a time, each with its own manual QA.

## Manual test map (where to test)

Ranked by fragility / coverage gap:

1. **Admin → User Management** — "Clear filters" resets the **Entity** multi-select (grouped) via `@ViewChild` `_value`/`writeValue`. Also test the grouped entity picker open/select/save. **Highest risk.**
2. **Admin → Create/Manage user modal** — grouped Entity multi-select: select entities across groups, save. (Grouped path.)
3. **IPSR → Innovation Use Pathway → Step 1** — SDG targets, experts (`logicalDeletion=true`), EOI outcomes, action-area outcomes, impact areas, institutions, geoscope multi-selects: select/deselect, chips update, soft-delete keeps the chip greyed.
4. **IPSR → Contributors** — centers, non-CGIAR partners (`confirmDeletion`), ToC multi-selects: add/remove with the confirm dialog; planned-result change clears dependent selects.
5. **Result Detail (P25) → Contributors & Partners** — bilateral projects / results multi-selects with `displayLabelFormatter`; `confirmDeletion`; multiple-WPs normal-selector. **No coverage.**
6. **Result Detail → Theory of Change** — SDG / impact-area / action-area targets multi-selects (`confirmDeletion`); switching WP tabs keeps correct selections. **No coverage.**
7. **Result Detail → Partners** (P22) + normal-selector — institution multi-select.
8. **Result Detail → Cap-dev / Policy-change info** — their multi-selects.
9. **Bilateral results → Result review drawer** (+ policy-change-content) — `cannotRemoveOptionValues` (lead projects can't be removed), `displayLabelFormatter`.
10. **Init Admin → General results report** — `showSelectAll`: "Select all" selects every option; "Unselect all" clears; `removeOptionEvent` chip removal.
11. **Init Admin → Completeness status** + **Global completeness status** — filter multi-selects (`confirmDeletion` on global).
12. **Geoscope management** (+ sub-geoscope) and **IPSR geoscope creator** (+ sub-geoscope) — region/country multi-selects reset on geo-scope/country change.
13. **Result-framework AOW → HLO create modal** — multi-select inside the modal resets on open/close.

## Open Questions

- Grouped-mode pure-clone port — deferred; revisit if a grouped consumer shows a shared-reference bug.
- Phase B scope/ordering — decide after Phase A lands and flat reset is verified reactive (shared with the `pr-select` Phase B list).
