// @akili-spec changes/delete-result-action (DEL-T-1, DEL-R-3, DEL-R-5, DEL-AC-3, DEL-AC-4, DEL-AC-5, DEL-AC-8, Defect gates D1, D2, D3, D6)
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { ResultDeletionService } from './result-deletion.service';

describe('ResultDeletionService', () => {
  let service: ResultDeletionService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      rolesSE: {
        isAdmin: false
      },
      dataControlSE: {
        reportingCurrentPhase: {
          portfolioAcronym: 'P25'
        }
      },
      resultsSE: {
        PATCH_DeleteResult: jest.fn()
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    TestBed.configureTestingModule({
      providers: [
        ResultDeletionService,
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    });

    service = TestBed.inject(ResultDeletionService);
  });

  describe('getDeleteEligibility', () => {
    describe('Phase check & Visibility (DEL-AC-5, Defect gate D3)', () => {
      it('returns visible: true when result acronym matches reportingCurrentPhase portfolioAcronym', () => {
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', role_id: 3, status_id: 1 });
        expect(eligibility.visible).toBe(true);
      });

      it('returns visible: false when result acronym does not match reportingCurrentPhase portfolioAcronym', () => {
        const eligibility = service.getDeleteEligibility({ acronym: 'P24', role_id: 3, status_id: 1 });
        expect(eligibility.visible).toBe(false);
      });

      it('returns visible: false when result has no acronym or is null', () => {
        expect(service.getDeleteEligibility({}).visible).toBe(false);
        expect(service.getDeleteEligibility(null).visible).toBe(false);
      });

      it('returns visible: false when reportingCurrentPhase has no portfolioAcronym', () => {
        mockApiService.dataControlSE.reportingCurrentPhase = null;
        expect(service.getDeleteEligibility({ acronym: 'P25' }).visible).toBe(false);
      });

      it('correctly unwraps raw property when wrapped in ProgrammeResultRow structure', () => {
        const row = {
          raw: {
            acronym: 'P25',
            role_id: 3,
            status_id: 1
          }
        };
        const eligibility = service.getDeleteEligibility(row);
        expect(eligibility.visible).toBe(true);
        expect(eligibility.disabled).toBe(false);
      });

      it('returns visible: true when result has no raw acronym but phaseName matches current portfolio', () => {
        const row = {
          id: 4712,
          code: '4712',
          title: 'Test',
          phaseName: 'Reporting 2026 - P25',
          role_id: 3,
          raw: {}
        };
        const eligibility = service.getDeleteEligibility(row);
        expect(eligibility.visible).toBe(true);
        expect(eligibility.disabled).toBe(false);
      });
    });

    describe('QAed status lockout (DEL-AC-4, Defect gate D2)', () => {
      it('disables deletion with QAed tooltip when status_id == 2 (as number), even for Admin', () => {
        mockApiService.rolesSE.isAdmin = true;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 2, role_id: 3 });

        expect(eligibility.disabled).toBe(true);
        expect(eligibility.tooltip).toBe(
          'You are not allowed to perform this action because the result is in the status "QAed".'
        );
      });

      it('disables deletion with QAed tooltip when status_id == "2" (as string)', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: '2', role_id: 3 });

        expect(eligibility.disabled).toBe(true);
        expect(eligibility.tooltip).toBe(
          'You are not allowed to perform this action because the result is in the status "QAed".'
        );
      });
    });

    describe('Admin role permissions (DEL-AC-1)', () => {
      it('enables deletion with empty tooltip when user is Admin and result is not QAed', () => {
        mockApiService.rolesSE.isAdmin = true;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: 6 });

        expect(eligibility.disabled).toBe(false);
        expect(eligibility.tooltip).toBe('');
      });
    });

    describe('Non-Admin role permissions (DEL-AC-2, DEL-AC-3, Defect gate D1)', () => {
      it('enables deletion for role_id 3 (Lead) when not QAed', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: 3 });

        expect(eligibility.disabled).toBe(false);
        expect(eligibility.tooltip).toBe('');
      });

      it('enables deletion for role_id 4 (Co-Lead) when not QAed', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: 4 });

        expect(eligibility.disabled).toBe(false);
        expect(eligibility.tooltip).toBe('');
      });

      it('enables deletion for role_id 5 (Coordinator) when not QAed', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: 5 });

        expect(eligibility.disabled).toBe(false);
        expect(eligibility.tooltip).toBe('');
      });

      it('enables deletion for role_id as string (e.g. "4")', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: '4' });

        expect(eligibility.disabled).toBe(false);
        expect(eligibility.tooltip).toBe('');
      });

      it('disables deletion with contact leader tooltip for unauthorized role (role_id: 6)', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1, role_id: 6 });

        expect(eligibility.disabled).toBe(true);
        expect(eligibility.tooltip).toBe(
          'You are not allowed to perform this action. Please contact your leader or co-leader.'
        );
      });

      it('disables deletion with contact leader tooltip when role_id is missing or undefined', () => {
        mockApiService.rolesSE.isAdmin = false;
        const eligibility = service.getDeleteEligibility({ acronym: 'P25', status_id: 1 });

        expect(eligibility.disabled).toBe(true);
        expect(eligibility.tooltip).toBe(
          'You are not allowed to perform this action. Please contact your leader or co-leader.'
        );
      });
    });
  });

  describe('deleteWithConfirmation', () => {
    it('shows confirmation modal with result title and options (DEL-R-3)', () => {
      const result = { id: 101, title: 'Sample Breeding Result' };

      service.deleteWithConfirmation(result);

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        {
          id: 'confirm-delete-result',
          title: 'Are you sure you want to delete the result "Sample Breeding Result"?',
          description: 'If you delete this result it will no longer be displayed in the list of results.',
          status: 'success',
          confirmText: 'Yes, delete'
        },
        expect.any(Function)
      );
      expect(mockApiService.resultsSE.PATCH_DeleteResult).not.toHaveBeenCalled();
    });

    it('handles missing title gracefully with empty string fallback', () => {
      service.deleteWithConfirmation({ id: 102 });

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Are you sure you want to delete the result ""?'
        }),
        expect.any(Function)
      );
    });

    it('unwraps raw property when wrapped in ProgrammeResultRow', () => {
      const row = { raw: { id: 103, title: 'Wrapped Result' } };

      service.deleteWithConfirmation(row);

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Are you sure you want to delete the result "Wrapped Result"?'
        }),
        expect.any(Function)
      );
    });

    it('does nothing when confirmation is canceled / dismissed', () => {
      service.deleteWithConfirmation({ id: 104, title: 'Canceled Result' });

      expect(mockApiService.alertsFe.show).toHaveBeenCalledTimes(1);
      expect(mockApiService.resultsSE.PATCH_DeleteResult).not.toHaveBeenCalled();
    });

    it('deletes result and displays success alert on confirmation (DEL-R-3, DEL-AC-2)', () => {
      mockApiService.resultsSE.PATCH_DeleteResult.mockReturnValue(of({ success: true }));
      const onSuccessSpy = jest.fn();

      service.deleteWithConfirmation({ id: 200, title: 'Breeding Line A' }, { onSuccess: onSuccessSpy });

      // Trigger the onConfirm callback passed to alertsFe.show
      const confirmCallback = mockApiService.alertsFe.show.mock.calls[0][1];
      confirmCallback();

      expect(mockApiService.resultsSE.PATCH_DeleteResult).toHaveBeenCalledWith(200);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'confirm-delete-result-su',
        title: 'The result "Breeding Line A" was deleted',
        status: 'success'
      });
      expect(onSuccessSpy).toHaveBeenCalledTimes(1);
    });

    it('works cleanly when onSuccess option is omitted', () => {
      mockApiService.resultsSE.PATCH_DeleteResult.mockReturnValue(of({ success: true }));

      service.deleteWithConfirmation({ id: 201, title: 'Breeding Line B' });

      const confirmCallback = mockApiService.alertsFe.show.mock.calls[0][1];
      expect(() => confirmCallback()).not.toThrow();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'confirm-delete-result-su' })
      );
    });

    it('handles HTTP 409 Conflict with warning alert (DEL-AC-8, Defect gate D6)', () => {
      const conflictError = {
        status: 409,
        error: { message: 'Result belongs to an inactive reporting phase.' }
      };
      mockApiService.resultsSE.PATCH_DeleteResult.mockReturnValue(throwError(() => conflictError));
      const onErrorSpy = jest.fn();

      service.deleteWithConfirmation({ id: 300, title: 'Conflict Result' }, { onError: onErrorSpy });

      const confirmCallback = mockApiService.alertsFe.show.mock.calls[0][1];
      confirmCallback();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'delete-error',
        title: 'Unable to delete result',
        description: 'Result belongs to an inactive reporting phase.',
        status: 'warning'
      });
      expect(onErrorSpy).toHaveBeenCalledWith(conflictError);
    });

    it('handles non-409 errors with generic error alert', () => {
      const serverError = {
        status: 500,
        error: { message: 'Internal server error' }
      };
      mockApiService.resultsSE.PATCH_DeleteResult.mockReturnValue(throwError(() => serverError));
      const onErrorSpy = jest.fn();

      service.deleteWithConfirmation({ id: 400, title: 'Server Error Result' }, { onError: onErrorSpy });

      const confirmCallback = mockApiService.alertsFe.show.mock.calls[0][1];
      confirmCallback();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'delete-error',
        title: 'Error when delete result',
        description: 'Internal server error',
        status: 'error'
      });
      expect(onErrorSpy).toHaveBeenCalledWith(serverError);
    });

    it('falls back to empty string description if backend error message is missing', () => {
      const mysteryError = { status: 500 };
      mockApiService.resultsSE.PATCH_DeleteResult.mockReturnValue(throwError(() => mysteryError));

      service.deleteWithConfirmation({ id: 500, title: 'Mystery Result' });

      const confirmCallback = mockApiService.alertsFe.show.mock.calls[0][1];
      confirmCallback();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'delete-error',
        title: 'Error when delete result',
        description: '',
        status: 'error'
      });
    });
  });
});
