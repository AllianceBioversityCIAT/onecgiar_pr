import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { AiProcessesTriggerComponent } from './ai-processes-trigger.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { normalizeListJob } from '../../bilateral-ai-job.model';
import { rawListJob } from '../../bilateral-ai-job.fixtures';

/**
 * `AIQ-T-9` — the standalone trigger, in isolation (the shared/three-slot integration is covered by
 * `bilateral-page-header.component.spec.ts`). Uses the REAL `BilateralAiService` (same TestBed
 * shape as the header spec) rather than a mock: the trigger reads it directly, and its counts are
 * plain signal derivations worth exercising against the real shape.
 */
describe('AiProcessesTriggerComponent', () => {
  let fixture: ComponentFixture<AiProcessesTriggerComponent>;
  let service: BilateralAiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiProcessesTriggerComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AiProcessesTriggerComponent);
    service = TestBed.inject(BilateralAiService);
    fixture.detectChanges();
  });

  afterEach(() => {
    service.stopPolling();
  });

  const button = () => fixture.nativeElement.querySelector('[data-testid="ai-processes-trigger"]') as HTMLButtonElement;
  const badge = () => fixture.nativeElement.querySelector('[data-testid="ai-processes-trigger-badge"]') as HTMLElement | null;

  it('idle: no badge, quiet label, no counts in the accessible name', () => {
    expect(button().textContent?.trim()).toContain('AI processes');
    expect(badge()).toBeNull();
    expect(button().getAttribute('aria-label')).toBe('AI processes');
  });

  it('hides the visible word below 640px but keeps the full accessible name', () => {
    const label = fixture.nativeElement.querySelector('[data-testid="ai-processes-trigger-label"]') as HTMLElement;
    expect(label.classList).toContain('hidden');
    expect(label.classList).toContain('min-[640px]:inline');
    expect(button().getAttribute('aria-label')).toBe('AI processes');
  });

  it('working: badge = active (running + waiting) count, aria-label carries both counts', () => {
    service.jobs.set([
      normalizeListJob(rawListJob({ job_id: 'job-1', status: 'PROCESSING' })),
      normalizeListJob(rawListJob({ job_id: 'job-2', status: 'PENDING' })),
      normalizeListJob(rawListJob({ job_id: 'job-3', status: 'PENDING' })),
    ]);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('3');
    expect(button().getAttribute('aria-label')).toBe('AI processes: 1 running, 2 waiting');
  });

  it('working with only running jobs omits the waiting half of the accessible name', () => {
    service.jobs.set([normalizeListJob(rawListJob({ job_id: 'job-1', status: 'PROCESSING' }))]);
    fixture.detectChanges();

    expect(button().getAttribute('aria-label')).toBe('AI processes: 1 running');
  });

  it('done: success badge = unseen count, and opening the drawer clears it', () => {
    service.unseenFinishedIds.set(new Set(['job-1', 'job-2']));
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('2');
    expect(button().getAttribute('aria-label')).toBe('AI processes: 2 finished');

    button().click();
    fixture.detectChanges();

    expect(service.unseenFinishedIds().size).toBe(0);
    expect(service.drawerOpen()).toBe(true);
    expect(badge()).toBeNull();
  });

  it('working state wins over an unseen-finished badge when both are present', () => {
    service.jobs.set([normalizeListJob(rawListJob({ job_id: 'job-1', status: 'PROCESSING' }))]);
    service.unseenFinishedIds.set(new Set(['job-2']));
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe('1');
    expect(button().getAttribute('aria-label')).toBe('AI processes: 1 running');
  });

  it('reflects BilateralAiService.drawerOpen() through aria-expanded', () => {
    expect(button().getAttribute('aria-expanded')).toBe('false');

    service.drawerOpen.set(true);
    fixture.detectChanges();

    expect(button().getAttribute('aria-expanded')).toBe('true');
  });

  it('click calls BilateralAiService.openDrawer(), never HlmDialogService directly', () => {
    const openDrawerSpy = jest.spyOn(service, 'openDrawer');

    button().click();
    fixture.detectChanges();

    expect(openDrawerSpy).toHaveBeenCalledTimes(1);
  });

  it('schedules no timer of its own on mount', () => {
    jest.useFakeTimers();
    try {
      const before = jest.getTimerCount();
      const freshFixture = TestBed.createComponent(AiProcessesTriggerComponent);
      freshFixture.detectChanges();

      expect(jest.getTimerCount()).toBe(before);
    } finally {
      jest.useRealTimers();
    }
  });
});
