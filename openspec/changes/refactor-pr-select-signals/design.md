## Context

`pr-select` is a `ControlValueAccessor` custom dropdown (search + `cdk-virtual-scroll`) around a bespoke overlay. 90 usages / 43 templates. `standalone: false` (declared in `CustomFieldsModule`), consumed via `[(ngModel)]`.

Root problems:
- `get optionsIntance()` runs on every CD, does `_optionsIntance = [...this.options]` (shallow — **same option object references**), then sets `.disabled`/`.selected` on those shared objects. Selected state is a **mutation side effect**, not derived data.
- `@Input() _value` (never bound in any template — verified 0 `[_value]` bindings) plus a separate `value` CVA accessor → two value channels.
- Imperative overlay positioning (`document.getElementById`, `getBoundingClientRect`, inline styles), `@HostListener('document:click')`.
- Dead `labelName()`.

The **only** external coupling to internals: `admin-section/pages/user-management/user-management.component.ts` (`@ViewChild` → `statusSelect._value = ''`, `.fullValue = {}`, `.writeValue('')`; spec asserts `_value`). `.fullValue` is otherwise only used inside `s-select` (a different component).

## Goals / Non-Goals

**Goals:**
- Inputs → `input()` signals; value → internal `signal` with side-effect-free CVA bridge.
- Option decoration (selected/disabled) as a **derivation over a cloned copy** — never mutate `this.options` originals; stable identity to avoid virtual-scroll churn.
- Preserve `_value` and `fullValue` as public bridges so `user-management` and its spec keep passing **untouched**.
- Reactive reset: setting the bound model to `null`/`''` clears the visible selection **without** a `*ngIf` destroy/recreate.
- Remove dead code; keep overlay behavior identical.

**Non-Goals:**
- Not removing the 13 consumer reset hacks (Phase B).
- Not touching `user-management`, `s-select`, `pr-multi-select`, `.scss`, or the PrimeNG primitives.
- Not converting to `standalone: true` or reactive forms.

## Decisions

- **Value channel:** `private readonly _sig = signal<any>(null)`. `get value(){ return this._sig(); }` / `set value(v){ if (v !== this._sig()) { this._sig.set(v); this.onChange(v); } }`. `writeValue(v){ this._sig.set(v); }`. Backward-compat: `get _value(){ return this._sig(); }` / `set _value(v){ this._sig.set(v); }` (public, NOT `@Input` — safe since nothing binds `[_value]`). Keep `public fullValue: any = {}`.
  - Alternative: `model()` — rejected; `[(ngModel)]` template-driven consumers make CVA the low-risk path.
- **`optionsIntance` → memoized decoration.** Maintain `private _decorated: any[]` cloned from `options()` (`options().map(o => ({ ...o }))`) rebuilt only when the source array identity/length changes. A `computed` (or getter reading signals) resets flags on the clones, applies `disableOptions()`, marks the clone whose `optionValue` matches `value()` as `selected`, and updates `fullValue` for display. Cloning fixes the shared-reference corruption; reusing `_decorated` keeps identity stable so `*cdkVirtualFor` (no `trackBy`) doesn't thrash. `onSelectOption` operates on a clone — harmless (re-derived next tick); it still emits `selectOptionEvent` and sets `value`.
- **Overlay/DOM code** (`onDropdownOpen`, `removeFocus`, `@HostListener`) kept as-is, updated only to read `variant()`, `overlayToBody()`, etc. as signals. Out of scope to rewrite into CDK Overlay now.
- **Template** updates every `this.foo` read to `foo()` for signal inputs, `preventFieldRender`-style guards not present here. `[(ngModel)]="value"` and the hidden `<input [(ngModel)]="value">` stay (bridge to the signal).

## Risks / Trade-offs

- **Virtual-scroll identity churn** if decoration returns fresh objects each CD → Mitigation: memoize `_decorated` and mutate flags on the stable clones, rebuild only on options change.
- **`user-management` "Clear filters" breakage** (pokes `_value`/`fullValue`) → Mitigation: public `_value` get/set bridge + keep `fullValue`; run `user-management.component.spec.ts` as a gate.
- **Selected-state regressions in grouped mode / disableOptions** → Mitigation: port the group/disable logic faithfully; smoke-test the ToC selects and the partner-type selects that use `disableOptions`.
- **Reset behavior change** (making reset reactive) could interact with the consumer `*ngIf` hacks that still exist → Mitigation: since hacks destroy+recreate anyway, a correctly-resetting component is a superset; verify the hack sites still behave (they should, and become removable in Phase B).
- **Broad, low-coverage surface** (ToC/Contributors excluded from Jest) → Mitigation: the manual test map below is mandatory before merge.

## Migration Plan (this change = Phase A only)

1. Refactor `.ts` (inputs→signals, value signal + `_value`/`fullValue` bridge, decoration derivation, remove `labelName`).
2. Update `.html` signal reads.
3. `npm run test` for `pr-select.component.spec.ts` AND `user-management.component.spec.ts` (both green).
4. `npm run build:dev` (typecheck all 43 consumers + strictTemplates).
5. Manual smoke test — the map below.
6. Rollback = revert the single component's `.ts`/`.html`.

**Phase B (separate, later):** remove the 13 `*ngIf`-toggle reset hacks now that reset is reactive — one consumer at a time, each with its own manual QA.

## Manual test map (where the reset hacks live → where to test)

Ranked by fragility:
1. `admin-section/pages/user-management` — "Clear filters" (pokes `_value`/`fullValue`). **Highest risk.**
2. `shared/components/innovation-use-form` (+ clones `step-n1-innovaton-use`, `step-n3-current-use`) — `reloadSelect()` hide-toggle: change organization type → sub-type dropdown clears/re-renders.
3. `rd-theory-of-change/.../toc-initiative-out/multiple-wps` (+ `multiple-wps-content`) — `showMultipleWPsContent` tab re-render: switch WP tabs.
4. `rd-contributors-and-partners` (`tocConsumed` + `onPlannedResultChange`) — toggle planned result, add/delete/switch contribution tabs. **P25, no coverage.**
5. `rd-theory-of-change/.../toc-initiative-out` — `clearTocResultId()` on planned-result change.
6. `ipsr/.../ipsr-contributors` — `tocConsumed` + `onPlannedResultChange`.
7. `result-detail/components/share-request-modal` — `showForm`/`showTocOut`/`tocConsumed` ToC section.
8. `bilateral-results/.../result-review-drawer` — signal `tocConsumed`.
9. `shared/components/geoscope-management` (+ `sub-geoscope`) — geo-scope change clears region/country selects.
10. `ipsr-geoscope-creator/.../sub-geoscope` — country → sub-level 300ms re-render.
11. `result-detail/components/partners-request` + `retrieve-modal` — `showForm` modal selects.
12. Step-N4 modals (`add-partner`, `add-bilateral`, `add-project`) — `showForm` reset.
13. Lead center/partner inline clear — `rd-partners`, `rd-contributors-and-partners`, `ipsr-contributors` (is-lead-by-partner toggle).

## Open Questions

- Phase B scope/ordering (which hacks to remove first) — decide after Phase A lands and reset is verified reactive.
