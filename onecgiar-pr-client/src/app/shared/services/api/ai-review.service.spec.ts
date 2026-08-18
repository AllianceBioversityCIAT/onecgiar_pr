import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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
});
