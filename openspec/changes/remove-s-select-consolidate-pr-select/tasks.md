## 1. pr-select — restore consumer overlay styling (fixes Knowledge Products regression)

- [x] 1.1 Add `readonly optionsInlineStyles = input<string>('')` to `pr-select.component.ts`
- [x] 1.2 Apply it to the dropdown panel only when not `overlayToBody`: `[style]="overlayToBody() ? overlayStyles() : optionsInlineStyles()"`

## 2. Migrate the single s-select consumer to pr-select

- [x] 2.1 In `innovation-packages-notification.component.html`, replace `<app-s-select [options]="this.initiativesByPortfolio" ...>` with `<app-pr-select [options]="this.initiativesByPortfolio()" ...>` (array value, not Signal ref)
- [x] 2.2 Remove the stale commented-out `app-pr-select` block; keep `[(ngModel)]="initiativeIdFilter"`, `optionLabel`/`optionValue`, `isStatic`, `required`, `placeholder`

## 3. Delete s-select

- [x] 3.1 Remove `SSelectComponent` import + `fieldComponents` entry from `custom-fields.module.ts`
- [x] 3.2 Delete `s-select.component.ts`, `.html`, `.scss`, `.spec.ts`
- [x] 3.3 Grep the client for `SSelectComponent` / `app-s-select` — zero remaining references

## 4. Gates

- [x] 4.1 `npm run build:dev` — strict templates + all consumers PASS
- [x] 4.2 `npm run test` for `pr-select` + `innovation-packages-notification` — green (14/14)
- [ ] 4.3 Manual QA: IPSR notifications Entity filter; Admin Knowledge Products phase dropdown positioning
