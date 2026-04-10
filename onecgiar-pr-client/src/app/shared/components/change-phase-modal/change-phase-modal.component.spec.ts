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

  describe('loadClosedOptions', () => {
    it('should return early when phaseId is falsy', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: null };
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn();

      // Trigger loadClosedOptions via ngOnInit -> getCurrentPhases callback
      component.ngOnInit();

      expect(mockApiService.resultsSE.GET_phaseReportingInitiatives).not.toHaveBeenCalled();
    });

    it('should load closed options and enrich entity names when phaseId is present', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false },
            { id: 2, official_code: 'SP-02', reporting_enabled: true }
          ]
        }
      }));
      mockApiService.dataControlSE.resultsList = [];

      component.ngOnInit();

      expect(mockApiService.resultsSE.GET_phaseReportingInitiatives).toHaveBeenCalledWith(10);
      // Only non-reporting_enabled should be in closedOptions
      expect(component.closedOptions).toEqual([{ entityId: 1 }]);
    });

    it('should handle empty science_programs array', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: { science_programs: [] }
      }));
      mockApiService.dataControlSE.resultsList = [];

      component.ngOnInit();

      expect(component.closedOptions).toEqual([]);
    });

    it('should handle missing science_programs in response', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {}
      }));
      mockApiService.dataControlSE.resultsList = [];

      component.ngOnInit();

      expect(component.closedOptions).toEqual([]);
    });
  });

  describe('enrichResultEntityNames', () => {
    it('should prepend official_code to entityName when code is found and not already prefixed', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        {
          initiative_entity_map: [
            { entityId: 1, entityName: 'My Entity', isLabel: false }
          ]
        }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      component.ngOnInit();

      expect(mockApiService.dataControlSE.resultsList[0].initiative_entity_map[0].entityName).toBe('SP-01 - My Entity');
    });

    it('should skip items where isLabel is true', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        {
          initiative_entity_map: [
            { entityId: 1, entityName: 'Label Entity', isLabel: true }
          ]
        }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      component.ngOnInit();

      expect(mockApiService.dataControlSE.resultsList[0].initiative_entity_map[0].entityName).toBe('Label Entity');
    });

    it('should skip items without entityId', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        {
          initiative_entity_map: [
            { entityName: 'No Id Entity', isLabel: false }
          ]
        }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      component.ngOnInit();

      expect(mockApiService.dataControlSE.resultsList[0].initiative_entity_map[0].entityName).toBe('No Id Entity');
    });

    it('should not double-prefix entityName if already starts with code', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        {
          initiative_entity_map: [
            { entityId: 1, entityName: 'SP-01 - Already Prefixed', isLabel: false }
          ]
        }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      component.ngOnInit();

      expect(mockApiService.dataControlSE.resultsList[0].initiative_entity_map[0].entityName).toBe('SP-01 - Already Prefixed');
    });

    it('should skip results where initiative_entity_map is not an array', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        { initiative_entity_map: null },
        { initiative_entity_map: 'not-an-array' },
        { }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      // Should not throw
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should handle null resultsList', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = null;
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should skip items where entityName is falsy', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseId: 10 };
      mockApiService.dataControlSE.resultsList = [
        {
          initiative_entity_map: [
            { entityId: 1, entityName: '', isLabel: false },
            { entityId: 1, entityName: null, isLabel: false }
          ]
        }
      ];
      mockApiService.resultsSE.GET_phaseReportingInitiatives = jest.fn().mockReturnValue(of({
        response: {
          science_programs: [
            { id: 1, official_code: 'SP-01', reporting_enabled: false }
          ]
        }
      }));

      expect(() => component.ngOnInit()).not.toThrow();
    });
  });
});
