## Context

`app-pr-input` and `app-pr-select` (`custom-fields/`) wrap PrimeNG behind a PRMS facade (field-header + validation + CVA), consumed ~230× via `[(ngModel)]`. On this branch (Angular 21) they still use PrimeNG:
- **pr-input**: `pInputText` (text/email), `p-message` (email error), `p-inputNumber` (number + currency USD).
- **pr-select**: already a **custom** dropdown (CDK `cdk-virtual-scroll-viewport` + bespoke `<a class="field">` + `labelName`/`listFilterByTextAndAttr` pipes). The ONLY PrimeNG is the search box: `p-iconfield` + `p-inputicon` + `pInputText`.

Spartan provides `hlmInput` (a directive on native `<input>`); it has **no number/currency input** — those become native inputs with component-side logic.

## Goals / Non-Goals

**Goals:** zero PrimeNG in both components; identical public contract (selector/inputs/CVA); same visual + behavior; consumers untouched; establish the migration pattern.

**Non-Goals:** no signals refactor (that lives on `front-redesign-fields`); no change to pr-select's custom dropdown mechanics; no other custom field; no `tw-` prefix work.

## Decisions

- **Input styling via Spartan `hlmInput`.** Add it with `ng g @spartan-ng/cli:ui input` (creating `components.json`). Apply `hlmInput` to the native inputs. Keep the existing PRMS classes (`pr-body-2`, validation classes) alongside — Tailwind utilities are opt-in and don't fight them.
- **`p-inputNumber` → native `<input>` + component formatting.** `type='number'`: native `<input type="number" [min]="0" step>` bound to the CVA value. `type='currency'`: native `<input type="text" hlmInput>` with a `formatCurrency(value)` on blur (Intl.NumberFormat 'en-US' USD) and a numeric parse on focus/input. Rationale: Spartan has no masked number input; blur-formatting preserves the `$1,234.56` display without PrimeNG. Alternative (keep live keystroke masking) would need a masking lib — out of scope; documented as a minor UX delta.
- **`p-message` → plain `<div>`.** Replace the email `<p-message severity="error">` with a Tailwind/PRMS-styled `<div class="pr-body-3 text-red-300">` gated on `emailInput.invalid`. Same messages.
- **pr-select search box → `<input hlmInput>` + icon.** Replace `p-iconfield`/`p-inputicon`/`pInputText` with a native `<input hlmInput [(ngModel)]="searchText">` and a `material-icons-round` search icon (project icon convention). `pi pi-chevron-down` / `pi pi-search` come from **primeicons** (a font, not PrimeNG components) — the chevron can stay or move to material-icons; keep behavior identical.
- **Module cleanup.** After the swaps, grep the whole `src/` for each PrimeNG module's selectors; remove `InputTextModule`/`InputNumberModule`/`IconFieldModule`/`InputIconModule`/`MessageModule` from `custom-fields.module.ts` only if no other declared component uses them. If another custom-field still uses one, leave that import.

## Risks / Trade-offs

- **Currency UX delta (blur-format vs live-mask)** → Mitigation: format-on-blur keeps the final display identical; document; smoke-test a currency field (budget/contribution).
- **CVA value shape for number/currency** → the model must stay a number (or the string the server expects). Preserve the current `set value` coercion; parse the formatted string back to a number on change. Test 0, decimals, empty.
- **hlmInput class collisions with PRMS input styles** → keep PRMS classes; hlmInput adds border/focus utilities. Smoke-test to confirm no visual regression; if it clashes, prefer PRMS classes and drop hlmInput for a plain styled input.
- **primeicons vs PrimeNG** → primeicons is only an icon font (allowed); "0 PrimeNG" = no `primeng` component/module imports, which this achieves.

## Migration Plan

1. `ng g @spartan-ng/cli:ui input` (create components.json; add hlm-input).
2. pr-input: swap pInputText→hlmInput, p-message→div, p-inputNumber→native+format helpers in the `.ts`. Build.
3. pr-select: swap the search box to hlmInput + icon. Build.
4. Grep usages; drop now-unused PrimeNG modules from `custom-fields.module.ts` (only the truly-unused ones).
5. `build:dev` green; browser smoke (text/email/currency/select-search).
6. Doc + commit.

Rollback = revert this change's commit (facade preserved; consumers untouched).

## Open Questions

- Keep `pi pi-chevron-down`/`pi pi-search` (primeicons) or switch to `material-icons-round`? Default: switch pr-select's search icon to material-icons-round (project convention); leave chevron as-is to minimize churn.
