// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-R-6, BRT-AC-4, BRT-AC-5)
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-6, AC-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BilateralReviewKpisComponent } from './bilateral-review-kpis.component';

describe('BilateralReviewKpisComponent', () => {
  let fixture: ComponentFixture<BilateralReviewKpisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BilateralReviewKpisComponent] }).compileComponents();
    fixture = TestBed.createComponent(BilateralReviewKpisComponent);
  });

  function setKpis(kpis: { projects: number; centers: number; pending: number; approved: number; rejected: number }): void {
    fixture.componentRef.setInput('kpis', kpis);
    fixture.detectChanges();
  }

  function text(testId: string): string {
    return fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).nativeElement.textContent.trim();
  }

  it('renders the AC-4 fixture values (2 / 3 / 3 / 3, "2 approved · 1 rejected")', () => {
    setKpis({ projects: 2, centers: 3, pending: 3, approved: 2, rejected: 1 });

    expect(text('kpi-projects')).toBe('2');
    expect(text('kpi-centers')).toBe('3');
    expect(text('kpi-pending')).toBe('3');
    expect(text('kpi-decided')).toBe('3');
    expect(text('kpi-decided-sublabel')).toBe('2 approved · 1 rejected');
  });

  it('renders five all-distinct values without cross-slot collisions (KZ-KCR fixture rule)', () => {
    setKpis({ projects: 9, centers: 7, pending: 4, approved: 3, rejected: 2 });

    expect(text('kpi-projects')).toBe('9');
    expect(text('kpi-centers')).toBe('7');
    expect(text('kpi-pending')).toBe('4');
    expect(text('kpi-decided')).toBe('5');
    expect(text('kpi-decided-sublabel')).toBe('3 approved · 2 rejected');
  });

  it('marks the Pending card pressed only when pendingActive is true', () => {
    setKpis({ projects: 2, centers: 3, pending: 3, approved: 2, rejected: 1 });
    fixture.componentRef.setInput('pendingActive', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('[data-testid="kpi-pending-toggle"]')).nativeElement as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('emits togglePending when the Pending card is clicked', () => {
    setKpis({ projects: 2, centers: 3, pending: 3, approved: 2, rejected: 1 });
    const spy = jest.fn();
    fixture.componentInstance.togglePending.subscribe(spy);

    fixture.debugElement.query(By.css('[data-testid="kpi-pending-toggle"]')).nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders a skeleton instead of values while loading, with no disabled attributes anywhere', () => {
    setKpis({ projects: 0, centers: 0, pending: 0, approved: 0, rejected: 0 });
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="kpi-projects"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[disabled]'))).toBeNull();
  });

  it('BRP-AC-6: the HOST carries data-testid="bilateral-review-statbar" and all six figures render', () => {
    setKpis({ projects: 2, centers: 3, pending: 3, approved: 2, rejected: 1 });

    expect(fixture.nativeElement.getAttribute('data-testid')).toBe('bilateral-review-statbar');
    ['kpi-projects', 'kpi-centers', 'kpi-pending', 'kpi-pending-toggle', 'kpi-decided', 'kpi-decided-sublabel'].forEach(testId => {
      expect(fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))).not.toBeNull();
    });
  });
});
