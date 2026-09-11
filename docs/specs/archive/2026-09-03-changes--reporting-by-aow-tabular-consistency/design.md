# Module Spec — Technical Design: Reporting By-AoW View Tabular Layout & HLO/Outcomes Consistency

- **Module:** `result-framework-reporting`
- **Feature:** `reporting-by-aow-tabular-consistency`
- **Owner:** Frontend Engineering / Design Team
- **Status:** `in-review`
- **Approval Mode:** `gated`
- **Branch:** `qa-development-2026`
- **Requirements:** `docs/specs/changes/reporting-by-aow-tabular-consistency/requirements.md`

---

## 1. Architectural Strategy

The Result Framework Reporting tab provides two primary navigation paradigms:
1. **All Areas of Work (`tocView=aows`):** Managed by `<app-reporting-aow-table>`, utilizing a strict 8-column CSS Grid (`$pr-reporting-tracks`) where headers, HLO summary nodes, and indicator rows align to identical tracks.
2. **By Area of Work (`tocView=byAow`):** Managed in `dashboard-lab.component.html`, focusing on a single Area of Work with an introductory context banner, followed by `High Level Outputs` and `Outcomes` sections.

Prior to this design, the By-AoW view used ad-hoc flexbox rows with inline textual labels (`TARGET: 112`, `ACHIEVED: 0`), resulting in ragged vertical alignment. Additionally, outcome titles were not parsed for code prefixes, leaving them unbadged.

This design establishes structural and visual alignment between the two views by introducing:
- **Unified regex parsing** for HLO and Outcome codes across both controllers.
- A **dedicated 6-column CSS Grid specification** (`$pr-by-aow-tracks`) for the By-AoW tier.
- A **table column header** (`.pr-by-aow-head`) providing column semantics.
- Clean stacked numeric cells for Target, Achieved, KPIs, and Progress.

---

## 2. Component Design Details

### BTC-DD-1: Regex Parsing & Title Sanitization

#### In `dashboard-lab.component.ts`:
```ts
/**
 * Helper to extract a clean HLO or Outcome code token (e.g. 'HLO4', 'HL013', 'I-OC 3.5', 'OC 3.1')
 * for By-AOW group headers (BTC-R-1, BTC-AC-1.1).
 */
cleanHloCode(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Match I-OC / OC with optional space and dotted numbers: e.g. "I-OC 3.5.", "OC 2.1", "I-OC3.5"
  const iocMatch = /^((?:I-OC|OC)\s*\d+(?:\.\d+)*)\.?/i.exec(trimmed);
  if (iocMatch) {
    return iocMatch[1].toUpperCase().replace(/\s+/, ' ');
  }
  const match = /^((?:HLO|HL|IO|EOI)[\w.\-]*)/i.exec(trimmed);
  if (!match) return '';
  const rawCode = match[1];
  const codeMatch = /^(HLO\d+|IO\d+|EOI\d+|HL\d+)/i.exec(rawCode);
  return codeMatch ? codeMatch[1].toUpperCase() : rawCode.split('.')[0].toUpperCase();
}

/**
 * Split an HLO or Outcome group title into code + name. Handles:
 *   "I-OC 3.5. Women, men..."          → I-OC 3.5      | Women, men...
 *   "HLO4.AOW1.IO1 Foster motivations" → HLO4.AOW1.IO1 | Foster motivations
 *   "HL013 Power seed scaling"         → HL013         | Power seed scaling
 *   "2.2.2: Policy engagement…"        → 2.2.2         | Policy engagement…
 */
splitGroupTitle(title: string | null | undefined): { code: string | null; name: string } {
  const text = String(title ?? '').trim();
  const prefixed = /^((?:HLO|HL|I-OC|OC|IO|EOI)(?:[-\s]?\d[\w.\-]*)?)\.?\s*[-–:]?\s+(.+)$/i.exec(text);
  if (prefixed) {
    return { code: prefixed[1].trim(), name: prefixed[2].trim() };
  }
  const numeric = /^([\d.]+)\s*[:–-]\s*(.+)$/.exec(text);
  if (numeric) {
    return { code: numeric[1].trim(), name: numeric[2].trim() };
  }
  return { code: null, name: text };
}
```

#### In `reporting-aow-table.component.ts`:
Update `cleanHloCode()` and `clusterByTitle()` with identical `(?:HLO|HL|I-OC|OC|IO|EOI)` pattern matching.

---

### BTC-DD-2: CSS Grid Tracks Specification

In `dashboard-lab.component.scss`:

```scss
/* ── By-AoW View Tabular Layout (BTC-R-2) ──
   6-column grid: [Chevron 28px] [Title 1fr] [Target 76px] [Achieved 76px] [KPIs 64px] [Progress 130px] */
$pr-by-aow-tracks: 28px minmax(240px, 1fr) 76px 76px 64px 130px;
$pr-by-aow-gap: 12px;
$pr-by-aow-pad: 8px 16px;

.pr-by-aow-head {
  display: grid;
  grid-template-columns: $pr-by-aow-tracks;
  align-items: center;
  gap: $pr-by-aow-gap;
  height: 32px;
  padding: 0 16px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pr-text-muted);
  user-select: none;
  box-sizing: border-box;
  min-width: 680px;
}

.pr-by-aow-row {
  display: grid;
  grid-template-columns: $pr-by-aow-tracks;
  align-items: center;
  gap: $pr-by-aow-gap;
  min-height: 48px;
  padding: $pr-by-aow-pad;
  box-sizing: border-box;
  width: 100%;
  min-width: 680px;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--pr-color-primary-300);
    outline-offset: -2px;
  }
}
```

---

### BTC-DD-3: Template Architecture (`dashboard-lab.component.html`)

Inside `@for (sec of plannedByAowSections(); track sec.label)`:

```html
<div class="flex flex-col gap-[8px]">
  <!-- Section Title & Expand/Collapse All -->
  <div class="flex items-center justify-between gap-[8px] pt-1">
    <div class="flex items-center gap-[8px]">
      <span class="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--pr-color-accents-5)]">{{ sec.label }}</span>
      <span class="font-mono text-[11px] font-semibold text-[var(--pr-color-accents-4)]">{{ sec.kpis }} KPIs</span>
    </div>
    @if (sec.groups.length > 0) {
      <button
        type="button"
        class="inline-flex items-center gap-[4px] rounded-[6px] border border-transparent bg-transparent px-[8px] py-[2px] text-[11px] font-semibold text-[var(--pr-color-primary-600)] transition-colors hover:bg-[var(--pr-color-primary-50)] hover:text-[var(--pr-color-primary-700)] cursor-pointer"
        [attr.aria-expanded]="isByAowSectionAllExpanded(sec)"
        (click)="toggleByAowSection(sec)">
        <span class="material-icons-round text-[15px]" aria-hidden="true">
          {{ isByAowSectionAllExpanded(sec) ? 'unfold_less' : 'unfold_more' }}
        </span>
        <span>{{ isByAowSectionAllExpanded(sec) ? 'Collapse all' : 'Expand all' }}</span>
      </button>
    }
  </div>

  <!-- Table Container (Horizontal scroll on narrow viewports) -->
  <div class="overflow-x-auto">
    <!-- Table Column Header -->
    <div class="pr-by-aow-head" aria-hidden="true">
      <span></span>
      <span>{{ sec.label === 'High Level Outputs' ? 'High-Level Output' : 'Outcome' }}</span>
      <span class="text-center">Target</span>
      <span class="text-center">Achieved</span>
      <span class="text-center">KPIs</span>
      <span class="text-center">Progress</span>
    </div>

    <!-- Rows List -->
    <div class="flex flex-col gap-[8px]">
      @for (hlo of sec.groups; track hlo.title) {
        <section class="overflow-hidden rounded-xl border border-[var(--pr-border)] bg-white shadow-xs transition-shadow hover:shadow-sm">
          <button
            type="button"
            (click)="togglePlannedHlo(hlo.title)"
            [attr.aria-expanded]="isPlannedHloExpanded(hlo.title)"
            class="pr-by-aow-row group/hlo border-l-[3px] cursor-pointer transition-all duration-150"
            [class.border-l-[var(--pr-color-primary-400)]]="isPlannedHloExpanded(hlo.title)"
            [class.bg-[var(--pr-color-primary-25)]]="isPlannedHloExpanded(hlo.title)"
            [class.border-l-transparent]="!isPlannedHloExpanded(hlo.title)"
            [class.bg-white]="!isPlannedHloExpanded(hlo.title)"
            [class.hover:bg-[var(--pr-surface-subtle)]]="!isPlannedHloExpanded(hlo.title)">
            
            <!-- 1. Expand/Collapse Chevron -->
            <span
              class="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-200"
              [class.border-[var(--pr-color-primary-200)]]="isPlannedHloExpanded(hlo.title)"
              [class.bg-white]="isPlannedHloExpanded(hlo.title)"
              [class.text-[var(--pr-color-primary-600)]]="isPlannedHloExpanded(hlo.title)"
              [class.shadow-xs]="isPlannedHloExpanded(hlo.title)"
              [class.border-[var(--pr-border)]]="!isPlannedHloExpanded(hlo.title)"
              [class.bg-[var(--pr-surface-card)]]="!isPlannedHloExpanded(hlo.title)"
              [class.text-[var(--pr-text-secondary)]]="!isPlannedHloExpanded(hlo.title)">
              <span
                class="material-icons-round text-[18px] transition-transform duration-200"
                [class.rotate-180]="isPlannedHloExpanded(hlo.title)"
                aria-hidden="true">expand_more</span>
            </span>

            <!-- 2. Code Badge + Title -->
            <div class="flex min-w-0 items-center gap-[6px]">
              @if (cleanHloCode(hlo.split.code || hlo.title)) {
                <span
                  class="pr-hlo-code inline-flex shrink-0 items-center justify-center rounded-[5px] border border-purple-200/70 bg-purple-100/80 px-[6px] py-[1px] font-mono text-[11px] font-bold text-purple-800">
                  {{ cleanHloCode(hlo.split.code || hlo.title) }}
                </span>
              }
              <span
                class="min-w-0 flex-1 truncate text-[13.5px] sm:text-[14px] font-bold tracking-[-0.01em] text-[var(--pr-text-heading)] group-hover/hlo:text-[var(--pr-color-primary-600)] transition-colors"
                [title]="hlo.split.name">
                <span [innerHTML]="hlo.split.name | highlightSearch: plannedSearch()"></span>
              </span>
            </div>

            <!-- 3. Target (Stacked) -->
            <div class="text-center">
              <span class="block text-[13px] font-bold tabular-nums text-[var(--pr-text-heading)]">
                {{ hloTargetSum(hlo) }}
              </span>
              <span class="block text-[9px] font-medium uppercase tracking-[0.04em] text-[var(--pr-text-subtle)]">
                Target
              </span>
            </div>

            <!-- 4. Achieved (Stacked) -->
            <div class="text-center">
              <span class="block text-[13px] font-bold tabular-nums text-[var(--pr-color-green-500)]">
                {{ hloAchievedSum(hlo) }}
              </span>
              <span class="block text-[9px] font-medium uppercase tracking-[0.04em] text-[var(--pr-text-subtle)]">
                Achieved
              </span>
            </div>

            <!-- 5. KPIs Count Pill -->
            <div class="flex items-center justify-center">
              <span
                class="inline-flex items-center justify-center rounded-full px-[8px] py-[2px] text-[11px] tabular-nums border transition-colors min-w-[28px]"
                [class.bg-white]="isPlannedHloExpanded(hlo.title)"
                [class.text-[var(--pr-color-primary-600)]]="isPlannedHloExpanded(hlo.title)"
                [class.border-[var(--pr-color-primary-200)]]="isPlannedHloExpanded(hlo.title)"
                [class.font-bold]="isPlannedHloExpanded(hlo.title)"
                [class.shadow-xs]="isPlannedHloExpanded(hlo.title)"
                [class.bg-[var(--pr-surface-card)]]="!isPlannedHloExpanded(hlo.title)"
                [class.text-[var(--pr-text-secondary)]]="!isPlannedHloExpanded(hlo.title)"
                [class.border-[var(--pr-border)]]="!isPlannedHloExpanded(hlo.title)"
                [class.font-semibold]="!isPlannedHloExpanded(hlo.title)">
                {{ hlo.count }}
              </span>
            </div>

            <!-- 6. Progress (QA % & Prel %) -->
            <div class="min-w-0">
              @if (hlo.achievement) {
                <div
                  class="flex flex-col items-center justify-center text-center leading-tight"
                  [prTooltip]="achievementTooltip(hlo.achievement, 'indicators')"
                  prTooltipPosition="top">
                  <span class="text-[12px] font-bold tabular-nums text-[var(--pr-text-heading)] whitespace-nowrap">
                    <span class="text-[9.5px] font-medium uppercase text-[var(--pr-text-subtle)] mr-[2px]">QA</span>{{ achievementLabel(hlo.achievement) }}
                  </span>
                  <span class="text-[11px] font-semibold tabular-nums text-[var(--pr-text-secondary)] whitespace-nowrap">
                    <span class="text-[9px] font-medium uppercase text-[var(--pr-text-subtle)] mr-[2px]">Prel.</span>{{ preliminaryAchievementLabel(hlo.achievement) }}
                  </span>
                </div>
              }
            </div>
          </button>

          <!-- Expanded Indicators -->
          @if (isPlannedHloExpanded(hlo.title)) { ... }
        </section>
      }
    </div>
  </div>
</div>
```

---

## 3. Responsive Ladder

| Breakpoint | Layout Behavior |
|---|---|
| **≥ 1024px** | Full 6-column grid with table header (`.pr-by-aow-head`), stacked target/achieved metrics, and progress. |
| **768px – 1023px** | Grid tracks preserved with full numeric readability. Container scrolls horizontally if viewport drops below 680px. |
| **< 768px** | `.pr-by-aow-head` hidden (`hidden md:grid`). Row cards scroll horizontally (`overflow-x-auto`) preserving column integrity without clipping. |
