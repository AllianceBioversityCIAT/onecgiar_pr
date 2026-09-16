import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { BilateralAiCompletionDialogComponent } from './bilateral-ai-completion-dialog.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiCompletionNotice } from '../../services/bilateral-ai.interfaces';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';

/**
 * The dialog is the ONLY in-app feedback for a finished AI job (2026-09-07), so what it renders
 * for each terminal state, and that its two buttons map to "stay" and "go", are pinned here.
 */
describe('BilateralAiCompletionDialogComponent', () => {
  let fixture: ComponentFixture<BilateralAiCompletionDialogComponent>;
  let completionNotice: ReturnType<typeof signal<BilateralAiCompletionNotice | null>>;
  let ai: { completionNotice: any; dismissCompletionNotice: jest.Mock; openDraftsFromNotice: jest.Mock };

  const text = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();
  const click = (testId: string) => ((fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click();

  beforeEach(async () => {
    completionNotice = signal<BilateralAiCompletionNotice | null>(null);
    ai = { completionNotice, dismissCompletionNotice: jest.fn(), openDraftsFromNotice: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [BilateralAiCompletionDialogComponent],
      providers: [{ provide: BilateralAiService, useValue: ai }]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiCompletionDialogComponent);
    fixture.detectChanges();
  });

  it('renders nothing while there is no notice', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-dialog')).toBeNull();
  });

  it('announces the drafts of the job\'s centre and offers to review them or to keep working', () => {
    completionNotice.set({ jobId: 'j1', centerAcronym: 'Bioversity (Alliance)', status: 'completed', resultCount: 3 });
    fixture.detectChanges();

    expect(text('ai-completion-header')).toContain('AI-assisted results are ready');
    expect(text('ai-completion-message')).toContain('3 result drafts were identified');
    expect(text('ai-completion-message')).toContain('Drafts list of Bioversity (Alliance)');
    expect(text('ai-completion-close')).toBe('Continue working');
    expect(text('ai-completion-review')).toBe('Review drafts');
  });

  it('uses the singular for one draft', () => {
    completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'completed', resultCount: 1 });
    fixture.detectChanges();
    expect(text('ai-completion-message')).toContain('1 result draft was identified');
  });

  it('"Continue working" dismisses and never navigates; "Review drafts" hands over to the service', () => {
    completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'completed', resultCount: 2 });
    fixture.detectChanges();

    click('ai-completion-close');
    expect(ai.dismissCompletionNotice).toHaveBeenCalledTimes(1);
    expect(ai.openDraftsFromNotice).not.toHaveBeenCalled();

    click('ai-completion-review');
    expect(ai.openDraftsFromNotice).toHaveBeenCalledTimes(1);
  });

  it('a job that found nothing says so and only offers Close — there are no drafts to review', () => {
    completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'completed_no_candidates', resultCount: 0 });
    fixture.detectChanges();

    expect(text('ai-completion-header')).toContain('AI-assisted processing finished');
    expect(text('ai-completion-message')).toContain('No drafts were created');
    expect(text('ai-completion-close')).toBe('Close');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="ai-completion-review"]')).toBeNull();
  });

  it('a failed job shows the server message and only offers Close', () => {
    completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'failed', resultCount: 0, errorMessage: 'Bad document' });
    fixture.detectChanges();

    expect(text('ai-completion-header')).toContain('AI-assisted processing failed');
    expect(text('ai-completion-message')).toBe('Bad document');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="ai-completion-review"]')).toBeNull();
  });

  // `APF-R-12` / `APF-DD-10` — one provenance line above the actions, success only (design.md
  // §6.2: "Adds the provenance line on success; unchanged otherwise").
  describe('AI provenance notice line (APF-R-12, APF-T-8)', () => {
    const provenance = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="ai-completion-provenance"]');

    it('shows the notice above the actions when the job completed with drafts', () => {
      completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'completed', resultCount: 2 });
      fixture.detectChanges();

      const el = provenance();
      expect(el).not.toBeNull();
      expect(el?.textContent).toContain(
        'Generated with AI assistance from your sources. Review and edit before submitting.',
      );
    });

    it('is absent when the job found no candidates', () => {
      completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'completed_no_candidates', resultCount: 0 });
      fixture.detectChanges();
      expect(provenance()).toBeNull();
    });

    it('is absent when the job failed', () => {
      completionNotice.set({ jobId: 'j1', centerAcronym: 'CIP', status: 'failed', resultCount: 0, errorMessage: 'Bad document' });
      fixture.detectChanges();
      expect(provenance()).toBeNull();
    });
  });
});

/**
 * `APF-AC-13` regression, through the REAL `BilateralAiService` rather than a stub — extends the
 * service-level coverage in `bilateral-ai.service.spec.ts` ("panelVisible" describe block) by
 * proving this DIALOG component, unchanged in its suppression wiring by the `APF-T-8` provenance
 * line, still renders nothing while the processing panel is the live outcome surface and renders
 * the notice (now including the provenance line) once the panel is not visible.
 */
describe('BilateralAiCompletionDialogComponent — APF-AC-13 regression (real BilateralAiService)', () => {
  let fixture: ComponentFixture<BilateralAiCompletionDialogComponent>;
  let service: BilateralAiService;
  let bilateralApi: any;

  const hasDialog = () => !!(fixture.nativeElement as HTMLElement).querySelector('app-pr-dialog');
  const hasProvenance = () => !!(fixture.nativeElement as HTMLElement).querySelector('[data-testid="ai-completion-provenance"]');

  /** Lets the `await toPromise()` inside `pollJob` settle. */
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

  beforeEach(async () => {
    bilateralApi = {
      GET_bilateralAiJob: jest
        .fn()
        .mockReturnValue(of({ response: { job_id: 'job-1', status: 'COMPLETED', stage: 'creating_drafts', created_date: new Date().toISOString(), result_count: 2, error_message: null, document_keys: ['a.pdf'], audio_keys: [] } })),
      GET_bilateralAiDrafts: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralAiCompletionDialogComponent],
      providers: [
        BilateralAiService,
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: ResultsApiService, useValue: { GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })), GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })) } },
        { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true), url: '/bilateral/ALLIANCE/create' } },
        { provide: BilateralContextService, useValue: { centerInstitutionId: signal<number | null>(null), centerAcronym: signal('ALLIANCE') } },
        { provide: BilateralCreationService, useValue: { isAiGenerated: signal(false) } },
        { provide: PrToastService, useValue: { add: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiCompletionDialogComponent);
    service = TestBed.inject(BilateralAiService);
    fixture.detectChanges();
  });

  afterEach(() => {
    service.stopPolling();
    localStorage.clear();
  });

  it('setPanelVisible(true): a terminal job stays silent — the panel is the live outcome surface', async () => {
    service.setPanelVisible(true);
    service.startJob('job-1');
    await flush();
    fixture.detectChanges();

    expect(hasDialog()).toBe(false);
  });

  it('setPanelVisible(false): a terminal job raises the dialog, with the provenance line', async () => {
    service.setPanelVisible(false);
    service.startJob('job-1');
    await flush();
    fixture.detectChanges();

    expect(hasDialog()).toBe(true);
    expect(hasProvenance()).toBe(true);
  });
});
