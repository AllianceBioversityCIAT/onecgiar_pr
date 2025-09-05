import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { ApiService } from '../../services/api/api.service';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';
import { DialogModule } from 'primeng/dialog';

describe('ChangePhaseModalComponent', () => {
  let component: ChangePhaseModalComponent;
  let fixture: ComponentFixture<ChangePhaseModalComponent>;
  let mockApiService: any;
  let mockRouter: any;
  let mockIpsrDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        getCurrentIPSRPhase: jest.fn(() => of({})),
        currentResult: { id: '123', result_code: 'RES-001' },
        chagePhaseModal: false,
        updateResultModal: false,
        IPSRCurrentPhase: { phaseName: 'IPSR Phase 1' },
        reportingCurrentPhase: { phaseName: 'Reporting Phase 1' }
      },
      resultsSE: {
        PATCH_versioningProcessV2: jest.fn()
      },
      alertsFe: {
        show: jest.fn()
      },
      updateResultsList: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    mockIpsrDataControlService = {
      inIpsr: false,
      ipsrUpdateResultModal: false
    };

    await TestBed.configureTestingModule({
      declarations: [ChangePhaseModalComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule, DialogModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Router, useValue: mockRouter },
        { provide: IpsrDataControlService, useValue: mockIpsrDataControlService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePhaseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.requesting).toBeFalsy();
    expect(component.globalDisabled).toBe('globalDisabled');
    expect(component.selectedInitiative).toBeNull();
  });

  describe('ngOnInit', () => {
    it('should call getCurrentPhases and getCurrentIPSRPhase on initialization', () => {
      component.ngOnInit();

      expect(mockApiService.dataControlSE.getCurrentPhases).toHaveBeenCalled();
      expect(mockApiService.dataControlSE.getCurrentIPSRPhase).toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    const mockResponse = { result_code: 'RES-002', version_id: 'v2' };
    const mockInitiative = { id: 'init-1', name: 'Test Initiative' };

    beforeEach(() => {
      component.selectedInitiative = mockInitiative;
      component.requesting = false;
    });

    it('should call PATCH_versioningProcessV2 with correct parameters', () => {
      mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(of({ response: mockResponse }));

      component.accept();

      expect(mockApiService.resultsSE.PATCH_versioningProcessV2).toHaveBeenCalledWith(mockApiService.dataControlSE.currentResult.id, mockInitiative);
    });

    describe('on success', () => {
      beforeEach(() => {
        mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(of({ response: mockResponse }));
      });

      it('should show success alert with correct message for non-IPSR', () => {
        mockIpsrDataControlService.inIpsr = false;

        component.accept();

        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
          id: 'noti',
          title: 'Successful replication',
          description: `Result RES-001 successfully replicated in phase Reporting Phase 1.`,
          status: 'success'
        });
      });

      it('should show success alert with correct message for IPSR', () => {
        mockIpsrDataControlService.inIpsr = true;

        component.accept();

        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
          id: 'noti',
          title: 'Successful replication',
          description: `Result RES-001 successfully replicated in phase IPSR Phase 1.`,
          status: 'success'
        });
      });

      it('should set requesting to false on success', () => {
        component.accept();

        expect(component.requesting).toBeFalsy();
      });

      it('should call updateResultsList', () => {
        component.accept();

        expect(mockApiService.updateResultsList).toHaveBeenCalled();
      });

      it('should close all modals', () => {
        component.accept();

        expect(mockApiService.dataControlSE.chagePhaseModal).toBeFalsy();
        expect(mockApiService.dataControlSE.updateResultModal).toBeFalsy();
        expect(mockIpsrDataControlService.ipsrUpdateResultModal).toBeFalsy();
      });

      it('should navigate to IPSR detail when inIpsr is true', () => {
        mockIpsrDataControlService.inIpsr = true;

        component.accept();

        expect(mockRouter.navigate).toHaveBeenCalledWith([`/ipsr/detail/${mockResponse.result_code}/general-information`], {
          queryParams: { phase: mockResponse.version_id }
        });
      });

      it('should navigate to result detail when inIpsr is false', () => {
        mockIpsrDataControlService.inIpsr = false;

        component.accept();

        expect(mockRouter.navigate).toHaveBeenCalledWith([`/result/result-detail/${mockResponse.result_code}/general-information`], {
          queryParams: { phase: mockResponse.version_id }
        });
      });
    });

    describe('on error', () => {
      it('should handle 409 status error and show information alert', () => {
        const mockError = { status: 409, error: { message: 'Conflict message' } };
        mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(throwError(mockError));

        component.accept();

        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
          id: 'noti',
          title: 'Information',
          description: 'Conflict message',
          status: 'information'
        });
        expect(component.requesting).toBeFalsy();
      });

      it('should handle non-409 status error and show error alert', () => {
        const mockError = { status: 500, error: { message: 'Server error' } };
        mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(throwError(mockError));

        component.accept();

        expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
          id: 'noti',
          title: 'Error',
          description: 'Server error',
          status: 'error'
        });
        expect(component.requesting).toBeFalsy();
      });

      it('should set requesting to false on error', () => {
        const mockError = { status: 500, error: { message: 'Server error' } };
        mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(throwError(mockError));

        component.accept();

        expect(component.requesting).toBeFalsy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null response gracefully', () => {
      mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(of({ response: null }));

      expect(() => component.accept()).not.toThrow();
    });

    it('should handle undefined response gracefully', () => {
      mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(of({ response: undefined }));

      expect(() => component.accept()).not.toThrow();
    });

    it('should handle missing error message gracefully', () => {
      const mockError = { status: 500, error: {} };
      mockApiService.resultsSE.PATCH_versioningProcessV2.mockReturnValue(throwError(() => mockError));

      expect(() => component.accept()).not.toThrow();
    });
  });
});
