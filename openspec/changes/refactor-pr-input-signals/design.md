## Context

`pr-input` (`app/custom-fields/pr-input`) is a `ControlValueAccessor` wrapper around PrimeNG `pInputText`/`p-inputNumber`/`p-message`, used 184× in 49 templates. It is `standalone: false` (declared in `CustomFieldsModule`) and consumed via `[(ngModel)]="..."` in template-driven forms.

Two legacy patterns must go:

1. **Side-effecting computed** — `preventFieldRender = computed(() => { ...; this.label = label; this.placeholder = placeholder; this.required = required; ...; return !hide; })`. The template calls `preventFieldRender()` as a render guard, and relies on its side effects to populate the label/placeholder from `FieldsManagerService`. A computed that mutates is invalid under signals semantics and unpredictable under `OnPush`/zoneless.
2. **Side-effecting getter** — `get value()` recomputes `wordCount` and mutates `beforeValue` on every read (i.e. every CD pass), then returns `_value`.

The refactor must preserve the exact public contract (see `specs/pr-input-field/spec.md`) because the 49 consumers are not touched.

## Goals / Non-Goals

**Goals:**
- `@Input()` → `input()` signal inputs, same public names/defaults.
- Pure `shouldRender` computed replacing `preventFieldRender` (name changes internally; template updated).
- FieldsManager-driven values exposed as pure computed signals (`effectiveLabel`, `effectivePlaceholder`, `effectiveDescription`, `effectiveRequired`, `effectiveUseColon`) with fallback to the corresponding input.
- `value` backed by a `signal`; `wordCount` derived via `computed`; `set value` keeps trim-on-link and negative-clamp logic.
- `ControlValueAccessor` intact; `fieldState`, `hasValue`, `badLink`, `aTag` intact.

**Non-Goals:**
- No Spartan/Tailwind swap (later phase).
- No `standalone: true` (keeps it in `CustomFieldsModule`; avoids touching the module and the exit-NgModule work).
- No change to any other custom field, to `field-card`, or to `.scss`.
- No change to the PrimeNG primitives used.

## Decisions

- **Keep `ControlValueAccessor` (manual), do not switch to `model()`.** The 184 usages bind via `[(ngModel)]` against the CVA. `model()` would change the two-way mechanics and risk the template-driven forms. Rationale: minimal blast radius. Back the value with `private _value = signal<any>(null)`; keep `get value()/set value()` as a thin bridge (getter returns `this._value()`, no side effects; setter applies link-trim + negative-clamp, sets the signal, calls `onChange`). `writeValue` sets `_value`.
  - Alternative considered: `model<any>()` two-way signal — rejected for this pilot (higher risk vs template-driven `ngModel`); revisit when converting to reactive forms.
- **Derive, don't assign.** `private fieldConfig = computed(() => { const ref = this.fieldRef(); return ref ? this.fieldsManager.fields()[ref] : undefined; })`. Then `effectiveLabel = computed(() => this.fieldConfig()?.label ?? this.label())`, etc. `effectiveRequired` respects `lockRequiredFromFieldManager()` (when true, uses the input, not the manager). Template binds to the `effective*()` signals.
- **`shouldRender`** = pure computed: `const ref = this.fieldRef(); if (!ref) return true; return !this.fieldConfig()?.hide;`. Template `@if (shouldRender())`.
- **`wordCount`** = `computed(() => this.maxWords() ? this.wordCounterSE.counter(this._value()) : 0)` (assumes `WordCounterService.counter` is pure — it is, a count). Removes the getter side effect entirely; `beforeValue` is deleted.
- **`fieldState`** stays a getter but reads signals (`this.maxWords()`, `this.autogenerate()`, `this.wordCount()`, `this.required()` → `effectiveRequired()`). Could be a `computed`; keeping it a getter minimizes template churn. Either is acceptable.
- **`inject()` for services** already partially used (`fieldsManager = inject(...)`). Convert the constructor-injected `wordCounterSE`/`rolesSE`/`dataControlSE` to `inject()` for consistency (they stay `public` where the template needs them — `rolesSE`, `dataControlSE`).

## Risks / Trade-offs

- **Broad regression surface (49 templates)** → Mitigation: public contract frozen and captured as spec scenarios; smoke-test the heaviest real screens (Result Detail General Information, an Innovation type page, an evidence textarea-adjacent input) at `localhost:4200` against prtest before declaring done.
- **`[(ngModel)]` + signal-backed getter/setter edge cases** (e.g. `p-inputNumber` writing `0`/negatives) → Mitigation: preserve the exact `set value` branch logic; add targeted specs for `value` set/write and negative clamp.
- **Template reads `label`/`required` directly today** → Mitigation: replace every direct read with the `effective*()` computed in the same edit so no stale field remains; grep the template for `this.label`, `this.required`, `this.placeholder`, `this.description`, `useColon`, `preventFieldRender`.
- **FieldsManager returns `undefined` for a `fieldRef`** → same as today (`|| {}` fallback); `effective*` computed fall back to inputs. Preserve.

## Migration Plan

1. Refactor `.ts` (inputs → signals; pure computeds; value signal; wordCount computed).
2. Update `.html` to call `shouldRender()` and bind `effective*()` where it read mutated fields.
3. Run `npm run test src/app/custom-fields/pr-input/pr-input.component.spec.ts` (keep green; add value/CVA + FieldsManager-override specs).
4. `npm run lint` on the file.
5. `npm start` and smoke-test 2–3 real screens.
6. Rollback = revert the single component's `.ts`/`.html` (isolated; no consumer or module change).

## Open Questions

- Link this change to a P2 ticket, or keep it under the untracked `front-redesign` initiative? (Does not block implementation.)
