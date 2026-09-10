import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingInsightsPanelComponent } from './reporting-insights-panel.component';

describe('ReportingInsightsPanelComponent', () => {
  let fixture: ComponentFixture<ReportingInsightsPanelComponent>;

  const stats = {
    programsCount: 1,
    aowsCount: 5,
    totalKpis: 415,
    reportedKpis: 2
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingInsightsPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingInsightsPanelComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('stats', stats);
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.detectChanges();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  it('renders nothing when closed', () => {
    expect(root().querySelector('[data-testid="reporting-insights-panel"]')).toBeNull();
  });

  it('renders the summary cards when open', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(root().querySelector('[data-testid="reporting-insights-panel"]')).toBeTruthy();
    expect(root().textContent).toContain('Reporting insights');
    expect(root().textContent).toContain('SP01');
    expect(root().textContent).toContain('Total KPIs');
    expect(root().querySelector('[data-testid="reporting-summary-stats"]')).toBeTruthy();
  });

  it('emits closed when the close button is clicked', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.closed.subscribe(spy);
    (root().querySelector('[data-testid="reporting-insights-close"]') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
