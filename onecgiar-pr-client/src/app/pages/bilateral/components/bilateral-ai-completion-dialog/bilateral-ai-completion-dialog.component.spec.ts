import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BilateralAiCompletionDialogComponent } from './bilateral-ai-completion-dialog.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiCompletionNotice } from '../../services/bilateral-ai.interfaces';

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
});
