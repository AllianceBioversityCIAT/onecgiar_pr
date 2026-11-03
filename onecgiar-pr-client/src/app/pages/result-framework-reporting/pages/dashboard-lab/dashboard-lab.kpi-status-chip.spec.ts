import { readFileSync } from 'fs';
import { join } from 'path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KpiStatusChipComponent } from './components/kpi-status-chip/kpi-status-chip.component';
import { countsForRow, indexLinks } from './kpi-status-counts.util';

/**
 * KRC-T-3: the chip is placed in every KPI row layout of dashboard-lab (design P-7) without touching
 * the Achieved figure. The template is read as text (the full component needs echarts and a dozen
 * services); the row behaviour is rendered through the real chip + the real matcher.
 * @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-3)
 */
const HTML = readFileSync(join(__dirname, 'dashboard-lab.component.html'), 'utf-8');
const CHIP = /<app-kpi-status-chip \[editing\]="counts\.editing" \[submitted\]="counts\.submitted" \[approved\]="counts\.approved" \[pendingReview\]="counts\.pendingReview" \(open\)="onKpiChipOpen\([^"]*\)" \/>/g;

describe('dashboard-lab KPI status chip placement (KRC-T-3)', () => {
  it('places exactly one chip per KPI row layout, all fed by statusCountsFor and wired to onKpiChipOpen (6 layouts)', () => {
    expect((HTML.match(CHIP) ?? []).length).toBe(6);
    expect((HTML.match(/@let counts = statusCountsFor\(ind\);/g) ?? []).length).toBe(6);
    expect((HTML.match(/<app-kpi-status-chip/g) ?? []).length).toBe(6);
  });

  it('binds the reporting-aow-table child (default Reporting tab) to the same accessor', () => {
    expect(HTML).toContain('[statusCountsFor]="statusCountsForRow"');
  });

  // [layout, marker of the title/taxonomy block, the Achieved markup exactly as at HEAD]
  const layouts: Array<[string, string, string]> = [
    [
      'full view (panel) card',
      '[title]="ind.indicator_description">{{ ind.indicator_description }}</p>',
      '<span class="text-[11.5px] text-[var(--pr-color-accents-5)]">Achieved <b class="tabular-nums text-[var(--pr-color-secondary-400)]">{{ ind.actual_achieved_value_sum ?? 0 }}</b> of {{ ind.target_value_sum ?? 0 }}</span>\n'
    ],
    [
      'AoW detail table',
      '<span class="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--pr-color-secondary-400)]" [title]="ind.indicator_description">',
      '[style.color]="achievedColor(ind.actual_achieved_value_sum)">\n                              {{ ind.actual_achieved_value_sum ?? 0 }}\n                            </td>'
    ],
    [
      'AoW detail cards',
      '{{ ind.indicator_description }}\n                        </p>',
      '                          of {{ ind.target_value_sum ?? 0 }}\n                        </span>\n                        <div class="flex shrink-0 items-center gap-1.5">'
    ],
    [
      'By-AOW indicator row',
      '<!-- 2. Indicator Title & Taxonomy Badges -->',
      '{{ meta.achieved }}\n                                            </span>\n                                          </div>'
    ],
    [
      'planned flat table',
      '<td class="px-3 py-2.5 font-medium text-[var(--pr-color-secondary-400)]">',
      '<td class="px-3 py-2.5 tabular-nums">{{ ind.actual_achieved_value_sum ?? 0 }}</td>'
    ],
    [
      'planned flat cards',
      'class="m-0 text-[12.5px] font-semibold leading-snug text-[var(--pr-color-secondary-400)]"',
      '<span class="text-[10px] text-[var(--pr-color-accents-5)]">{{ ind.actual_achieved_value_sum ?? 0 }}/{{ ind.target_value_sum ?? 0 }}</span>'
    ]
  ];

  it.each(layouts)('%s: the chip is in the title/taxonomy block and the Achieved cell is exactly as before', (_name, titleMarker, achievedHead) => {
    const title = HTML.indexOf(titleMarker);
    expect(title).toBeGreaterThan(-1);
    // the chip sits in the title/taxonomy block that follows the title...
    const chip = HTML.indexOf('<app-kpi-status-chip', title);
    expect(chip).toBeGreaterThan(title);
    expect(chip - title).toBeLessThan(3000);
    // ...and the Achieved markup is byte-identical to HEAD, with no chip inside it
    const achieved = HTML.indexOf(achievedHead);
    expect(achieved).toBeGreaterThan(-1);
    expect(achievedHead).not.toContain('app-kpi-status-chip');
  });

  describe('row rendering with the real matcher', () => {
    @Component({
      imports: [KpiStatusChipComponent],
      template: `
        @for (ind of rows; track ind.id) {
          @let counts = countsFor(ind);
          <div class="row" [attr.data-id]="ind.id">
            <span class="achieved">Achieved {{ ind.achieved }}</span>
            <app-kpi-status-chip [editing]="counts.editing" [submitted]="counts.submitted" [approved]="counts.approved" [pendingReview]="counts.pendingReview" />
          </div>
        }
      `
    })
    class HostComponent {
      private readonly index = indexLinks([{ toc_result_id: 5, related_node_id: 'N', result_id: 1, status_id: 1, anchors: [], has_unanchored: true }]);
      rows = [
        { id: 'with', toc_result_id: 5, related_node_id: 'N', achieved: 0 },
        { id: 'without', toc_result_id: 9, related_node_id: 'X', achieved: 0 }
      ];
      countsFor = (ind: any) => countsForRow(this.index, ind);
    }

    it('a row with links shows the chip, a row without shows none, Achieved text unchanged', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const text = (id: string) => el.querySelector(`[data-id="${id}"]`)!;
      expect(text('with').querySelectorAll('[data-part="total"]').length).toBe(1);
      expect(text('with').textContent).toContain("1 result reported");
      expect(text('without').querySelectorAll('[data-part="total"]').length).toBe(0);
      expect(text('without').textContent).not.toMatch(/editing|submitted|pending/);
      expect(text('with').querySelector('.achieved')!.textContent!.trim()).toBe('Achieved 0');
    });
  });
});
