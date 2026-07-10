## 1. Add Spartan input primitive (frontend)

- [ ] 1.1 Add the Spartan `hlm-input` Helm component (`ng g @spartan-ng/cli:ui input`, creating `components.json`); note its import path

## 2. Migrate pr-input (frontend)

- [ ] 2.1 `pInputText` (text + email inputs) → native `<input hlmInput>`, keep PRMS classes/validation attrs
- [ ] 2.2 `p-message` (email error) → plain Tailwind/PRMS-styled `<div>` with the same required/valid-email messages
- [ ] 2.3 `p-inputNumber type=number` → native `<input type="number" [min]="0" hlmInput>` bound to the CVA value
- [ ] 2.4 `p-inputNumber type=currency` → native `<input type="text" hlmInput>` + `formatCurrency`/`parseCurrency` helpers in the `.ts` (Intl USD, format on blur, store number)
- [ ] 2.5 Build `pr-input` compiles; no `primeng` / `pInputText` / `p-inputNumber` / `p-message` left in its `.ts`/`.html`

## 3. Migrate pr-select (frontend)

- [ ] 3.1 Replace the search box (`p-iconfield` + `p-inputicon` + `pInputText`) with `<input hlmInput [(ngModel)]="searchText">` + a `material-icons-round` search icon
- [ ] 3.2 Confirm no `primeng` / `p-iconfield` / `p-inputicon` / `pInputText` left in `pr-select.component.html`; dropdown + filter behavior unchanged

## 4. Module cleanup (frontend)

- [ ] 4.1 Grep `src/` for each PrimeNG module's selectors; remove `InputTextModule`, `InputNumberModule`, `IconFieldModule`, `InputIconModule`, `MessageModule` from `custom-fields.module.ts` ONLY if no other declared component uses them (leave any still in use)

## 5. Verify (frontend)

- [ ] 5.1 `npm run build:dev` — green
- [ ] 5.2 `git diff --stat` — only pr-input/pr-select/custom-fields.module + new hlm-input; no consumer touched
- [ ] 5.3 Browser smoke (`npm start`): a text field, an email field (invalid → error), a currency field (`$` format on blur), and a select with search — all look/behave as before
- [ ] 5.4 Grep both components confirm ZERO PrimeNG (`grep -rE "primeng|pInputText|p-input|p-message|p-iconfield" pr-input/ pr-select/` → empty)

## 6. Documentation

- [ ] 6.1 Note the first migrated components + the currency blur-format delta in `docs/spartan-tailwind-foundation.md`
