import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BilateralAiDraftDetailComponent } from './bilateral-ai-draft-detail.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';

const draftStub = {
  id: 42,
  job_id: 'job-1',
  result_id: 900,
  candidate_index: 0,
  extracted_mds: { title: 'AI draft title' },
  candidate_snapshot: null,
  mapping_warnings: null,
  is_discarded: false,
  created_date: '2026-08-25T00:00:00.000Z',
  last_updated_date: '2026-08-25T00:00:00.000Z',
  job: {
    job_id: 'job-1',
    project_id: 1,
    program_code: 'SP1',
    document_keys: [],
    audio_keys: [],
    text_context: null,
  },
} as never;

describe('BilateralAiDraftDetailComponent', () => {
  let fixture: ComponentFixture<BilateralAiDraftDetailComponent>;
  let component: BilateralAiDraftDetailComponent;
  let aiServiceStub: {
    isPromoting: ReturnType<typeof signal<boolean>>;
    getDraft: jest.Mock;
    promoteDraft: jest.Mock;
    discardDraft: jest.Mock;
    projectNameMap: ReturnType<typeof signal<Record<number, string>>>;
  };

  beforeEach(async () => {
    aiServiceStub = {
      isPromoting: signal(false),
      getDraft: jest.fn(() => of({ response: draftStub } as never)),
      promoteDraft: jest.fn(),
      discardDraft: jest.fn(),
      projectNameMap: signal<Record<number, string>>({}),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralAiDraftDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        BilateralContextService,
        { provide: BilateralAiService, useValue: aiServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiDraftDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3437: a second promote replays the whole result-population step on the
  // server and then 404s, because the first one already flipped the draft to
  // discarded. One click, one promote.
  it('promotes only once even if confirm is clicked twice', () => {
    component.draft = draftStub;
    aiServiceStub.promoteDraft.mockImplementation(() =>
      aiServiceStub.isPromoting.set(true),
    );

    component.onPromoteConfirm();
    component.onPromoteConfirm();

    expect(aiServiceStub.promoteDraft).toHaveBeenCalledTimes(1);
  });

  it('does not discard while a promote is still in flight', () => {
    component.draft = draftStub;
    aiServiceStub.isPromoting.set(true);

    component.onDiscardConfirm();

    expect(aiServiceStub.discardDraft).not.toHaveBeenCalled();
  });

  it('disables the promote and discard buttons while promoting', () => {
    component.draft = draftStub;
    aiServiceStub.isPromoting.set(true);
    fixture.detectChanges();

    const promote: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.badd-actions .badd-btn--promote',
    );
    const discard: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.badd-actions .badd-btn--discard',
    );

    expect(promote.disabled).toBe(true);
    expect(discard.disabled).toBe(true);
    expect(promote.textContent).toContain('Creating');
  });
});
