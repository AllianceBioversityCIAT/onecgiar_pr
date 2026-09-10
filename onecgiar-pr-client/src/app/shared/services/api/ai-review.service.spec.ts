import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AiReviewService } from './ai-review.service';

describe('AiReviewService', () => {
  let service: AiReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiReviewService]
    });
    service = TestBed.inject(AiReviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('onApplyProposal (the AI dialog "Save changes" button)', () => {
    let field: any;
    let resolveSave: (value?: unknown) => void;
    let rejectSave: (reason?: unknown) => void;

    beforeEach(() => {
      service.dataControlSE.currentResultSignal.set({ id: 1 } as any);
      service.sessionId.set(10);
      service.currnetFieldsList.set([{ field_name: 'new_title', original_text: 'A title' }]);
      field = service.currnetFieldsList()[0];

      jest.spyOn(service, 'POST_createEvent').mockResolvedValue({});
      jest.spyOn(service, 'POST_saveSession').mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            resolveSave = resolve;
            rejectSave = reject;
          })
      );
    });

    it('should flag the clicked proposal as saving while the request is in flight', async () => {
      expect(service.isSavingProposal(0)).toBe(false);

      const applied = service.onApplyProposal(field, 0);
      expect(service.isSavingProposal(0)).toBe(true);
      // Only the clicked row spins — the dialog renders one button per field.
      expect(service.isSavingProposal(1)).toBe(false);

      resolveSave({});
      await applied;

      expect(service.isSavingProposal(0)).toBe(false);
    });

    it('should send the save exactly once when the button is clicked twice', async () => {
      const applied = service.onApplyProposal(field, 0);
      await service.onApplyProposal(field, 0);

      expect(service.POST_saveSession).toHaveBeenCalledTimes(1);

      resolveSave({});
      await applied;
    });

    it('should release the button when the save fails', async () => {
      const applied = service.onApplyProposal(field, 0).catch(() => undefined);

      rejectSave(new Error('500'));
      await applied;

      expect(service.savingProposalIndex()).toBeNull();
      expect(field.canSave).toBe(true);
    });

    it('should accept a retry after a failed save', async () => {
      const failed = service.onApplyProposal(field, 0).catch(() => undefined);
      rejectSave(new Error('500'));
      await failed;

      const retried = service.onApplyProposal(field, 0);
      expect(service.POST_saveSession).toHaveBeenCalledTimes(2);

      resolveSave({});
      await retried;
    });
  });

  // The dialog's "Save changes" / "Validate all" both go through PATCH_saveDacScore. It used not to
  // notify the open section, so the section kept the impact-area values it had loaded before the
  // dialog opened and its own Save PATCHed them back over what the AI review had just written.
  describe('PATCH_saveDacScore notifies the open section', () => {
    let httpMock: HttpTestingController;

    const payload = { field_name: 'gender', tag_id: 3, impact_area_id: [1] };

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
      // `isSavingPipe()` fires the global save alert, which appends into <app-root>.
      document.body.appendChild(document.createElement('app-root'));
    });

    afterEach(() => {
      httpMock.verify();
      document.querySelector('app-root')?.remove();
    });

    it('should bump generalInformationSaved when the section is open', async () => {
      jest.spyOn(service.router, 'url', 'get').mockReturnValue('/result/123/general-information');
      const before = service.generalInformationSaved();

      const saved = service.PATCH_saveDacScore(123, payload);
      httpMock.expectOne(req => req.url.includes('ai/dac-scores/123')).flush({ response: {} });
      await saved;

      expect(service.generalInformationSaved()).toBe(before + 1);
    });

    it('should not bump it from an unrelated route', async () => {
      jest.spyOn(service.router, 'url', 'get').mockReturnValue('/result/123/partners');
      const before = service.generalInformationSaved();

      const saved = service.PATCH_saveDacScore(123, payload);
      httpMock.expectOne(req => req.url.includes('ai/dac-scores/123')).flush({ response: {} });
      await saved;

      expect(service.generalInformationSaved()).toBe(before);
    });

    it('should not bump it when the save is rejected', async () => {
      jest.spyOn(service.router, 'url', 'get').mockReturnValue('/result/123/general-information');
      const before = service.generalInformationSaved();

      const saved = service.PATCH_saveDacScore(123, payload).catch(() => undefined);
      httpMock.expectOne(req => req.url.includes('ai/dac-scores/123')).flush('nope', { status: 500, statusText: 'Server Error' });
      await saved;

      expect(service.generalInformationSaved()).toBe(before);
    });
  });

  describe('normalizeImpactAreaIds', () => {
    it('should return an empty list for null, undefined or empty values', () => {
      expect(service.normalizeImpactAreaIds(null)).toEqual([]);
      expect(service.normalizeImpactAreaIds(undefined)).toEqual([]);
      expect(service.normalizeImpactAreaIds('')).toEqual([]);
    });

    it('should wrap a single id into a list', () => {
      expect(service.normalizeImpactAreaIds(10)).toEqual([10]);
      expect(service.normalizeImpactAreaIds('10')).toEqual(['10']);
    });

    it('should keep a list as is and drop empty entries', () => {
      expect(service.normalizeImpactAreaIds([10, 11])).toEqual([10, 11]);
      expect(service.normalizeImpactAreaIds([10, null, '', undefined, 11])).toEqual([10, 11]);
    });
  });
});
