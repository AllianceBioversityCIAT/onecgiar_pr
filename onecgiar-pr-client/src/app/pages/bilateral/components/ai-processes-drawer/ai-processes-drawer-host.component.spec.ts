import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AiProcessesDrawerHostComponent } from './ai-processes-drawer-host.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiExpectations, normalizeListJob } from '../../bilateral-ai-job.model';
import { rawListJob } from '../../bilateral-ai-job.fixtures';

const DOCS_EXPECTATION: BilateralAiExpectations = { mix: 'documents', sampleSize: 12, p25Minutes: 2, p75Minutes: 5 };
const AUDIO_EXPECTATION: BilateralAiExpectations = { mix: 'audio', sampleSize: 8, p25Minutes: 6, p75Minutes: 14 };

/**
 * `AIQ-T-8` attempt 3 (Leader adjudication) — the DD-7 no-input wrapper. Binds every
 * `AiProcessesDrawerComponent` input from `BilateralAiService` (including `expectations`, missing
 * in attempt 2), owns the 1s elapsed tick only while mounted, and wires the presentational drawer's
 * outputs to the service/router (`way: 'ai'|'manual'` alongside `project`, also missing in attempt 2).
 */
describe('AiProcessesDrawerHostComponent', () => {
  let fixture: ComponentFixture<AiProcessesDrawerHostComponent>;
  let serviceStub: {
    jobs: ReturnType<typeof signal>;
    summary: ReturnType<typeof signal>;
    highlightJobId: ReturnType<typeof signal>;
    hasPolledOnce: ReturnType<typeof signal>;
    lastPollFailed: ReturnType<typeof signal>;
    drawerOpen: ReturnType<typeof signal>;
    retryJob: jest.Mock;
    loadAllDrafts: jest.Mock;
    expectations: jest.Mock;
  };
  let navigateSpy: jest.Mock;

  function mount(): void {
    serviceStub = {
      jobs: signal([]),
      summary: signal(null),
      highlightJobId: signal(null),
      hasPolledOnce: signal(false),
      lastPollFailed: signal(false),
      drawerOpen: signal(true),
      retryJob: jest.fn(),
      loadAllDrafts: jest.fn(),
      expectations: jest.fn(mix => of(mix === 'documents' ? DOCS_EXPECTATION : AUDIO_EXPECTATION)),
    };
    navigateSpy = jest.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [AiProcessesDrawerHostComponent],
      providers: [
        { provide: BilateralAiService, useValue: serviceStub },
        { provide: Router, useValue: { navigate: navigateSpy } },
        BilateralContextService,
      ],
    });
    fixture = TestBed.createComponent(AiProcessesDrawerHostComponent);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    jest.useRealTimers();
  });

  it('mounts the presentational drawer bound to the service signals', () => {
    mount();
    expect(fixture.nativeElement.querySelector('app-ai-processes-drawer')).toBeTruthy();
  });

  it('AIQ-R-9 B: subscribes to service.expectations for both mixes and binds the result', () => {
    mount();

    expect(serviceStub.expectations).toHaveBeenCalledWith('documents');
    expect(serviceStub.expectations).toHaveBeenCalledWith('audio');
    expect(fixture.componentInstance.expectations()).toEqual({
      documents: DOCS_EXPECTATION,
      audio: AUDIO_EXPECTATION,
    });
  });

  it('AIQ-R-9 B: a running card renders the real per-mix range, not the generic fallback', () => {
    mount();
    serviceStub.hasPolledOnce.set(true);
    serviceStub.jobs.set([normalizeListJob(rawListJob({ status: 'PROCESSING', stage: 'extracting', document_count: '1', audio_count: '0' }))]);
    fixture.detectChanges();

    const range = fixture.nativeElement.querySelector('[data-testid="ai-job-card-expected-range"]')?.textContent;
    expect(range).toContain('Usually 2–5 min');
    expect(range).not.toContain('This usually takes a few minutes');
  });

  it('AIQ-R-9 G: shows the skeleton until hasPolledOnce() flips true', () => {
    mount();
    expect(fixture.componentInstance.loading()).toBe(true);

    serviceStub.hasPolledOnce.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('AIQ-R-9 G: refreshError is true only when the last poll failed AND a list already existed', () => {
    mount();
    serviceStub.lastPollFailed.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.refreshError()).toBe(false); // no jobs yet — reads as empty, not refresh-error

    serviceStub.jobs.set([normalizeListJob(rawListJob({ status: 'PROCESSING' }))]);
    fixture.detectChanges();
    expect(fixture.componentInstance.refreshError()).toBe(true);
  });

  it(
    'AIQ-DD-9: owns a 1s elapsed tick only while mounted',
    fakeAsync(() => {
      mount();
      const initial = fixture.componentInstance.now();

      tick(3_000);
      expect(fixture.componentInstance.now()).toBeGreaterThan(initial);

      // `ngOnDestroy`'s `clearInterval` is what's under test: if it did not run, the pending
      // interval left in the `fakeAsync` zone after `fixture.destroy()` makes `tick()` below throw
      // "N periodic timer(s) still in the queue" instead of completing cleanly.
      fixture.destroy();
      tick(3_000);
    }),
  );

  it('retryJob delegates to the service', () => {
    mount();
    fixture.componentInstance.onRetryJob('job-1');
    expect(serviceStub.retryJob).toHaveBeenCalledWith('job-1');
  });

  it("AIQ-R-9 D: uploadDifferentFiles navigates to the JOB's own center create page with the project AND way: 'ai'", () => {
    mount();
    const job = normalizeListJob(rawListJob({ status: 'FAILED', center_acronym: 'ALLIANCE', project_id: '77' }));
    fixture.componentInstance.onUploadDifferentFiles(job);
    expect(navigateSpy).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'create'], { queryParams: { project: 77, way: 'ai' } });
  });

  it("AIQ-R-9 D: reportManually navigates with the project AND way: 'manual'", () => {
    mount();
    const job = normalizeListJob(rawListJob({ status: 'COMPLETED', result_count: '0', center_acronym: 'ALLIANCE', project_id: '88' }));
    fixture.componentInstance.onReportManually(job);
    expect(navigateSpy).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'create'], { queryParams: { project: 88, way: 'manual' } });
  });

  it('viewDrafts navigates to the drafts tab with ?job= and refreshes the draft list', () => {
    mount();
    const job = normalizeListJob(rawListJob({ status: 'COMPLETED', result_count: '2', center_acronym: 'ALLIANCE', job_id: 'j9' }));
    fixture.componentInstance.onViewDrafts(job);
    expect(serviceStub.loadAllDrafts).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/bilateral', 'ALLIANCE', 'drafts'], { queryParams: { job: 'j9' } });
  });

  it('closed → sets drawerOpen(false) on the service', () => {
    mount();
    fixture.componentInstance.onClosed();
    expect(serviceStub.drawerOpen()).toBe(false);
  });
});
