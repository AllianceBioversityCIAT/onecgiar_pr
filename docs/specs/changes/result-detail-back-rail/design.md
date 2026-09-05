# Design: Relocate "Back to results" to the Result Sections Sidebar Rail

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/result-detail-back-rail` |
| Module | `results` / `result-detail` |
| Sub-feature | `result-detail-back-rail` |
| Type | Change |
| Depth | Standard |
| Status | `draft` |
| Owner | Results & UX/UI Core Team |
| Requirements | `docs/specs/changes/result-detail-back-rail/requirements.md` (`RDBR-R-1`…`R-4`, `RDBR-AC-1`…`AC-6`) |

---

## 2. Architectural Overview

The Result Detail layout (`ResultDetailComponent`, `.rd_layout`) consists of two parallel columns:
1. **Secondary Navigation Rail (`app-result-sections-sidebar`):** A fixed 240px white column that owns its own viewport scrolling (`overflow-y: auto`).
2. **Form Content Canvas (`rd_scroll`):** A scrollable canvas containing `app-result-header`, `app-phase-switcher`, the section title, and the active section's form.

### Component Relationship Before vs After

```
BEFORE:
ResultDetailComponent
 ├── ResultSectionsSidebarComponent
 │    ├── Identity Block (code, type, status)
 │    ├── Sections Navigation
 │    └── Progress / Submit
 └── rd_scroll
      ├── ResultHeaderComponent
      │    ├── Back to results (data-testid="result-detail-back-link")  <-- SCROLLS AWAY
      │    └── Title / PDF / Options
      ├── PhaseSwitcherComponent
      └── Section Outlet

AFTER:
ResultDetailComponent
 ├── ResultSectionsSidebarComponent
 │    ├── Back to results (data-testid="result-detail-back-link")       <-- PERSISTENT AT TOP
 │    ├── Divider
 │    ├── Identity Block (code, type, status)
 │    ├── Sections Navigation
 │    └── Progress / Submit
 └── rd_scroll
      ├── ResultHeaderComponent
      │    └── Title / PDF / Options                                    <-- ELEVATED ~32px
      ├── PhaseSwitcherComponent
      └── Section Outlet
```

---

## 3. Component Details & Code Contracts

### 3.1 `ResultSectionsSidebarComponent`

#### Dependencies
Inject `SmartNavigationService`:
```typescript
import { isMyResultsTab, isProgrammeResultsTab, SmartNavigationService, splitNavUrl } from '../../../../../../shared/services/smart-navigation.service';

export class ResultSectionsSidebarComponent {
  private readonly smartNav = inject(SmartNavigationService);
  // ...
  
  get backLink(): string {
    return splitNavUrl(this.smartNav.getResultDetailBackTarget().url).path;
  }

  get backQueryParams(): Record<string, string> {
    return splitNavUrl(this.smartNav.getResultDetailBackTarget().url).queryParams;
  }

  get backTitle(): string {
    const url = this.smartNav.getResultDetailBackTarget().url;
    if (isProgrammeResultsTab(url)) return 'Back to programme results';
    if (isMyResultsTab(url)) return 'Back to My results';
    return 'Back to all results';
  }
}
```

#### DOM Template (`result-sections-sidebar.component.html`)
At the very top of `<aside class="... px-[20px] py-[24px]">`:
```html
<aside
  class="pr-light-scroll flex h-full w-[240px] shrink-0 flex-col overflow-y-auto border-r border-[var(--pr-border)] bg-white px-[20px] py-[20px]"
  data-testid="result-sections-sidebar">
  
  <!-- Way back anchor: relocated from result-header to provide persistent, zero-scroll return -->
  <div class="mb-[14px] flex shrink-0 items-center border-b border-[var(--pr-border)] pb-[12px]">
    <a
      [routerLink]="backLink"
      [queryParams]="backQueryParams"
      class="group inline-flex min-h-[32px] w-full items-center gap-[6px] rounded-[8px] px-[8px] py-[6px] -ml-[8px] text-[13px] font-medium text-[var(--pr-text-secondary)] no-underline transition-colors hover:bg-[var(--pr-color-primary-50)] hover:text-[var(--pr-color-primary-400)] focus-visible:ring-2 focus-visible:ring-[var(--pr-color-primary-300)] focus-visible:outline-none"
      [title]="backTitle"
      data-testid="result-detail-back-link">
      <i class="material-icons-round text-[16px] leading-none text-[var(--pr-text-muted)] transition-colors group-hover:text-[var(--pr-color-primary-400)]" aria-hidden="true">chevron_left</i>
      <span>Back to results</span>
    </a>
  </div>

  @if (sectionsSE.resultCode() || sectionsSE.resultTypeName() || sectionsSE.statusLabel()) {
    <div class="mb-[16px] flex shrink-0 flex-col gap-[6px] border-b border-[var(--pr-border)] px-[10px] pb-[16px]" data-testid="result-sections-identity">
      <!-- Result code, type, status -->
    </div>
  }
  ...
```

### 3.2 `ResultHeaderComponent`

#### DOM Template (`result-header.component.html`)
Remove the `<a data-testid="result-detail-back-link">...</a>` block completely:
```html
<header class="mb-[16px] flex w-full flex-col gap-[8px]" data-testid="result-header">
  <div class="flex items-start gap-[16px]">
    <div class="flex min-w-0 flex-1 items-start gap-[8px]">
      <h1
        class="m-0 line-clamp-2 min-w-0 text-pretty text-[20px] font-bold leading-[1.35] tracking-[-0.01em] text-[var(--pr-text-heading)]"
        [title]="title"
        data-testid="result-header-title">
        {{ title }}
      </h1>
      <!-- ⓘ meta popover, etc. -->
    </div>
    <!-- Export PDF, ⋮ action menu -->
  </div>
  <!-- Identity strip -->
</header>
```

#### TypeScript Cleanup (`result-header.component.ts`)
- Remove `backLink`, `backQueryParams`, `backTitle` getters from `ResultHeaderComponent`.
- Remove unused imports if `SmartNavigationService` is no longer needed in `ResultHeaderComponent` (checking if any other code in `ResultHeaderComponent` uses it; if not, remove cleanly).

---

## 4. Visual Design & Tokens

| Element | Specification | Design Token / Tailwind |
|---|---|---|
| Back Link Container | `mb-[14px] pb-[12px] border-b border-[var(--pr-border)]` | `--pr-border` |
| Interactive Hit Target | `min-h-[32px] px-[8px] py-[6px] -ml-[8px] rounded-[8px]` | Fitts's Law touch target |
| Typography | 13px, font-weight 500, leading-none | `--pr-font-size-base` |
| Default Color | Muted slate `#4b5563` | `var(--pr-text-secondary)` |
| Hover State | Purple tint bg `#f5f3ff`, purple text `#5733c4` | `--pr-color-primary-50` / `--pr-color-primary-400` |
| Icon | `chevron_left` 16px | Material Icons Round |
| Keyboard Focus | 2px solid ring | `--pr-color-primary-300` |

---

## 5. Test Strategy & Verification Plan

1. **Unit Tests in `result-sections-sidebar.component.spec.ts`:**
   - Verify `[data-testid="result-detail-back-link"]` is rendered at the top of the sidebar.
   - Verify `href` points to `/result/results-outlet/results-list` by default.
   - Verify `SmartNavigationService` mock scenarios:
     - When coming from My Results: `title` is `"Back to My results"`.
     - When coming from Programme Results: `title` is `"Back to programme results"`.
     - When coming from Results Center: `title` is `"Back to all results"`.
2. **Unit Tests in `result-header.component.spec.ts`:**
   - Remove legacy assertions checking `[data-testid="result-detail-back-link"]` in `ResultHeaderComponent`.
   - Verify header renders title `<h1>` cleanly without back link element.
3. **Regression Suite:**
   - Execute both test suites:
     `npx jest src/app/pages/results/pages/result-detail/components/result-header src/app/pages/results/pages/result-detail/components/result-sections-sidebar --silent --reporters=summary --no-coverage`
   - Run type checking:
     `npx tsc --noEmit -p tsconfig.app.json`
