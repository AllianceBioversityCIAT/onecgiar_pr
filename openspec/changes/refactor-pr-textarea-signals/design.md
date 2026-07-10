## Context

`pr-textarea` (`app/custom-fields/pr-textarea`) is a `ControlValueAccessor` wrapper around PrimeNG `pTextarea`, used **68× in 26 templates** via `[(ngModel)]` in template-driven forms. It is `standalone: false` (declared in `CustomFieldsModule`) and renders inside `app-field-card`, with `app-pr-word-counter` and `app-pr-field-validations` as children.

It carries the same two legacy patterns removed from `pr-input` in `refactor-pr-input-signals` (commit `6661baa56`):

1. **Side-effecting computed** — `preventFieldRender = computed(() => { ...; this.label = label; this.placeholder = placeholder; this.description = description; this.required = required; return !hide; })`. The template calls it as a render guard and relies on its side effects to populate label/placeholder/description/required from `FieldsManagerService`.
2. **Side-effecting getter** — `get value()` recomputes `wordCount` (when `maxWords` is set) and mutates `beforeValue` on every read, i.e. every CD pass.

The refactor must preserve the exact public contract (see `specs/pr-textarea-field/spec.md`) because the 26 consumers are not touched. The proven `pr-input` pattern is copied 1:1; no new decisions are needed beyond mapping it onto this component's smaller surface.

**Data flow (unchanged):** consumer template `[(ngModel)]` → Angular forms → `writeValue()` → internal value → template `textarea [(ngModel)]="value"` → `set value` → `onChange(v)` → consumer model. Presentation flows `FieldsManagerService.fields()[fieldRef]` (when `fieldRef` set) → `effective*` computeds → template; otherwise inputs pass through.

**Direct consumers of internal members** (template of this component only): `preventFieldRender()`, `label`, `description`, `required`, `showDescriptionLabel`, `labelDescInlineStyles`, `hasValue`, `maxWords`, `wordCount`, `autogenerate`, `readOnly`, `rolesSE.readOnly`, `isStatic`, `value`, `notProvidedText`, `rows`, `disabled`, `placeholder`, `hint`. No external component reaches into `PrTextareaComponent` members (verified: no `@ViewChild(PrTextareaComponent)` in the codebase); the only external contract is the selector + inputs + CVA.

## Goals / Non-Goals

**Goals:**
- `@Input()` → `input()` signal inputs, same public names/defaults (`isStatic=false`, `required=true`, `hint=null`, `rows=5`, `autogenerate=false`, `showDescriptionLabel=true`, `labelDescInlineStyles=''`).
- Pure `shouldRender` computed replacing `preventFieldRender`; template updated to `@if (shouldRender())`.
- FieldsManager-driven values as pure computeds: `effectiveLabel`, `effectivePlaceholder`, `effectiveDescription`, `effectiveRequired` (fallback to the corresponding input).
- `value` backed by `private _value = signal<string>(...)`; `wordCount` derived via `computed`; `beforeValue` deleted.
- `ControlValueAccessor` intact; `hasValue`, `fieldState`, `notProvidedText` intact.

**Non-Goals:**
- No Spartan/Tailwind swap, no `standalone: true`, no `.scss` change, no other custom field, no consumer edits.
- No `model()` two-way signal — same rationale as `pr-input` (68 `[(ngModel)]` usages ride on the CVA; minimal blast radius).

## Decisions

- **Copy the `pr-input` pattern verbatim.** Same names (`shouldRender`, `fieldConfig`, `effective*`), same CVA bridge (`get value()` returns `this._value()` with no side effects; `set value` sets the signal and calls `onChange`; `writeValue` sets `_value`). Rationale: consistency across the migrated fields is itself a goal — the next reader should see one pattern, not four dialects. Alternative (redesign per component) rejected.
- **`wordCount` = `computed(() => this.maxWords() ? this.wordCounterSE.counter(this._value()) : 0)`.** `WordCounterService.counter` is pure. This removes the getter/`beforeValue` caching dance entirely. Note the legacy getter only recomputed when the value actually changed — the computed gives the same observable behavior with signals' built-in memoization.
- **`fieldState` and `hasValue`**: keep as getters reading signals (matches `pr-input` decision — minimal template churn; `fieldState` is currently consumed by `field-card` styling via template bindings, `hasValue` by `[hasValue]`). Note: `pr-textarea` has no `useColon`, `badLink`, `aTag`, or numeric clamping — its surface is strictly smaller than `pr-input`; nothing extra is invented.
- **Constructor injection → `inject()`** for `wordCounterSE`, `rolesSE`, `dataControlSE` (keep `rolesSE` public — the template reads `rolesSE.readOnly`). `dataControlSE` is currently injected but unused in template/ts logic — keep the injection (public, unchanged) to avoid any hidden-contract surprise; do not remove members in this change.
- **Template updates limited to**: `preventFieldRender()` → `shouldRender()`, direct reads of mutated fields (`label`, `placeholder`, `description`, `required`) → `effective*()`, input reads → signal calls (`maxWords()`, `autogenerate()`, `rows()`, etc.). The `ngSwitch`/`*ngSwitchCase` structure stays as-is (structural modernization to `@switch` is optional and cosmetic; allowed but not required).

## Risks / Trade-offs

- **Broad regression surface (26 templates, heavy narrative screens)** → Mitigation: contract frozen as spec scenarios; Cypress CT `pr-textarea.cy.ts` covers CVA/ngModel + word-count behaviors; smoke-test Result Detail General Information (title/description textareas) and an Evidences narrative at `localhost:4200` against prtest.
- **`[(ngModel)]` on the internal `<textarea>` writes through `set value` every keystroke** → same mechanics as `pr-input`; the setter guards `v !== this._value()` before calling `onChange`, preserving today's no-op-on-equal behavior.
- **Template reads `label`/`required`/`placeholder`/`description` directly today** → Mitigation: replace every direct read with `effective*()` in the same edit; grep the `.html` for each name before finishing.
- **FieldsManager returns `undefined` for a `fieldRef`** → same `|| {}` fallback semantics via `fieldConfig()?.x ?? input()`. Preserve.
- **`readOnly` view renders `value` through `[innerHtml]`** → unchanged binding; the getter now reads a signal, no behavioral difference.

## Migration Plan

1. Refactor `.ts` (inputs → signals; pure computeds; value signal; wordCount computed; `inject()`).
2. Update `.html` (`shouldRender()`, `effective*()`, signal call sites).
3. Gate: `npm run test:ct` (all specs, `pr-textarea.cy.ts` green), `npm run build:dev`, Jest spec `pr-textarea.component.spec.ts`.
4. `npm run lint` on the touched files.
5. Smoke-test 2 real screens on `npm start`.
6. Document in `onecgiar-pr-client/docs/refactor-signals-qa.md` (new §5 + change-tracking row).
7. Rollback = revert the single component's `.ts`/`.html` (isolated; no consumer or module change).

## Open Questions

- None blocking. Ticket linkage to a P2 id remains pending at the `front-redesign` initiative level (same as the three prior field refactors).
