import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ResultSectionsService, SECTIONS_INCOMPLETE_TOOLTIP } from './result-sections.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { SubmissionModalService } from '../submission-modal/submission-modal.service';
import { UnsubmitModalService } from '../unsubmit-modal/unsubmit-modal.service';

describe('ResultSectionsService', () => {
  let service: ResultSectionsService;
  let dataControl: any;
  let fieldsManager: any;
  let greenChecks: any;
  let roles: any;
  let aiReview: any;
  let api: any;
  let submissionModal: any;
  let unsubmitModal: any;

  const build = () => {
    TestBed.configureTestingModule({
      providers: [
        ResultSectionsService,
        { provide: DataControlService, useValue: dataControl },
        { provide: FieldsManagerService, useValue: fieldsManager },
        { provide: GreenChecksService, useValue: greenChecks },
        { provide: RolesService, useValue: roles },
        { provide: AiReviewService, useValue: aiReview },
        { provide: ApiService, useValue: api },
        { provide: SubmissionModalService, useValue: submissionModal },
        { provide: UnsubmitModalService, useValue: unsubmitModal }
      ]
    });
    service = TestBed.inject(ResultSectionsService);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    dataControl = {
      currentResult: { result_code: '1234', version_id: 7, result_type_id: 1, status_id: 1, initiative_id: 9 },
      currentResultSignal: signal({ portfolio: 'P25' }),
      greenChecksString: signal('[]'),
      green_checks: [],
      myInitiativesList: [{ initiative_id: 9, role: 'Leader' }]
    };
    fieldsManager = { portfolioAcronym: signal('P25'), isP25: signal(true), isP22: signal(false) };
    greenChecks = { submit: true };
    roles = { isAdmin: false };
    aiReview = { aiReviewButtonState: 'idle', onAIReviewClick: jest.fn() };
    api = { globalVariablesSE: { get: { in_qa: false } } };
    submissionModal = { showModal: false };
    unsubmitModal = { showModal: false };
  });

  describe('sections', () => {
    it('returns nothing until the portfolio resolves', () => {
      fieldsManager.portfolioAcronym = signal(undefined);
      build();

      expect(service.isLoading()).toBe(true);
      expect(service.sections()).toEqual([]);
    });

    it('drops the wildcard route and the sections of the other portfolio', () => {
      build();
      const sections = service.sections();

      expect(sections.length).toBeGreaterThan(0);
      expect(sections.some(s => s.path === '**')).toBe(false);
      expect(sections.some(s => s.portfolioAcronym === 'P22')).toBe(false);
    });

    it('attaches the green-check validation to the matching section', () => {
      build();
      const target = service.sections()[0];
      dataControl.green_checks = [{ section_name: target.path, validation: 1 }];
      dataControl.greenChecksString.set('changed');

      expect(service.sections().find(s => s.path === target.path)?.validation).toBe(1);
    });

    // The previous implementation wrote `validation` onto the shared routing objects, so a
    // completed section stayed green after switching to a different, empty result.
    it('does not leak one result validation into the next', () => {
      build();
      const target = service.sections()[0];
      dataControl.green_checks = [{ section_name: target.path, validation: 1 }];
      dataControl.greenChecksString.set('first');
      expect(service.sections().find(s => s.path === target.path)?.validation).toBe(1);

      dataControl.green_checks = [];
      dataControl.greenChecksString.set('second');
      expect(service.sections().find(s => s.path === target.path)?.validation).toBeFalsy();
    });
  });

  describe('progress', () => {
    it('is 0% with no green checks', () => {
      build();

      expect(service.doneCount()).toBe(0);
      expect(service.progressWidth()).toBe('0%');
      expect(service.progressLabel()).toBe(`0 of ${service.totalCount()} sections complete`);
    });

    it('counts the validated sections and renders the width', () => {
      build();
      const all = service.sections().filter(s => s.underConstruction !== true);
      dataControl.green_checks = all.slice(0, 1).map(s => ({ section_name: s.path, validation: 1 }));
      dataControl.greenChecksString.set('one-done');

      expect(service.doneCount()).toBe(1);
      expect(service.progressWidth()).toBe(`${Math.round((1 / all.length) * 100)}%`);
    });

    it('excludes under-construction sections, which never get a check', () => {
      build();

      expect(service.totalCount()).toBe(service.sections().filter(s => s.underConstruction !== true).length);
    });
  });

  describe('links', () => {
    it('builds the section route from the open result code', () => {
      build();

      expect(service.sectionLink({ path: 'general-information' } as any)).toBe('/result/result-detail/1234/general-information');
      expect(service.sectionQueryParams()).toEqual({ phase: 7 });
    });

    it('omits the phase when the result has no version', () => {
      dataControl.currentResult.version_id = null;
      build();

      expect(service.sectionQueryParams()).toEqual({});
    });
  });

  describe('actions gating', () => {
    it('shows AI review for a draft result that is not a knowledge product', () => {
      build();

      expect(service.showAiReview).toBe(true);
      expect(service.aiReviewDisabled).toBe(false);
    });

    it('hides AI review for knowledge products (type 6)', () => {
      dataControl.currentResult.result_type_id = 6;
      build();

      expect(service.showAiReview).toBe(false);
    });

    it('disables AI review and Submit while sections are missing, with the tooltip', () => {
      greenChecks.submit = false;
      build();

      expect(service.aiReviewDisabled).toBe(true);
      expect(service.submitDisabled).toBe(true);
      expect(service.incompleteTooltip).toBe(SECTIONS_INCOMPLETE_TOOLTIP);
    });

    it('has no tooltip once every section is complete', () => {
      build();

      expect(service.incompleteTooltip).toBe('');
    });

    it('disables Submit while the result is locked in QA', () => {
      dataControl.currentResult.inQA = true;
      api.globalVariablesSE.get.in_qa = true;
      build();

      expect(service.submitDisabled).toBe(true);
      expect(service.showInQaNotice).toBe(true);
    });

    it('hides Submit for a plain member of the initiative', () => {
      dataControl.myInitiativesList = [{ initiative_id: 9, role: 'Member' }];
      build();

      expect(service.showSubmit).toBe(false);
    });

    it('shows Submit to an admin even when not a member', () => {
      dataControl.myInitiativesList = [];
      roles.isAdmin = true;
      build();

      expect(service.showSubmit).toBe(true);
    });

    it('swaps Submit for Unsubmit once the result is submitted (status 3)', () => {
      dataControl.currentResult.status_id = 3;
      build();

      expect(service.showSubmit).toBe(false);
      expect(service.showUnsubmit).toBe(true);
    });

    it('explains that a quality assessed result (status 2) cannot be un-submitted', () => {
      dataControl.currentResult.status_id = 2;
      build();

      expect(service.showUnsubmit).toBe(false);
      expect(service.showQaAssessedNotice).toBe(true);
    });
  });

  describe('actions', () => {
    it('runs the AI review only when enabled', () => {
      build();
      service.runAiReview();
      expect(aiReview.onAIReviewClick).toHaveBeenCalledTimes(1);

      greenChecks.submit = false;
      service.runAiReview();
      expect(aiReview.onAIReviewClick).toHaveBeenCalledTimes(1);
    });

    it('opens the submission modal only when Submit is enabled', () => {
      build();
      service.openSubmit();
      expect(submissionModal.showModal).toBe(true);

      submissionModal.showModal = false;
      greenChecks.submit = false;
      service.openSubmit();
      expect(submissionModal.showModal).toBe(false);
    });

    it('opens the unsubmit modal', () => {
      build();
      service.openUnsubmit();

      expect(unsubmitModal.showModal).toBe(true);
    });

    it('labels the AI review button from its state', () => {
      build();
      expect(service.aiReviewLabel).toBe('AI review');

      aiReview.aiReviewButtonState = 'loading';
      expect(service.aiReviewLabel).toBe('Loading...');

      aiReview.aiReviewButtonState = 'completed';
      expect(service.aiReviewLabel).toBe('Ready!');
    });
  });
});
