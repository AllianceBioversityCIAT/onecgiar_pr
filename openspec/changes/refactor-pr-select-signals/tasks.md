## 1. Component TS — inputs & value to signals

- [x] 1.1 Convert all `@Input()` in `pr-select.component.ts` to `input()` signal inputs, preserving names/defaults (`optionLabel`, `optionValue`, `options`, `placeholder`, `label`, `description`, `readOnly`, `isStatic`, `required`, `flagsCode`, `disableOptions`, `disableOptionsText`, `disabled`, `editable`, `showPartnerAlert`, `extraInformation`, `indexReference`, `noDataText`, `fieldDisabled`, `group`, `groupCode`, `groupName`, `descInlineStyles`, `labelDescInlineStyles`, `optionsInlineStyles`, `overlayToBody`, `idKey`, `showDescriptionLabel`, `truncateSelectionText`, `inlineStylesContainer`, `expandSpaceOnOpen`)
- [x] 1.2 Remove the `@Input() _value`; back value with `private _sig = signal<any>(null)`; make `get/set value` a side-effect-free CVA bridge; `writeValue` sets `_sig`
- [x] 1.3 Add public `get _value()/set _value()` and keep `public fullValue: any = {}` as backward-compat bridges (for `user-management` `@ViewChild` reset)

## 2. Component TS — option decoration & cleanup

- [x] 2.1 Replace side-effecting `get optionsIntance()` with a memoized derivation over a **cloned** copy of `options()` (`options().map(o => ({...o}))`), rebuilt only when source identity/length changes — never mutate the original options
- [x] 2.2 Apply `disableOptions()` and derive `selected` from `value()` on the clones; update `fullValue` for display label
- [x] 2.3 Port `onSelectOption`, `removeFocus`, `onDropdownOpen`, `@HostListener('document:click')` to read signal values (`variant()`, `overlayToBody()`, `expandSpaceOnOpen()`, `idKey()`, `optionValue()`, `indexReference()`); behavior unchanged
- [x] 2.4 Remove the dead `labelName()` method; move constructor-injected services to `inject()` (keep `rolesSE`/`dataControlSE` public for template)

## 3. Template HTML

- [x] 3.1 Update all signal-input reads in `pr-select.component.html` to call the signal (`label()`, `required()`, `description()`, `optionValue()`, `optionLabel()`, `placeholder()`, `disabled()`, `fieldDisabled()`, `idKey()`, `indexReference()`, `truncateSelectionText()`, `flagsCode()`, `extraInformation()`, `optionsInlineStyles()`, `inlineStylesContainer()`, `showPartnerAlert()`, `expandSpaceOnOpen()`, etc.)
- [x] 3.2 Keep `[(ngModel)]="value"` (hidden input + not changed); verify `optionsIntance` and the `labelName` / `listFilterByTextAndAttr` pipes still receive the decorated list
- [x] 3.3 Grep the template for leftover `this.` field reads that are now signals; ensure none remain uncalled

## 4. Tests & gates

- [ ] 4.1 Keep `pr-select.component.spec.ts` green; keep `user-management.component.spec.ts` green (asserts `_value`); add specs: value write/select/clear, `_value` bridge, source-options-not-mutated (shared array), reactive reset
- [x] 4.2 `npm run test src/app/custom-fields/pr-select/pr-select.component.spec.ts` and `npm run test src/app/pages/admin-section/pages/user-management/user-management.component.spec.ts`
- [x] 4.3 `npm run build:dev` — typecheck all 43 consumers + strictTemplates
- [ ] 4.4 Manual smoke test per the design's test map (priority: user-management Clear filters; innovation-use org/sub-type; ToC multiple-wps tabs; contributors planned-result + tabs; geoscope region/country)
- [x] 4.5 Verify isolation: `git diff --stat` shows only `pr-select.component.ts`/`.html` (+ new specs)

## 5. Phase B (DEFERRED — not in this change)

- [ ] 5.1 (later) Remove the 13 `*ngIf`-toggle / parent→clear reset hacks now that reset is reactive — one consumer at a time, each with manual QA
