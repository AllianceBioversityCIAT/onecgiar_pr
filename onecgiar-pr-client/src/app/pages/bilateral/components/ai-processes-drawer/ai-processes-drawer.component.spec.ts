import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiProcessesDrawerComponent } from './ai-processes-drawer.component';
import { normalizeListJob, NormalizedBilateralAiListJob } from '../../bilateral-ai-job.model';
import { rawListJob } from '../../bilateral-ai-job.fixtures';

const BASE = '2026-09-15T10:00:00.000Z';

function job(overrides: Parameters<typeof rawListJob>[0]): NormalizedBilateralAiListJob {
  return normalizeListJob(rawListJob({ queue_entry_date: BASE, ...overrides }));
}

/**
 * `AIQ-T-8` — `ai-processes-drawer` group order/counts, empty-group hiding, skeleton, refresh-error,
 * empty state, live-region announcement, and the lanes strip's lane bars. No width/overflow/
 * animation assertion here (Disqualifier) — that is `AIQ-T-11` CT.
 *
 * Attempt 2 (a11y review): this component no longer owns any focus-trap/Escape/restore logic —
 * `AIQ-DD-7`'s decision (P-18 confirmed) is that CDK's real trap, exercised only by
 * `ai-processes-drawer.cy.ts` (the mocked `@spartan-ng/brain` under Jest cannot reproduce it), is
 * the ONE dialog mechanism, so there is no second Jest-testable trap here to assert on.
 */
describe('AiProcessesDrawerComponent', () => {
  let fixture: ComponentFixture<AiProcessesDrawerComponent>;

  function mount(jobs: NormalizedBilateralAiListJob[], extra: Partial<{ loading: boolean; refreshError: boolean; summary: { lanesTotal: number; lanesBusy: number; othersWaiting: number } | null }> = {}) {
    TestBed.configureTestingModule({ imports: [AiProcessesDrawerComponent] });
    fixture = TestBed.createComponent(AiProcessesDrawerComponent);
    fixture.componentRef.setInput('jobs', jobs);
    if (extra.loading !== undefined) fixture.componentRef.setInput('loading', extra.loading);
    if (extra.refreshError !== undefined) fixture.componentRef.setInput('refreshError', extra.refreshError);
    if (extra.summary !== undefined) fixture.componentRef.setInput('summary', extra.summary);
    fixture.detectChanges();
    return fixture;
  }

  function query(testId: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('groups Running / Waiting / Finished in order, with counts, and hides empty groups', () => {
    mount([
      job({ job_id: 'r1', status: 'PROCESSING' }),
      job({ job_id: 'w1', status: 'PENDING' }),
      job({ job_id: 'w2', status: 'PENDING' }),
      job({ job_id: 'f1', status: 'COMPLETED', result_count: '2' }),
    ]);

    const groups = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid^="ai-processes-drawer-group-"]')).map(
      el => (el as HTMLElement).getAttribute('data-testid'),
    );
    expect(groups).toEqual(['ai-processes-drawer-group-running', 'ai-processes-drawer-group-waiting', 'ai-processes-drawer-group-finished']);

    expect(query('ai-processes-drawer-group-running')?.textContent).toContain('1');
    expect(query('ai-processes-drawer-group-waiting')?.textContent).toContain('2');
    expect(query('ai-processes-drawer-group-finished')?.textContent).toContain('1');
  });

  it('hides a group entirely when it has no jobs', () => {
    mount([job({ job_id: 'r1', status: 'PROCESSING' })]);

    expect(query('ai-processes-drawer-group-running')).toBeTruthy();
    expect(query('ai-processes-drawer-group-waiting')).toBeFalsy();
    expect(query('ai-processes-drawer-group-finished')).toBeFalsy();
  });

  it('shows skeleton cards while the first list request is in flight', () => {
    mount([], { loading: true });

    expect(query('ai-processes-drawer-skeleton')).toBeTruthy();
    expect(query('ai-processes-drawer-empty')).toBeFalsy();
  });

  it('a refresh error keeps the last known list and shows a one-line notice', () => {
    mount([job({ job_id: 'r1', status: 'PROCESSING' })], { refreshError: true });

    expect(query('ai-processes-drawer-refresh-error')?.textContent).toContain("Couldn't refresh");
    expect(query('ai-processes-drawer-group-running')).toBeTruthy();
  });

  it('shows the empty state with a Start with evidence CTA when there are no jobs', () => {
    mount([]);

    expect(query('ai-processes-drawer-empty')).toBeTruthy();
    const startSpy = jest.fn();
    fixture.componentInstance.startWithEvidence.subscribe(startSpy);
    (query('ai-processes-drawer-start-with-evidence') as HTMLButtonElement).click();
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('AIQ-R-9 H: the live region announces a job moving from waiting to running', () => {
    mount([job({ job_id: 'j1', status: 'PENDING' })]);
    expect(query('ai-processes-drawer-live-region')?.textContent).toBe('');

    fixture.componentRef.setInput('jobs', [job({ job_id: 'j1', status: 'PROCESSING', project_name: 'P-1941' })]);
    fixture.detectChanges();

    expect(query('ai-processes-drawer-live-region')?.textContent).toContain('P-1941 moved to Running.');
  });

  it('AIQ-R-9 C: resolves the richer own_job_running copy from the running job in the same list, via waitReasonCopy', () => {
    mount([
      job({ job_id: 'run', status: 'PROCESSING', project_name: 'P-1941' }),
      job({ job_id: 'wait', status: 'PENDING', wait_reason: 'own_job_running' }),
    ]);

    const waitingCard = query('ai-processes-drawer-group-waiting');
    expect(waitingCard?.textContent).toContain('Starts when your job for P-1941 finishes');
  });

  it('AIQ-R-9 A: renders one lane bar per lane, the first lanesBusy of them busy', () => {
    mount([], { summary: { lanesTotal: 2, lanesBusy: 1, othersWaiting: 3 } });

    const bars = fixture.nativeElement.querySelectorAll('[data-testid="ai-processes-drawer-lane-bars"] > span');
    expect(bars.length).toBe(2);
    expect(query('ai-processes-drawer-lanes')?.textContent).toContain('1 of 2 lanes in use');
  });

  it('renders no lane bars when there is no summary yet', () => {
    mount([]);

    expect(fixture.nativeElement.querySelector('[data-testid="ai-processes-drawer-lane-bars"]')).toBeFalsy();
  });

  it('emits retryJob / viewDrafts / reportManually / uploadDifferentFiles bubbled from a card', () => {
    mount([job({ job_id: 'f1', status: 'FAILED', error_code: 'HTTP_502' })]);
    const retrySpy = jest.fn();
    fixture.componentInstance.retryJob.subscribe(retrySpy);

    const retryButton = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="ai-job-card-retry"]') as HTMLButtonElement;
    retryButton.click();

    expect(retrySpy).toHaveBeenCalledWith('f1');
  });
});
