# Previously Reported Result Badge — Design

## 1. Architectural Decisions

- **D1: Re-use existing `result.is_replicated` column.** No database migrations or schema alterations required.
- **D2: Server-side projection in list queries.**
  - Add `r.is_replicated,` to `onecgiar-pr-server/src/api/results/result.repository.ts` in `AllResultsByRoleUserAndInitiativeFiltered`.
  - Add `r.is_replicated,` to `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts` in `getAllInnovationPackages` and `getAllInnovationPackagesFiltered`.
- **D3: Client badge styling.**
  - Follow the pill badge standard established in `.rtu-badge` / `.new_tag`:
    - Background: `var(--pr-color-primary-100, #ede9fe)`
    - Color: `var(--pr-color-primary-700, #4c2882)`
    - Font size: `10px`, font-weight: `600` / `700`, uppercase/letter-spacing `0.02em`.
  - In `results-list.component.html`:
    Class `.rc-badge-replicated` inside `.rc-cell-link.rc-title` right before `span.rc-title__text`.
  - In `innovation-package-custom-table.component.html`:
    Inside `column.attr === 'title'`, add `.new_tag.prev-reported`.

---

## 2. Component & Template Changes

### 2.1 Results Center (`results-list`)
- In `results-list.component.html`:
```html
@if (subResult?.is_replicated) {
  <span
    class="rc-badge-replicated"
    prTooltip="Previously reported in an earlier phase"
    prTooltipPosition="top">Previously reported</span>
}
```
- In `results-list.component.scss`:
```scss
.rc-badge-replicated {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.02em;
  background: var(--pr-color-primary-100, #ede9fe);
  color: var(--pr-color-primary-700, #4c2882);
  white-space: nowrap;
}
```

### 2.2 Innovation Packages (`innovation-package-custom-table`)
- In `innovation-package-custom-table.component.html`:
```html
<div class="new_tag prev-reported" *ngIf="column.attr === 'title' && subResult?.is_replicated">Previously reported</div>
```
- In `innovation-package-custom-table.component.scss`:
```scss
.new_tag.prev-reported {
  background-color: var(--pr-color-primary-100, #ede9fe);
  color: var(--pr-color-primary-700, #4c2882);
}
```

---

## 3. Interface Update
- In `onecgiar-pr-client/src/app/shared/interfaces/current-result.interface.ts`:
  Verify `is_replicated?: number | boolean;` is accepted.
