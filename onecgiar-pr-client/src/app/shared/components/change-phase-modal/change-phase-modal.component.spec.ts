import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { ApiService } from '../../services/api/api.service';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

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
        PATCH_versioningProcessV2: jest.fn(),
        PATCH_versioningProcess: jest.fn(),
        GET_phaseReportingInitiatives: jest.fn(() => of({ response: { science_programs: [] } }))
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
      imports: [HttpClientTestingModule, CustomFieldsModule],
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

  /**
   * P2-3229. A bilateral result is confirmed, not configured. These specs pin the three things
   * that differ from the W1/W2 flow: nothing is editable, no entityId is sent (the server derives
   * the programme), and the redirect lands in the centre's own module.
   */
  describe('bilateral branch (P2-3229)', () => {
    const bilateralResult = {
      id: '456',
      result_code: 'RES-900',
      source_name: 'W3/Bilaterals',
      lead_center: 'CIAT (Alliance)',
      initiative_entity_map: [
        { isLabel: true, entityName: 'Science Programs' },
        { isLabel: false, entityId: 12, entityName: 'SP12 - Sustainable Farming' }
      ]
    };

    /**
     * The fixture from the outer setup already rendered the W1/W2 result and stays attached to the
     * same ApplicationRef, so `detectChanges()` re-checks it too and trips NG0100 once
     * `currentResult` is swapped. Rendering the new state needs a fixture built after the swap.
     */
    const renderFresh = () => {
      fixture.destroy();
      fixture = TestBed.createComponent(ChangePhaseModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    beforeEach(() => {
      mockApiService.dataControlSE.currentResult = { ...bilateralResult };
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseName: 'Reporting Phase 1', portfolioAcronym: 'P25' };
    });

    it('should recognise a bilateral result and read its lead center and Science Program', () => {
      expect(component.isBilateral).toBe(true);
      expect(component.leadCenterAcronym).toBe('CIAT (Alliance)');
      expect(component.scienceProgram).toBe('SP12 - Sustainable Farming');
    });

    it('should not treat a W1/W2 result as bilateral', () => {
      mockApiService.dataControlSE.currentResult = { id: '1', source_name: 'W1/W2' };

      expect(component.isBilateral).toBe(false);
    });

    it('should fall back to the submitter when the entity map carries no named entity', () => {
      mockApiService.dataControlSE.currentResult = { ...bilateralResult, initiative_entity_map: [], submitter: 'SP07' };

      expect(component.scienceProgram).toBe('SP07');
    });

    it('should render the read-only summary and NO submitter selector', () => {
      renderFresh();
      const html = fixture.nativeElement.textContent;

      expect(html).toContain('Lead center:');
      expect(html).toContain('CIAT (Alliance)');
      expect(html).toContain('Science Program:');
      expect(html).toContain('SP12 - Sustainable Farming');
      // The P25 selector belongs to W1/W2 — there is nothing for the user to pick here.
      expect(fixture.nativeElement.querySelector('app-pr-select')).toBeNull();
    });

    it('should still render the submitter selector for a P25 W1/W2 result', () => {
      mockApiService.dataControlSE.currentResult = {
        id: '1',
        source_name: 'W1/W2',
        initiative_entity_map: bilateralResult.initiative_entity_map
      };
      renderFresh();

      expect(fixture.nativeElement.querySelector('app-pr-select')).not.toBeNull();
    });

    it('should call PATCH_versioningProcess without an entityId, not the V2 endpoint', () => {
      mockApiService.resultsSE.PATCH_versioningProcess.mockReturnValue(of({ response: { result_code: 'RES-900', version_id: 36 } }));
      component.selectedInitiative = { id: 'should-be-ignored' };

      component.accept();

      expect(mockApiService.resultsSE.PATCH_versioningProcess).toHaveBeenCalledWith('456');
      expect(mockApiService.resultsSE.PATCH_versioningProcessV2).not.toHaveBeenCalled();
    });

    it('should navigate to the bilateral editor with the lead center acronym', () => {
      mockApiService.resultsSE.PATCH_versioningProcess.mockReturnValue(of({ response: { result_code: 'RES-900', version_id: 36 } }));

      component.accept();

      // The acronym goes through as a router segment so Angular encodes it — passing a
      // pre-encoded string here would double-encode the space and the parentheses.
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/bilateral', 'CIAT (Alliance)', 'result', 'RES-900'], {
        queryParams: { phase: 36 }
      });
    });

    it('should surface a server rejection instead of navigating', () => {
      mockApiService.resultsSE.PATCH_versioningProcess.mockReturnValue(throwError(() => ({ status: 403, error: { message: 'Not your centre' } })));

      component.accept();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'noti',
        title: 'Error',
        description: 'Not your centre',
        status: 'error'
      });
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(component.requesting).toBeFalsy();
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
