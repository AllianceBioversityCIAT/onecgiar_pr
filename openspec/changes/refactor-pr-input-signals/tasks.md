## 1. Component TS — inputs to signals

- [x] 1.1 Convert all `@Input()` declarations in `pr-input.component.ts` to `input()` / `input.required()` signal inputs, preserving names and defaults (`isStatic`, `required`, `hint`, `editable`, `noDataText`, `autogenerate`, `maxDecimals`, `showDescription`, `lockRequiredFromFieldManager`, `showFieldHeader`, `variant`, `numberMode`, `InlineStyles`, `descInlineStyles`, `fieldRef`, `customLabel`, `labelDescInlineStyles`, etc.)
- [x] 1.2 Convert constructor-injected `WordCounterService`, `RolesService`, `DataControlService` to `inject()` (keep `rolesSE`/`dataControlSE` accessible to the template)

## 2. Component TS — kill side effects

- [x] 2.1 Replace `preventFieldRender` computed with a private `fieldConfig = computed(() => fieldRef ? fieldsManager.fields()[fieldRef] : undefined)` and a pure `shouldRender = computed(...)` (no assignments)
- [x] 2.2 Add pure computeds `effectiveLabel`, `effectivePlaceholder`, `effectiveDescription`, `effectiveRequired` (honoring `lockRequiredFromFieldManager`), `effectiveUseColon` (default `true`) — falling back to the corresponding input
- [x] 2.3 Back `value` with `private _value = signal<any>(null)`; make `get value()` side-effect-free (return `_value()`); keep `set value()` link-trim + negative-clamp + `onChange`; update `writeValue` to set `_value`
- [x] 2.4 Replace the `wordCount` field with `wordCount = computed(() => maxWords() ? wordCounterSE.counter(_value()) : 0)`; delete `beforeValue`
- [x] 2.5 Update `fieldState`, `hasValue`, `badLink`, `aTag` to read signals; confirm `ControlValueAccessor` (`registerOnChange`/`registerOnTouched`) unchanged

## 3. Template HTML

- [x] 3.1 Change `@if (this.preventFieldRender())` → `@if (shouldRender())`
- [x] 3.2 Replace direct reads of mutated fields with the `effective*()` computeds (`label`→`effectiveLabel()`, `placeholder`→`effectivePlaceholder()`, `description`→`effectiveDescription()`, `required`→`effectiveRequired()`, `useColon` if used) in `field-card` bindings and the input block
- [x] 3.3 Update remaining signal-input reads in the template to call the signal (`type` → `type()`, `disabled` → `disabled()`, `maxWords`/`autogenerate`/`variant`/`numberMode`/`maxDecimals`/`InlineStyles`/`noDataText`, etc.) — verify `[(ngModel)]="value"` still binds to the getter/setter
- [x] 3.4 Grep the template for leftover `this.label`, `this.required`, `this.placeholder`, `this.description`, `preventFieldRender` — ensure none remain

## 4. Tests & gates

- [ ] 4.1 Keep `pr-input.component.spec.ts` green; add specs: value set/write via CVA, link-trim, negative-clamp, value getter has no side effects, FieldsManager override + `lockRequiredFromFieldManager`, `shouldRender` hide, `fieldState` transitions
- [x] 4.2 Run `npm run test src/app/custom-fields/pr-input/pr-input.component.spec.ts` and `npm run lint`
- [ ] 4.3 `npm start` and smoke-test real screens (Result Detail → General Information; an Innovation type page; a `link`/`number`/`currency`/`email` input variant) against prtest — confirm no visual/behavioral regression
- [x] 4.4 Verify the 49 consumers are untouched (`git diff --stat` shows only `pr-input.component.ts`/`.html` + spec)
