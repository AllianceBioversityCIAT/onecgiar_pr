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

  it('renders the four summary cards', () => {
    const text = root().textContent || '';
    expect(text).toContain('Programs/Accelerators');
    expect(text).toContain('Areas of Work');
    expect(text).toContain('Total KPIs');
    expect(text).toContain('KPIs with Evidence');
  });

  describe('Total KPIs zero-target disclosure (KCR-R-2.1)', () => {
    const kpiCard = (): HTMLElement => {
      const heading = Array.from(root().querySelectorAll('span')).find(s => s.textContent?.trim() === 'Total KPIs');
      return heading!.closest('div.flex.flex-col') as HTMLElement;
    };
    const totalKpisFigure = (): HTMLElement => kpiCard().querySelector('.pr-figure') as HTMLElement;

    it('states planned and the plural exclusion', () => {
      render({ totalKpis: 9, reportedKpis: 1, plannedKpis: 11, zeroTargetKpis: 2 });
      expect(totalKpisFigure().textContent?.trim()).toBe('9');
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned · excludes 2 zero-target KPIs');
    });

    it('drops the excludes clause when nothing was excluded', () => {
      render({ totalKpis: 11, plannedKpis: 11, zeroTargetKpis: 0 });
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned');
    });

    it('uses the singular noun for exactly one zero-target KPI', () => {
      render({ totalKpis: 10, plannedKpis: 11, zeroTargetKpis: 1 });
      expect(totalKpisFigure().getAttribute('title')).toBe('11 planned · excludes 1 zero-target KPI');
    });

    it('omits the title when no planned figure is provided', () => {
      render({ totalKpis: 41, reportedKpis: 0 });
      expect(totalKpisFigure().getAttribute('title')).toBeNull();
    });
  });
});
