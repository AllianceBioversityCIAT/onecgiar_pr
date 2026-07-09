## 1. Component TS — inputs & outputs to signals

- [x] 1.1 Convert all `@Input()` in `pr-multi-select.component.ts` to `input()` signal inputs, preserving names/defaults (`optionLabel`, `optionValue`, `options`, `disableOptions`, `placeholder`, `label`, `selectedLabel`, `nextSelectedLabel`, `selectedOptionLabel`, `description`, `readOnly`, `hideSelect=false`, `isStatic=false`, `showSelectAll=false`, `group=false`, `optionGroupLabel`, `optionGroupChildren`, `required=true`, `showPartnerAlert=false`, `flagsCode`, `confirmDeletion=false`, `logicalDeletion=false`, `labelDescInlineStyles=''`, `selectedPrimary`, `cannotRemoveOptionValues=[]`, `displayLabelFormatter`, `showDescriptionLabel=true`)
- [x] 1.2 Convert `@Output() selectOptionEvent` and `@Output() removeOptionEvent` to `output()` (same names/payloads)
- [x] 1.3 Move constructor-injected services to `inject()` (keep `rolesSE`/`dataControlSE` public; keep `customizedAlertsFeSE` private)

## 2. Component TS — value channel & bridges

- [x] 2.1 Back value with `private readonly _valueSig = signal<any[]>([])`; make `get/set value` a side-effect-free CVA bridge (setter calls `onChange`, and `syncSelectionFlags()` only when grouped)
- [x] 2.2 Add public `get _value()/set _value()` over the signal (for `user-management` `@ViewChild` reset)
- [x] 2.3 Keep `writeValue` array-of-IDs → objects mapping; set `_valueSig`; grouped → `syncSelectionFlags()`

## 3. Component TS — flat decoration, select-all, cleanup

- [x] 3.1 Replace the side-effecting `get optionsIntance()` with a pure `computed` over a **cloned** copy of `options()` for FLAT mode: reset flags, apply `disableOptions()`, derive `selected` from `_valueSig()` (honor `logicalDeletion` `is_active`) — never mutate the originals, never reassign the model
- [x] 3.2 Move the `selectAll`/`unselectAll` model mutation into `selectAllF()` (flat ⇒ value = all cloned options / `[]`; grouped ⇒ over `getAllChildrenFromGroups`); keep the `setTimeout(500)` emit
- [x] 3.3 Guard `syncSelectionFlags()` to grouped mode (`if (!this.group()) return;`); keep grouped in-place decoration
- [x] 3.4 Remove dead `_beforeValueLength` and the `_optionsIntance`/`currentOptionsLength` caching that the computed replaces (for flat); preserve `getAllChildrenFromGroups`, `filterChildrenBySearch`, `filterFlatOptions`, `getDisplayLabel`, `validateShowDeleteButton`, `selectedLabelDescription`, `confirmDeletionEvent`, `onSelectOption`, `removeOption`, `removeFocus`, `getUniqueId`
- [x] 3.5 Port `onSelectOption`/`removeOption`/`ngOnChanges` to read signal inputs (`optionValue()`, `logicalDeletion()`, `group()`, `options()`)

## 4. Template HTML

- [x] 4.1 Update all signal-input reads in `pr-multi-select.component.html` to call the signal (`label()`, `description()`, `required()`, `labelDescInlineStyles()`, `showDescriptionLabel()`, `optionValue()`, `placeholder()`, `hideSelect()`, `readOnly()`, `isStatic()`, `showSelectAll()`, `group()`, `optionGroupLabel()`, `optionGroupChildren()`, `flagsCode()`, `selectedLabel()`, `selectedOptionLabel()`, `logicalDeletion()`, `confirmDeletion()`, `showPartnerAlert()`)
- [x] 4.2 Keep `[(ngModel)]="this.searchText"`, `selectAll` reads, `optionsIntance` (now the computed) in `filterFlatOptions(optionsIntance())`, chip loop over `value`, and the grouped loop over `options()`
- [x] 4.3 Grep the template for leftover uncalled signal reads (`this.` field reads that are now signals)

## 5. Tests & gates

- [x] 5.1 Keep `pr-multi-select.component.spec.ts` green; keep `user-management.component.spec.ts` green (mocks `_value`); keep all consumer specs that declare `PrMultiSelectComponent` green (no NEW failures — the 3 pre-existing broken suites fail identically with and without this change)
- [x] 5.2 `npm run test` for pr-multi-select + user-management + the consumer specs
- [x] 5.3 `npm run build:dev` — typecheck all 32 consumers + strictTemplates (PASS)
- [ ] 5.4 Manual smoke test per the design's test map (priority: user-management Clear filters + grouped entity; ipsr step-1 selects incl. logicalDeletion experts; contributors confirmDeletion; init-general-results-report Select all/Unselect all)
- [x] 5.5 Verify isolation: `git diff --stat` shows only `pr-multi-select.component.ts`/`.html` (+ docs/openspec)
- [x] 5.6 Update `onecgiar-pr-client/docs/refactor-signals-qa.md` with the pr-multi-select section (fields/sections + bridges + grouped caveat)

## 6. Phase B (DEFERRED — not in this change)

- [ ] 6.1 (later) Remove the `*ngIf`-toggle / parent→clear reset hacks now that flat reset is reactive — one consumer at a time, each with manual QA
- [ ] 6.2 (later) Port grouped mode to the pure-clone model
