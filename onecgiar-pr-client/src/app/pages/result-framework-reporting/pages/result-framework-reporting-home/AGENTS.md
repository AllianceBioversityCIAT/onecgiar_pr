# AGENTS.md — `result-framework-reporting-home/`

> **Scope:** the `/result-framework-reporting/home` page — the **module landing page** with Science Program cards and a recent-activity feed.
> **Parent guide:** [`../../AGENTS.md`](../../AGENTS.md) (module root).

---

## 1. Purpose

For a logged-in user, this is the entry point to the module. It shows:

1. **Welcome banner** — "Welcome, {user_name}!" with a hero background image.
2. **Global alert area** — `app-alert-global-info` for app-wide announcements (release notes, maintenance windows, etc.).
3. **My Science Programs / Accelerators** — grid of SP cards the user is a member of.
4. **Other Science Programs / Accelerators** — grid of SPs the user is NOT a member of (read-only browse).
5. **Recent activity feed** — last N results created across the platform (right column on desktop, collapsed into the left column below 1115px).

Empty state for My SPs: an `app-alert-status` informing the user to contact their SP coordinator.

---

## 2. Files in this folder

```
result-framework-reporting-home/
├── result-framework-reporting-home.component.{ts,html,scss,spec.ts}
├── services/
│   └── result-framework-reporting-home.service.{ts,spec.ts}
└── components/
    ├── result-framework-reporting-card-item/
    │   └── result-framework-reporting-card-item.component.{ts,html,scss,spec.ts}
    └── result-framework-reporting-recent-item/
        └── result-framework-reporting-recent-item.component.{ts,html,scss,spec.ts}
```

---

## 3. State — `ResultFrameworkReportingHomeService`

Simplest service in the module. `providedIn: 'root'`. 5 signals + 2 methods.

```ts
@Injectable({ providedIn: 'root' })
export class ResultFrameworkReportingHomeService {
  api = inject(ApiService);

  recentActivityList      = signal<RecentActivity[]>([]);
  mySPsList               = signal<SPProgress[]>([]);
  otherSPsList            = signal<SPProgress[]>([]);
  isLoadingSPLists        = signal<boolean>(false);
  isLoadingRecentActivity = signal<boolean>(false);

  getRecentActivity() {
    this.isLoadingRecentActivity.set(true);
    this.api.resultsSE.GET_RecentActivity().subscribe(({ response }) => {
      this.recentActivityList.set(response);
      this.isLoadingRecentActivity.set(false);
    });
  }

  getScienceProgramsProgress() {
    this.isLoadingSPLists.set(true);
    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe(({ response }) => {
      this.mySPsList.set(response?.mySciencePrograms);
      this.otherSPsList.set(response?.otherSciencePrograms);
      this.isLoadingSPLists.set(false);
    });
  }
}
```

Both methods are **fire-and-forget** with optimistic loading flags. They do NOT show error toasts — error handling delegates to `GeneralInterceptorService.manageError()` at the global level.

---

## 4. API endpoints

| Verb | Path | Returns |
|---|---|---|
| GET | `api/results-framework-reporting/get/science-programs/progress` | `{ mySciencePrograms: SPProgress[], otherSciencePrograms: SPProgress[] }` |
| GET | `api/notification/recent-activity` | `RecentActivity[]` |

Both are fired from `ResultFrameworkReportingComponent.ngOnInit` (the module root component, not this page) to **pre-fetch** the data before the user lands here. By the time the Home component mounts, the signals are usually populated and skeletons skip.

---

## 5. Components

### 5.1 `ResultFrameworkReportingHomeComponent`

Standalone, OnPush. Imports: `CommonModule, ProgressBarModule, ResultFrameworkReportingCardItemComponent, ResultFrameworkReportingRecentItemComponent, SkeletonModule, CustomFieldsModule, AlertGlobalInfoModule`.

Layout (two-column grid, collapses at 1115px):

```
┌──────────────────────────────────────────┬───────────────┐
│ Welcome, <user_name>!                                    │
├──────────────────────────────────────────┼───────────────┤
│ ┌─Hero background banner────────────────┐│ Recent        │
│ │ "Your innovative digital reporting…"  ││ activity      │
│ └────────────────────────────────────────┘│ (10 rows)     │
│                                          │ - skeleton x10│
│ My SPs (2-column grid, min 315px)        │   on load     │
│ - SP card x N (with PNG icon + name)     │ - actual cards│
│ - Empty state alert (if list empty)      │   after fetch │
│                                          │               │
│ Other SPs (3-column grid above 1500px)   │               │
│ - SP card x N                            │               │
└──────────────────────────────────────────┴───────────────┘
```

Skeleton fallbacks:
- 2 skeletons for SP cards (`p-skeleton width="100%" height="136px"`).
- 10 skeletons for recent activity (`height="72px"`).

The two columns swap responsive class: `.responsive-down` (visible below 1115px) and `.responsive-right` (visible above 1115px).

### 5.2 `ResultFrameworkReportingCardItemComponent`

Standalone, OnPush, `RouterLink`. Imports `ProgressBarModule, RouterLink`.

```ts
@Input() item: SPProgress;
imageLoadError = signal(false);
```

Template:
- PNG icon at `/assets/result-framework-reporting/SPs-Icons/<initiativeCode>.png` (24×24).
- Signal-based fallback: on `(error)`, `imageLoadError.set(true)` → renders a placeholder div instead.
- Clicking the card routes to `/result-framework-reporting/entity-details/<initiativeCode>` via `routerLink`.
- Keyboard accessible: `(keydown.space)` and `(keydown.enter)` both trigger click.

**SGP-02 special case** (line 22 of `.component.html`):
```html
<h3>{{ (item?.initiativeId === 41 || item?.initiativeCode === 'SGP-02')
       ? (item?.initiativeShortName ?? item?.initiativeName)
       : item?.initiativeName }}</h3>
```

When the initiative is SGP-02 (matched by `initiativeId === 41` OR `initiativeCode === 'SGP-02'`), the card uses the short name instead of the full name (because SGP-02's official name is too long to fit). Note this only checks `'SGP-02'`, NOT `'SGP02'` — consistent with the `entity-details.component.ts:182` bug. Replicators should centralize this check.

### 5.3 `ResultFrameworkReportingRecentItemComponent`

Standalone, OnPush. Imports `FormatTimeAgoPipe, RouterLink, TooltipModule`.

```ts
@Input() item?: RecentActivity;

getResultUrl() {
  return `/result/result-detail/${this.item?.resultCode}/general-information`;
}
getTooltipText() {
  return `View result: ${this.item?.resultCode} - ${this.item?.resultTitle}`;
}
```

Template:
- Row layout: clock icon + result code + initiative name + time-ago (formatted via `FormatTimeAgoPipe`).
- Description text underneath.
- Clicking routes to `/result/result-detail/<resultCode>/general-information` with `[queryParams]="{ phase: item?.phase }"`.
- **`phase` query param is REQUIRED** — without it, the result-detail page falls back to the latest phase, which can confuse users expecting a specific reporting cycle.
- Tooltip via `pTooltip` shows the full result code + title.
- Keyboard accessible.

---

## 6. Behaviors / gotchas

1. **Prefetch from the module root component** — the data is loaded by `ResultFrameworkReportingComponent.ngOnInit` (the parent route component), NOT by this page's component. If you change the prefetch pattern, this page's skeletons will show for longer.

2. **No error toasts** — both `getRecentActivity` and `getScienceProgramsProgress` use only the `next` subscriber. Errors are swallowed at the local level and delegated to the global interceptor's `manageError`. If you want explicit error UI, add it here.

3. **Hero background image** — `assets/result-framework-reporting/header_img_v2.png` is hardcoded in SCSS as `background: url(...)`. The asset must exist in the new app or the hero is broken.

4. **SP icons fail gracefully** — each card tries to load `/assets/result-framework-reporting/SPs-Icons/<initiativeCode>.png`. If missing, the `(error)` event flips `imageLoadError` and a placeholder div renders. This means **you don't need to ship every SP icon** to avoid broken images; the fallback is automatic.

5. **`phase` query param on recent activity navigation** — easy to forget. If you reimplement the navigation, always append `?phase=<version_id>`.

6. **Responsive grid breakpoints**:
   - `< 1115px`: single column, recent activity moves above "Other SPs".
   - `> 1500px`: Other SPs grid becomes 3 columns fixed.
   - Between 1115 and 1500: Other SPs grid is `repeat(auto-fill, minmax(315px, 1fr))`.

7. **Empty state for My SPs** — when `mySPsList().length === 0`, an `app-alert-status` is shown spanning the grid (`grid-column: span 2`). The message instructs the user to contact their SP coordinator. If you want to customize the message, do it via `TerminologyService` (the project's i18n primitive).

---

## 7. Recommended tests

```ts
describe('ResultFrameworkReportingHomeService', () => {
  it('initializes recentActivityList, mySPsList, otherSPsList as empty arrays');
  it('initializes both isLoading* flags as false');
  it('getRecentActivity sets loading true, fetches, updates list, sets loading false');
  it('getScienceProgramsProgress splits response into mySPsList and otherSPsList');
  it('getScienceProgramsProgress handles missing response gracefully (no crash)');
});

describe('ResultFrameworkReportingCardItemComponent', () => {
  it('routes to /entity-details/<initiativeCode> on click');
  it('shows shortName for SGP-02 by initiativeCode');
  it('shows shortName for initiative with id 41');
  it('shows full name for other initiatives');
  it('imageLoadError flips to true on (error) event and renders placeholder');
  it('keydown.space and keydown.enter both trigger click');
});

describe('ResultFrameworkReportingRecentItemComponent', () => {
  it('getResultUrl returns the expected result-detail path');
  it('getTooltipText returns code + title');
  it('routerLink includes queryParams.phase from item');
  it('keyboard navigation triggers click');
});
```

Cypress E2E:
1. Land on Home, verify welcome banner with user name.
2. Verify SP cards render with icon (or placeholder fallback).
3. Click a SP card, verify navigation to `/entity-details/<code>`.
4. Click a recent activity item, verify navigation to result-detail with `?phase=`.
5. Verify responsive collapse below 1115px.

---

## 8. See also

- [`../../AGENTS.md`](../../AGENTS.md) — module root.
- [`../entity-details/AGENTS.md`](../entity-details/AGENTS.md) — next page in the user flow.
- [`../../result-framework-reporting.component.ts`](../../result-framework-reporting.component.ts) — root component that prefetches Home data.
