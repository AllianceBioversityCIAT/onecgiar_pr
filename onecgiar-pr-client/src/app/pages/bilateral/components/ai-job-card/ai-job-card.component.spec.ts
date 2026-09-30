import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiJobCardComponent } from './ai-job-card.component';
import { normalizeListJob, waitReasonCopy } from '../../bilateral-ai-job.model';
import { rawListJob } from '../../bilateral-ai-job.fixtures';

/** `queue_entry_date` every fixture below is pinned to, so `now` fully controls elapsed time. */
const BASE = '2026-09-15T10:00:00.000Z';
const BASE_MS = new Date(BASE).getTime();

/**
 * `AIQ-T-8` — `ai-job-card` DOM per variant, from real-shape fixtures (`rawListJob`: string ids,
 * `retrying: 1`, per `tasks.md` `AIQ-T-8` Tests bullet). No Jest assertion on widths/overflow/
 * `animation-name` here — that is `AIQ-T-11` CT (Disqualifier).
 */
describe('AiJobCardComponent', () => {
  let fixture: ComponentFixture<AiJobCardComponent>;

  function mount(overrides: Parameters<typeof rawListJob>[0], now = BASE_MS + 5 * 60_000) {
    TestBed.configureTestingModule({ imports: [AiJobCardComponent] });
    fixture = TestBed.createComponent(AiJobCardComponent);
    fixture.componentRef.setInput('job', normalizeListJob(rawListJob({ queue_entry_date: BASE, ...overrides })));
    fixture.componentRef.setInput('now', now);
    fixture.detectChanges();
    return fixture;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function query(testId: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  }

  it('running: shows the card, no percentage, no ETA regex', () => {
    mount({ status: 'PROCESSING', stage: 'extracting', document_count: '1', audio_count: '0' });

    expect(query('ai-job-card-running')).toBeTruthy();
    expect(text()).not.toContain('%');
    expect(text()).not.toMatch(/\b(in|starts in|about)\s+~?\d+\s*(s|sec|min)/i);
  });

  it('AIQ-R-9 B: running elapsed reads from started_date, not queue_entry_date, once the server has set it', () => {
    // queue_entry_date is 10 min before started_date — if elapsed used queue_entry_date it would
    // read 15:00 here instead of 05:00.
    mount({
      status: 'PROCESSING',
      stage: 'extracting',
      queue_entry_date: '2026-09-15T09:50:00.000Z',
      started_date: BASE,
    });

    expect(query('ai-job-card-elapsed')?.textContent).toContain('05:00');
  });

  it('running elapsed falls back to queue_entry_date while started_date is not set yet', () => {
    mount({ status: 'PROCESSING', stage: 'queued', started_date: null });

    expect(query('ai-job-card-elapsed')?.textContent).toContain('05:00');
  });

  it('still_running: past the client ceiling, calm styling, "Checking every 30 seconds", no percentage/ETA', () => {
    mount({ status: 'PROCESSING', stage: 'validating' }, BASE_MS + 35 * 60_000);

    expect(query('ai-job-card-still_running')).toBeTruthy();
    expect(query('ai-job-card-still-running-notice')?.textContent).toContain('Still working');
    expect(query('ai-job-card-checking-interval')?.textContent).toContain('Checking every 30 seconds');
    expect(text()).not.toContain('%');
    expect(text()).not.toMatch(/\b(in|starts in|about)\s+~?\d+\s*(s|sec|min)/i);
  });

  it('waiting: shows the reason and position, no ETA regex, no percentage', () => {
    mount({ status: 'PENDING', wait_reason: 'no_free_lane', jobs_ahead: '4' });
    fixture.componentRef.setInput('waitReasonText', waitReasonCopy('no_free_lane'));
    fixture.detectChanges();

    expect(query('ai-job-card-waiting')).toBeTruthy();
    expect(query('ai-job-card-position')?.textContent?.trim()).toBe('4 ahead');
    expect(query('ai-job-card-wait-reason-text')?.textContent).toContain('Waiting for a free lane');
    expect(text()).not.toContain('%');
    expect(text()).not.toMatch(/\b(in|starts in|about)\s+~?\d+\s*(s|sec|min)/i);
  });

  it('waiting: "Next" when jobs_ahead is 0', () => {
    mount({ status: 'PENDING', wait_reason: 'starting', jobs_ahead: '0' });

    expect(query('ai-job-card-position')?.textContent?.trim()).toBe('Next');
  });

  it('waiting: renders whatever waitReasonText the host resolved (own_job_running + project name)', () => {
    mount({ status: 'PENDING', wait_reason: 'own_job_running', jobs_ahead: '0' });
    fixture.componentRef.setInput('waitReasonText', waitReasonCopy('own_job_running', 'P-1941'));
    fixture.detectChanges();

    expect(query('ai-job-card-wait-reason-text')?.textContent).toContain('Starts when your job for P-1941 finishes');
  });

  it('retrying: shows "Attempt 2 of 3", the retrying explanation, and a Last error line', () => {
    mount({ status: 'PROCESSING', stage: 'queued', attempts: '2', max_attempts: '3', retrying: 1, error_code: 'HTTP_503' });

    expect(query('ai-job-card-attempt-badge')?.textContent?.trim()).toBe('Attempt 2 of 3');
    expect(query('ai-job-card-retrying-explanation')?.textContent).toContain('queued again automatically');
    expect(query('ai-job-card-last-error')?.textContent).toContain('Last error:');
  });

  it('completed with drafts: shows the count, the center acronym, the "took" line, the provenance notice and a View drafts button', () => {
    mount({
      status: 'COMPLETED',
      result_count: '4',
      center_acronym: 'ALLIANCE',
      started_date: '2026-09-15T10:00:00.000Z',
      completed_date: '2026-09-15T10:01:52.000Z',
    });

    expect(query('ai-job-card-completed')).toBeTruthy();
    expect(text()).toContain('4 drafts ready');
    expect(query('ai-job-card-center-acronym')?.textContent).toContain('ALLIANCE');
    expect(query('ai-job-card-took')?.textContent).toContain('took 1 min 52 s');
    expect(query('ai-job-card-finished-at')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-ai-provenance-notice')).toBeTruthy();
    expect(query('ai-job-card-view-drafts')?.textContent).toContain('View 4 drafts');
  });

  it('completed with zero drafts: no-candidates copy and Report manually, no provenance notice', () => {
    mount({ status: 'COMPLETED', result_count: '0' });

    expect(query('ai-job-card-no_candidates')).toBeTruthy();
    expect(text()).toContain('No results found in this evidence');
    expect(fixture.nativeElement.querySelector('app-ai-provenance-notice')).toBeFalsy();
    expect(query('ai-job-card-report-manually')?.textContent).toContain('Report manually');
  });

  it('failed: renders the plain-language reason, the action label, and an enabled Try again (the job is terminal)', () => {
    mount({ status: 'FAILED', error_code: 'HTTP_502' });

    expect(query('ai-job-card-failed')).toBeTruthy();
    expect(query('ai-job-card-failure-message')?.textContent).toContain('temporarily unavailable');
    expect(query('ai-job-card-failure-action')?.textContent).toContain('Try again later');
    const retry = query('ai-job-card-retry') as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
  });

  it('AIQ-R-9 D: "Try again" guard reads job status directly, not the branch it renders in', () => {
    mount({ status: 'FAILED', error_code: 'HTTP_502' });
    expect(fixture.componentInstance.isJobAlive()).toBe(false);

    fixture.componentRef.setInput('job', normalizeListJob(rawListJob({ status: 'PROCESSING' })));
    fixture.detectChanges();
    expect(fixture.componentInstance.isJobAlive()).toBe(true);
  });

  it('AIQ-R-8 D: the highlight cue is not color-only — a ring, visually-hidden text and aria-current', () => {
    mount({ status: 'PROCESSING', stage: 'extracting' });
    fixture.componentRef.setInput('highlighted', true);
    fixture.detectChanges();

    const card = query('ai-job-card-running') as HTMLElement;
    expect(card.classList.contains('ring-2')).toBe(true);
    expect(card.getAttribute('aria-current')).toBe('true');
    expect(query('ai-job-card-highlight-text')?.textContent).toContain('Opened from link');
  });

  it('a highlighted RUNNING card is visually distinct from a plain running card (not the same class set)', () => {
    mount({ status: 'PROCESSING', stage: 'extracting' });
    const plainClasses = (query('ai-job-card-running') as HTMLElement).className;

    fixture.componentRef.setInput('highlighted', true);
    fixture.detectChanges();
    const highlightedClasses = (query('ai-job-card-running') as HTMLElement).className;

    expect(highlightedClasses).not.toBe(plainClasses);
  });

  it('emits retry/uploadDifferentFiles on the failed card', () => {
    mount({ status: 'FAILED', error_code: 'HTTP_502' });
    const retrySpy = jest.fn();
    const uploadSpy = jest.fn();
    fixture.componentInstance.retry.subscribe(retrySpy);
    fixture.componentInstance.uploadDifferentFiles.subscribe(uploadSpy);

    (query('ai-job-card-retry') as HTMLButtonElement).click();
    (query('ai-job-card-upload-different-files') as HTMLButtonElement).click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
    expect(uploadSpy).toHaveBeenCalledTimes(1);
  });

  it('emits viewDrafts on the completed-with-drafts card', () => {
    mount({ status: 'COMPLETED', result_count: '2' });
    const viewDraftsSpy = jest.fn();
    fixture.componentInstance.viewDrafts.subscribe(viewDraftsSpy);
    (query('ai-job-card-view-drafts') as HTMLButtonElement).click();
    expect(viewDraftsSpy).toHaveBeenCalledTimes(1);
  });

  it('emits reportManually on the no-candidates card', () => {
    mount({ status: 'COMPLETED', result_count: '0' });
    const reportSpy = jest.fn();
    fixture.componentInstance.reportManually.subscribe(reportSpy);
    (query('ai-job-card-report-manually') as HTMLButtonElement).click();
    expect(reportSpy).toHaveBeenCalledTimes(1);
  });
});
