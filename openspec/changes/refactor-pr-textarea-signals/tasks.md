## 1. Component TS — inputs to signals (frontend)

- [x] 1.1 Convert all `@Input()` declarations in `onecgiar-pr-client/src/app/custom-fields/pr-textarea/pr-textarea.component.ts` to `input()` signal inputs, preserving names and defaults (`placeholder`, `label`, `description`, `maxWords`, `readOnly`, `isStatic=false`, `required=true`, `hint=null`, `rows=5`, `autogenerate=false`, `fieldRef`, `disabled`, `showDescriptionLabel=true`, `labelDescInlineStyles=''`)
- [x] 1.2 Convert constructor-injected `WordCounterService`, `RolesService`, `DataControlService` to `inject()` (keep `rolesSE` and `dataControlSE` public for template/hidden-contract parity)

## 2. Component TS — kill side effects (frontend)

- [x] 2.1 Replace the `preventFieldRender` computed with a private `fieldConfig = computed(() => fieldRef() ? fieldsManager.fields()[fieldRef()] : undefined)` and a pure `shouldRender = computed(...)` (no assignments)
- [x] 2.2 Add pure computeds `effectiveLabel`, `effectivePlaceholder`, `effectiveDescription`, `effectiveRequired` — manager value with fallback to the corresponding input (mirror `pr-input`)
- [x] 2.3 Back `value` with `private _value = signal<string>(undefined)`; make `get value()` side-effect-free (return `_value()`); keep `set value()` guard `v !== _value()` + `onChange(v)`; update `writeValue` to set `_value`
- [x] 2.4 Replace the `wordCount` field with `wordCount = computed(() => maxWords() ? wordCounterSE.counter(_value()) : 0)`; delete `beforeValue`
- [x] 2.5 Update `fieldState` and `hasValue` getters to read signals (`maxWords()`, `autogenerate()`, `wordCount()`, `effectiveRequired()`); confirm `ControlValueAccessor` (`registerOnChange`/`registerOnTouched`) unchanged

## 3. Template HTML (frontend)

- [x] 3.1 In `pr-textarea.component.html`: change `@if (this.preventFieldRender())` → `@if (shouldRender())`
- [x] 3.2 Replace direct reads of mutated fields with the `effective*()` computeds (`label`→`effectiveLabel()`, `placeholder`→`effectivePlaceholder()`, `description`→`effectiveDescription()`, `required`→`effectiveRequired()`) in the `field-card` bindings, the `pr-field` ngClass, and the read-only `notProvidedText` branch
- [x] 3.3 Update remaining signal-input reads to call the signal (`showDescriptionLabel()`, `labelDescInlineStyles()`, `maxWords()`, `autogenerate()`, `readOnly()`, `isStatic()`, `rows()`, `disabled()`, `hint()`, `wordCount()`) — verify `[(ngModel)]="value"` still binds to the getter/setter
- [x] 3.4 Grep the template for leftover `this.label`, `this.required`, `this.placeholder`, `this.description`, `preventFieldRender`, `beforeValue` — ensure none remain

## 4. Tests & gates (frontend)

- [x] 4.1 Run `npm run test:ct` from `onecgiar-pr-client/` — all component specs green, `pr-textarea.cy.ts` included ("All specs passed!")
- [x] 4.2 Run `npm run test src/app/custom-fields/pr-textarea/pr-textarea.component.spec.ts` (keep green) and `npm run lint:fix` on the touched files
- [x] 4.3 Run `npm run build:dev` — build must pass
- [ ] 4.4 `npm start` and smoke-test real screens against prtest (Result Detail → General Information narrative textareas; an Evidences description) — typing, word counter, over-limit invalid style, read-only view
- [x] 4.5 Verify the 26 consumers are untouched (`git diff --stat` shows only `pr-textarea.component.ts`/`.html` + docs)

## 5. Documentation

- [x] 5.1 Add a `pr-textarea` section (QA guide + consumer surfaces to test) and the change-tracking row to `onecgiar-pr-client/docs/refactor-signals-qa.md`
