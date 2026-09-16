import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiProcessingPanelComponent } from './ai-processing-panel.component';
import { errorCopy, normalizeJob, RawBilateralAiJob } from '../../bilateral-ai-job.model';
import {
  FIXTURE_COMPLETED,
  FIXTURE_COMPLETED_NO_CANDIDATES,
  FIXTURE_FAILED_TIMED_OUT,
  FIXTURE_FAILED_UNMAPPED,
  FIXTURE_PENDING_WITH_POSITION,
  FIXTURE_PROCESSING_EXTRACTING,
  FIXTURE_PROCESSING_UPLOADING,
  FIXTURE_PROCESSING_VALIDATING,
  FIXTURE_RETRYING,
  rawJob,
} from '../../bilateral-ai-job.fixtures';
import { BilateralAiExpectations } from '../../bilateral-ai-job.model';
import { BilateralAiUploadState } from '../../services/bilateral-ai.interfaces';

describe('AiProcessingPanelComponent', () => {
  let fixture: ComponentFixture<AiProcessingPanelComponent>;
  let component: AiProcessingPanelComponent;

  const mount = (job: RawBilateralAiJob | null, status: BilateralAiUploadState['status'], expectation: BilateralAiExpectations | null = null) => {
    fixture = TestBed.createComponent(AiProcessingPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('job', job ? normalizeJob(job) : null);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('expectation', expectation);
    fixture.componentRef.setInput('now', new Date('2026-09-15T10:02:00.000Z').getTime());
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiProcessingPanelComponent],
    }).compileComponents();
  });

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('APF-AC-8: queued state renders position, elapsed and the fallback range with no sample history', () => {
    mount(FIXTURE_PENDING_WITH_POSITION, 'pending');

    expect(text()).toContain('2 jobs ahead of you');
    expect(text()).toContain('waiting for a free AI worker');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-elapsed"]').textContent.trim()).toBe('02:00');
    expect(text()).toContain('This usually takes a few minutes; audio takes longer');
  });

  it('APF-AC-8: queued state renders the served expectation range once sampleSize >= 5', () => {
    mount(FIXTURE_PENDING_WITH_POSITION, 'pending', { mix: 'documents', sampleSize: 8, p25Minutes: 3, p75Minutes: 7 });

    expect(text()).toContain('Usually 3–7 min once processing starts');
  });

  it('APF-AC-9: processing state renders the active step label with its "estimated" caption, no percentage, and the source mix', () => {
    mount(FIXTURE_PROCESSING_EXTRACTING, 'processing');

    expect(text()).toContain('Extracting results (estimated)');
    expect(text()).toContain('1 document');
    expect(text()).toContain('1 audio file');
    expect(text()).not.toContain('%');
    expect(fixture.nativeElement.querySelector('progress')).toBeNull();
  });

  it('reviewer issue 3: the source mix is stated exactly once, not duplicated between the sub-line and the meta row', () => {
    mount(FIXTURE_PROCESSING_EXTRACTING, 'processing');

    const full = text();
    const occurrences = (full.match(/1 audio file/g) ?? []).length;
    expect(occurrences).toBe(1);
    // The sub-line under the heading is stage prose, not the mix, for a non-retrying, non-queued job.
    const subLine = fixture.nativeElement.querySelector('[data-testid="ai-panel-announce"] p').textContent as string;
    expect(subLine).toContain('Processing your sources.');
    expect(subLine).not.toContain('document');
  });

  it('reviewer issue 2: estimated steps carry a short grid label plus a separate "estimated" caption, observed steps carry neither', () => {
    mount(FIXTURE_PROCESSING_EXTRACTING, 'processing');

    const items = Array.from(fixture.nativeElement.querySelectorAll('li')) as HTMLElement[];
    expect(items.length).toBe(6);
    // The 6 grid cells never carry the long sentence-style label.
    for (const item of items) {
      expect(item.textContent).not.toContain('AI service');
    }
    // Exactly the 2 estimated steps (reading/transcribing, extracting) get the caption.
    expect(fixture.nativeElement.querySelectorAll('[data-testid="ai-panel-step-estimated"]').length).toBe(2);
    const extractingItem = items.find(i => i.textContent?.includes('Extracting')) as HTMLElement;
    expect(extractingItem.querySelector('[data-testid="ai-panel-step-estimated"]')).toBeTruthy();
    const validatingItem = items.find(i => i.textContent?.includes('Validating')) as HTMLElement;
    expect(validatingItem.querySelector('[data-testid="ai-panel-step-estimated"]')).toBeNull();
  });

  it('APF-AC-9: an observed (non-estimated) stage renders without the "estimated" caption', () => {
    mount(FIXTURE_PROCESSING_VALIDATING, 'processing');

    // Scoped to the active-step heading — the full stepper legitimately lists OTHER steps
    // (reading/transcribing, extracting) that are estimated regardless of the active one.
    const heading = fixture.nativeElement.querySelector('h3').textContent as string;
    expect(heading).toContain('Validating and mapping');
    expect(heading).not.toContain('estimated');
  });

  it('APF-AC-10: retrying renders the attempt badge and the last error in plain words', () => {
    mount(FIXTURE_RETRYING, 'processing');

    expect(text()).toContain('Retrying');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-attempt-badge"]').textContent.trim()).toBe('(attempt 2 of 3)');
    const lastError = fixture.nativeElement.querySelector('[data-testid="ai-panel-last-error"]').textContent as string;
    expect(lastError).toContain(errorCopy('HTTP_503').message);
    // Plain words, never the raw server message.
    expect(lastError).not.toContain('Bad gateway from the mining service');
  });

  it('the attempt badge also shows on a later, non-retrying attempt (attempts > 1)', () => {
    mount(rawJob({ status: 'PROCESSING', stage: 'extracting', attempts: '2', max_attempts: '3', retrying: 0, queue_position: null }), 'processing');

    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-attempt-badge"]').textContent.trim()).toBe('(attempt 2 of 3)');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-last-error"]')).toBeNull();
  });

  it('APF-R-7: still running never says "timed out" and keeps ticking the elapsed clock', () => {
    mount(FIXTURE_PROCESSING_EXTRACTING, 'still_running');

    expect(text()).toContain('Still running');
    expect(text()).toContain("notify you here and by email");
    expect(text().toLowerCase()).not.toContain('timed out');
    expect(text().toLowerCase()).not.toContain('failed');
  });

  it('APF-AC-14: a mapped error code renders its plain-words message, never the raw server text', () => {
    mount(FIXTURE_FAILED_TIMED_OUT, 'failed');

    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-failed-message"]').textContent).toContain(
      errorCopy('TIMED_OUT').message,
    );
    expect(text()).not.toContain('from the mining service');
  });

  it('APF-AC-14: an unmapped error code renders the default arm, not an empty block', () => {
    mount(FIXTURE_FAILED_UNMAPPED, 'failed');

    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-failed-message"]').textContent).toContain('HTTP_418');
  });

  it('APF-AC-15: "Try again" is enabled once the job is actually terminal', () => {
    mount(FIXTURE_FAILED_TIMED_OUT, 'failed');

    const tryAgain = Array.from(fixture.nativeElement.querySelectorAll('button')).find(b => (b as HTMLElement).textContent?.trim() === 'Try again') as HTMLButtonElement;
    expect(tryAgain.disabled).toBe(false);
  });

  it('APF-AC-15: "Try again" is disabled while the underlying job is still alive', () => {
    // A deliberately inconsistent fixture (job still PROCESSING) proves the guard reads job
    // status directly rather than trusting the branch it renders in.
    mount(rawJob({ status: 'PROCESSING', error_code: 'TIMED_OUT' }), 'failed');

    const tryAgain = Array.from(fixture.nativeElement.querySelectorAll('button')).find(b => (b as HTMLElement).textContent?.trim() === 'Try again') as HTMLButtonElement;
    expect(tryAgain.disabled).toBe(true);
  });

  it('APF-AC-12: completed renders the draft count and the AI provenance line', () => {
    mount(FIXTURE_COMPLETED, 'completed');

    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-completed-title"]').textContent).toContain('3 result drafts are ready');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-provenance"]').textContent).toContain(
      'Generated with AI assistance from your sources. Review and edit before submitting.',
    );
  });

  it('completed with zero drafts renders the no-candidates outcome, not the success one', () => {
    mount(FIXTURE_COMPLETED_NO_CANDIDATES, 'completed_no_candidates');

    expect(text()).toContain('No result candidates found');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-completed-title"]')).toBeNull();
  });

  it('the aria-live region text changes when the stage changes, in place — no skeleton, no re-mount', () => {
    mount(FIXTURE_PROCESSING_UPLOADING, 'processing');
    const region = fixture.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.textContent).toContain('Uploading your sources to the AI service');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-preparing"]')).toBeNull();

    fixture.componentRef.setInput('job', normalizeJob(FIXTURE_PROCESSING_EXTRACTING));
    fixture.detectChanges();

    expect(region.textContent).toContain('Extracting results (estimated)');
    // Same live element re-used — never removed and replaced with a loading frame.
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).toBe(region);
  });

  it('APF-AC-8: a queue-position refresh re-renders the number in place, no skeleton/loading node appears', () => {
    mount(FIXTURE_PENDING_WITH_POSITION, 'pending');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-live"]')).toBeTruthy();

    fixture.componentRef.setInput('job', normalizeJob({ ...FIXTURE_PENDING_WITH_POSITION, queue_position: '1' }));
    fixture.detectChanges();

    expect(text()).toContain('1 job ahead of you');
    expect(fixture.nativeElement.querySelector('.pr-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-preparing"]')).toBeNull();
  });

  it('every action renders as a named <button>', () => {
    mount(FIXTURE_COMPLETED, 'completed');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect((button.textContent ?? '').trim().length).toBeGreaterThan(0);
    }
  });

  it('emits retry / reset / openDrafts on the corresponding actions', () => {
    mount(FIXTURE_FAILED_TIMED_OUT, 'failed');
    const retrySpy = jest.fn();
    const resetSpy = jest.fn();
    component.retry.subscribe(retrySpy);
    component.resetUpload.subscribe(resetSpy);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Try again')!.click();
    buttons.find(b => b.textContent?.trim() === 'Upload different files')!.click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('emits openDrafts from the completed outcome "Review drafts" action', () => {
    mount(FIXTURE_COMPLETED, 'completed');
    const openDraftsSpy = jest.fn();
    component.openDrafts.subscribe(openDraftsSpy);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(b => b.textContent?.trim() === 'Review drafts')!.click();

    expect(openDraftsSpy).toHaveBeenCalledTimes(1);
  });

  it('renders a safe placeholder before the first poll response lands (job still null)', () => {
    mount(null, 'pending');
    expect(fixture.nativeElement.querySelector('[data-testid="ai-panel-preparing"]')).toBeTruthy();
    expect(text()).not.toContain('%');
  });
});
