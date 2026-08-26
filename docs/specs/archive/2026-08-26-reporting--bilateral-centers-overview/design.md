# Module Spec — `design.md`

## 1. Summary

This design replaces the static "Bilateral contributions" card (Card 5) on the Science Program Overview tab with a responsive, reactive horizontal bar distribution: **"Centers with reported W3/bilateral results"**.

The solution is purely frontend: `DashboardLabComponent` groups the already-fetched `bilateralRows()` by `lead_center` in a `computed()` signal, and passes it to `<app-program-overview>`, which renders each Center with a normalized horizontal bar, acronym, and count.

- **Requirements Document:** [`requirements.md`](./requirements.md)
- **Status:** approved
- **Approval Mode:** auto-approved (pre-approved mode: user instructed "quiero que tu tomes la desicion de diseño")
- **Budget:** 2 tasks, ~60 LOC, 1 review round.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Server modules touched:** None. `GET /api/results/by-program-and-centers?programId=<code>` already returns `lead_center` on every result.
- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.spec.ts`

### 2.2 Component Data Flow

```
[Overview Tab Activation]
       │
       ▼
DashboardLabComponent.loadBilateralRows(code)
       │
       ├──► GET /api/results/by-program-and-centers?programId=SP04
       │      └── Response contains results with `lead_center` (e.g. "CIAT", "IRRI")
       │
       ▼
bilateralRows.set(...)
       │
       ├──► computed: overviewBilateralCenters()
       │      └── Aggregates by `lead_center`, sorts descending by count
       │
       ▼
<app-program-overview [bilateralCenters]="overviewBilateralCenters()">
       │
       ├──► computed: bilateralCentersMax() -> Math.max(...counts)
       ├──► centerWidth(bar) -> (bar.count / max) * 100%
       │
       ▼
[Card 5 Template]
       ├── Header: "Centers with reported W3/bilateral results"
       ├── Subtitle: "Centers reporting W3 and bilateral results for this program"
       └── For each Center: [Acronym] [Horizontal Bar] [Count]
```

---

## 3. Component Architecture & Interface Extensions

### 3.1 Type Definition (`OverviewCenterBar`)

```typescript
export interface OverviewCenterBar {
  name: string;   // Center acronym (e.g., 'CIAT', 'CIMMYT') or 'Not specified'
  count: number;  // Number of reported bilateral results
}
```

### 3.2 `ProgramOverviewComponent` Inputs & Computeds

- **Input:**
  `readonly bilateralCenters = input<OverviewCenterBar[]>([]);`
  (replaces `readonly bilateralRoles = input<OverviewBilateralRoleRow[]>([]);`)
- **Computed:**
  `readonly bilateralCentersMax = computed(() => { ... });`
- **Method:**
  `centerWidth(bar: OverviewCenterBar): number` — computes `(bar.count / max) * 100%`.

### 3.3 `DashboardLabComponent` Computed Signal

- Replaces `overviewBilateralRoles` with:
  ```typescript
  readonly overviewBilateralCenters = computed<OverviewCenterBar[]>(() => {
    const rows = this.bilateralRows();
    if (!rows.length) return [];
    const byCenter = new Map<string, number>();
    for (const row of rows) {
      const center = row.lead_center?.trim() || 'Not specified';
      byCenter.set(center, (byCenter.get(center) ?? 0) + 1);
    }
    return [...byCenter.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });
  ```

---

## 4. UI/UX Design Decisions (`BIL-DD`)

### `BIL-DD-1`: Card Layout and Visual Track
- **Decision:** Use the horizontal progress bar pattern established in Card 2 and Card 3.
- **Tokens:**
  - Track background: `var(--pr-border-divider)`
  - Bar fill: `var(--pr-chart-2)` (`#8b7cc4`) — identical to the bilateral results by category card.
  - Heading: `var(--pr-text-heading)`
  - Label: `var(--pr-text)`
  - Figures: `var(--pr-text-heading)`, `font-semibold`, `text-[14px]`.
- **Rationale:** Ensures visual symmetry across the grid (Cards 2, 3, and 5 harmonize with horizontal bars).

### `BIL-DD-2`: Title and Subtitle Wording
- **Title:** `Centers with reported W3/bilateral results`
- **Subtitle:** `Centers reporting W3 and bilateral results for this program`
- **Rationale:** Follows user directive while maintaining sentence case and clear domain context.

### `BIL-DD-3`: Empty State
- When `bilateralCenters().length === 0`:
  Render `<p class="m-0 text-[14px] font-normal text-[var(--pr-text-muted)]">No centers have reported bilateral results for this program yet.</p>`.

---

## 5. Testing & Verification Strategy

1. **Unit Test (`program-overview.component.spec.ts`):**
   - Update 6-card heading assertion to expect `'Centers with reported W3/bilateral results'`.
   - Test that Center bars render acronyms, calculated widths, and counts.
   - Test that empty centers list renders the fallback message and does not divide by zero.
2. **Unit Test (`dashboard-lab.component.spec.ts`):**
   - Verify `overviewBilateralCenters` aggregates multiple results under the same `lead_center` and sorts descending.
3. **Lint Verification:**
   - Run `ng lint` in `onecgiar-pr-client` to ensure zero lint errors.
