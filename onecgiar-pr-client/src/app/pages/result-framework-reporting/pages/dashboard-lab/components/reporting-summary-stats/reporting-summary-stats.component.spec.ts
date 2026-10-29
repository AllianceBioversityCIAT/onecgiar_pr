import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ReportingSummaryStats,
  ReportingSummaryStatsComponent
} from './reporting-summary-stats.component';

describe('ReportingSummaryStatsComponent', () => {
  let fixture: ComponentFixture<ReportingSummaryStatsComponent>;

  const stats = (over: Partial<ReportingSummaryStats> = {}): ReportingSummaryStats => ({
    programsCount: 1,
    aowsCount: 5,
    totalKpis: 41,
    reportedKpis: 0,
    ...over
  });

  function render(over: Partial<ReportingSummaryStats> = {}, loading = false): void {
    fixture.componentRef.setInput('stats', stats(over));
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingSummaryStatsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingSummaryStatsComponent);
    render();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('uses a single column in panel variant', () => {
    fixture.componentRef.setInput('variant', 'panel');
    fixture.detectChanges();

    const grid = root().querySelector('[data-testid="reporting-summary-stats"] > div') as HTMLElement;
    expect(grid.className).toContain('grid-cols-1');
  });

  it('renders the four summary cards', () => {
    const text = root().textContent || '';
    expect(text).toContain('Programs/Accelerators');
    expect(text).toContain('Areas of Work');
    expect(text).toContain('Program areas of work');
    expect(text).not.toContain('work package');
    expect(text).toContain('Total KPIs');
    expect(text).toContain('KPIs with Evidence');
  });

  describe('Total KPIs no-target disclosure (KCR-R-2.1, KTO-R-6)', () => {
    const kpiCard = (): HTMLElement => {
      const heading = Array.from(root().querySelectorAll('span')).find(s => s.textContent?.trim() === 'Total KPIs');
      return heading!.closest('div.flex.flex-col') as HTMLElement;
    };
    const totalKpisFigure = (): HTMLElement => kpiCard().querySelector('.pr-figure') as HTMLElement;

    it('states planned and the plural exclusion', () => {
      render({ totalKpis: 11, targetedKpis: 9, reportedKpis: 1, plannedKpis: 11, zeroTargetKpis: 2 });
      expect(totalKpisFigure().textContent?.trim()).toBe('11');
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned · excludes 2 KPIs with no target set');
    });

    it('drops the excludes clause when nothing was excluded', () => {
      render({ totalKpis: 11, plannedKpis: 11, zeroTargetKpis: 0 });
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned');
    });

    it('uses the singular noun for exactly one KPI with no target set', () => {
      render({ totalKpis: 11, targetedKpis: 10, plannedKpis: 11, zeroTargetKpis: 1 });
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned · excludes 1 KPI with no target set');
    });

    it('omits the title when no planned figure is provided', () => {
      render({ totalKpis: 41, reportedKpis: 0 });
      expect(totalKpisFigure().getAttribute('title')).toBeNull();
    });
  });

  describe('KPIs with Evidence reads the targeted set (KTO-DD-3, KTO-R-2, KTO-R-3)', () => {
    const evidenceCard = (): HTMLElement => {
      const heading = Array.from(root().querySelectorAll('span')).find(s => s.textContent?.trim() === 'KPIs with Evidence');
      return heading!.closest('div.flex.flex-col') as HTMLElement;
    };

    it('shows reported of targeted and a percentage over targeted, never over the planned total (10 of 50, 20%)', () => {
      render({ totalKpis: 54, targetedKpis: 50, reportedKpis: 10, plannedKpis: 54, zeroTargetKpis: 4 });
      const text = evidenceCard().textContent!.replace(/\s+/g, '');
      expect(text).toContain('10of50');
      expect(text).toContain('20%withreportedresults');
      expect(text).not.toContain('of54');
    });

    it('renders a dash, never "0 of 0", when no KPI has a target', () => {
      render({ totalKpis: 6, targetedKpis: 0, reportedKpis: 0, plannedKpis: 6, zeroTargetKpis: 6 });
      const text = evidenceCard().textContent!.replace(/\s+/g, '');
      expect(text).toContain('—');
      expect(text).not.toContain('0of0');
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('0%with');
    });

    it('falls back to totalKpis as the denominator when a caller omits targetedKpis', () => {
      render({ totalKpis: 8, reportedKpis: 2 });
      expect(evidenceCard().textContent!.replace(/\s+/g, '')).toContain('2of8');
    });
  });
});
