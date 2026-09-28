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
import { RolesService } from '../../../../shared/services/global/roles.service';

/** A Center User assignment for ILRI — the centre every test below is opened as. */
const ILRI_MEMBER = { center_id: 'CENTER-ILRI', center_acronym: 'ILRI', role_id: 9 };

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
  let rolesServiceStub: { getMyCenters: jest.Mock; publishCenters: (centers: unknown[]) => void };

  beforeEach(async () => {
    aiServiceStub = {
      isPromoting: signal(false),
      getDraft: jest.fn(() => of({ response: draftStub } as never)),
      promoteDraft: jest.fn(),
      discardDraft: jest.fn(),
      projectNameMap: signal<Record<number, string>>({}),
    };
    // `ASC-T-5`: defaults to a Center User of the centre every existing test below opens as
    // (`ILRI`, set right after), so the pre-existing promote/discard assertions keep seeing the
    // controls rendered. The admin-non-member case overrides this per test via `publishCenters`,
    // which — like the real `RolesService` — bumps a signal-backed `rolesVersion` so the
    // component's computed actually recomputes (`roles` is a plain, non-reactive property on the
    // real service; a bare `mockReturnValue` alone would leave the computed's cached answer stale).
    const rolesVersionSignal = signal(0);
    const centersMock = jest.fn().mockReturnValue([ILRI_MEMBER]);
    rolesServiceStub = {
      getMyCenters: centersMock,
      get rolesVersion() {
        return rolesVersionSignal();
      },
      publishCenters(centers: unknown[]) {
        centersMock.mockReturnValue(centers);
        rolesVersionSignal.update(v => v + 1);
      },
    } as never;

    await TestBed.configureTestingModule({
      imports: [BilateralAiDraftDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        BilateralContextService,
        { provide: BilateralAiService, useValue: aiServiceStub },
        { provide: RolesService, useValue: rolesServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiDraftDetailComponent);
    component = fixture.componentInstance;
    TestBed.inject(BilateralContextService).setCenter('ILRI', 'International Livestock Research Institute');
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

  // `ASC-T-5` (`ASC-AC-13`, `ASC-R-15`): a platform admin who is not a Center User of the current
  // centre must never be offered Create Result / Discard here — the server 403s both anyway.
  describe('ASC-T-5 — Create Result / Discard hidden for a non-member admin', () => {
    /**
     * A real signal transition (not a same-value no-op) settles the FIRST transition off the
     * `beforeEach` "loading" render into the "draft" render — an existing framework quirk of this
     * exact component's plain (non-signal) `draft`/`error` fields, reproduced identically on the
     * unmodified pre-`ASC-T-5` component/template with no `isCenterMember` involved at all. Every
     * pre-existing test that renders the "draft" branch after construction already does this
     * (`aiServiceStub.isPromoting.set(true)`, see `disables the promote and discard buttons…`
     * above); these new cases just make that settle explicit and self-contained.
     */
    function settleDraftRender(): void {
      component.draft = draftStub;
      aiServiceStub.isPromoting.set(true);
      aiServiceStub.isPromoting.set(false);
      fixture.detectChanges();
    }

    it('renders both actions for a Center User of this centre (the default fixture)', () => {
      settleDraftRender();

      const actions = fixture.nativeElement.querySelector('.badd-actions');
      expect(actions).toBeTruthy();
      expect(actions.querySelector('.badd-btn--promote')).toBeTruthy();
      expect(actions.querySelector('.badd-btn--discard')).toBeTruthy();
    });

    it('ASC-AC-13 — hides both actions for an admin who is not a Center User of this centre', () => {
      rolesServiceStub.publishCenters([]);
      settleDraftRender();

      expect(component.isCenterMember()).toBe(false);
      expect(fixture.nativeElement.querySelector('.badd-actions')).toBeNull();
    });
  });
});
