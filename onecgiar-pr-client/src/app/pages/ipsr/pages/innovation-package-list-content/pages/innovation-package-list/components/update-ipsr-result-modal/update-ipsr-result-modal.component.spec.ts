import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { UpdateIpsrResultModalComponent } from './update-ipsr-result-modal.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { of, throwError } from 'rxjs';
import { IpsrToUpdateFilterPipe } from './ipsr-to-update-filter.pipe';
import { FormsModule } from '@angular/forms';

describe('UpdateIpsrResultModalComponent', () => {
  let component: UpdateIpsrResultModalComponent;
  let fixture: ComponentFixture<UpdateIpsrResultModalComponent>;
  let mockApiService: any;
  let mockIpsrDataControlSE: any;
  let mockRetrieveModalSE: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        reportingCurrentPhase: { phaseId: 30 },
        currentResult: null,
        chagePhaseModal: false,
        getCurrentIPSRPhase: () => of({}),
        IPSRCurrentPhase: { phaseYear: 2025 },
        myInitiativesList: []
      },
      rolesSE: {
        isAdmin: false
      },
      resultsSE: {
        currentResultId: null,
        GET_TypeByResultLevel: () => of({}),
        GET_phaseReportingInitiatives: jest.fn(() =>
          of({
            response: {
              science_programs: [
                { official_code: 'SP01', reporting_enabled: true },
                { official_code: 'SP02', reporting_enabled: false },
                { official_code: 'SP03', reporting_enabled: false }
              ]
            }
          })
        )
      }
    };

    mockIpsrDataControlSE = {
      ipsrResultList: [],
      ipsrUpdateResultModal: false
    };

    mockRetrieveModalSE = {
      title: ''
    };

    await TestBed.configureTestingModule({
      declarations: [UpdateIpsrResultModalComponent, IpsrToUpdateFilterPipe],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: IpsrDataControlService, useValue: mockIpsrDataControlSE },
        { provide: RetrieveModalService, useValue: mockRetrieveModalSE }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateIpsrResultModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadClosedCodes', () => {
    it('should load closed codes from API when phaseId exists and user is not admin', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseId = 30;
      mockApiService.rolesSE.isAdmin = false;

      // Constructor already called loadClosedCodes, verify the result
      expect(component.closedCodes.has('SP02')).toBe(true);
      expect(component.closedCodes.has('SP03')).toBe(true);
      expect(component.closedCodes.has('SP01')).toBe(false);
    });

    it('should not load closed codes when phaseId is null', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseId = null;
      mockApiService.rolesSE.isAdmin = false;

      const newFixture = TestBed.createComponent(UpdateIpsrResultModalComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent.closedCodes.size).toBe(0);
    });

    it('should not load closed codes when user is admin', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseId = 30;
      mockApiService.rolesSE.isAdmin = true;

      const newFixture = TestBed.createComponent(UpdateIpsrResultModalComponent);
      const newComponent = newFixture.componentInstance;

      expect(newComponent.closedCodes.size).toBe(0);
    });
  });

  describe('isUpdateDisabled', () => {
    it('should return true when result_type_id is 3', () => {
      const result = { result_type_id: 3, official_code: 'SP01' };
      expect(component.isUpdateDisabled(result)).toBe(true);
    });

    it('should return true when official_code is in closedCodes', () => {
      component.closedCodes.add('SP05');
      const result = { result_type_id: 1, official_code: 'SP05' };
      expect(component.isUpdateDisabled(result)).toBe(true);
    });

    it('should return false when result_type_id is not 3 and official_code is not closed', () => {
      const result = { result_type_id: 1, official_code: 'SP01' };
      expect(component.isUpdateDisabled(result)).toBe(false);
    });
  });

  describe('getUpdateTooltip', () => {
    it('should return capacity change tooltip when result_type_id is 3', () => {
      const result = { result_type_id: 3, official_code: 'SP01' };
      expect(component.getUpdateTooltip(result)).toBe(
        'This functionality is not available for capacity change result types.'
      );
    });

    it('should return closed reporting tooltip when official_code is in closedCodes', () => {
      component.closedCodes.add('SP05');
      const result = { result_type_id: 1, official_code: 'SP05' };
      expect(component.getUpdateTooltip(result)).toBe(
        'Reporting is closed for this Science Program.'
      );
    });

    it('should return null when neither condition is met', () => {
      const result = { result_type_id: 1, official_code: 'SP01' };
      expect(component.getUpdateTooltip(result)).toBeNull();
    });
  });

  describe('onPressAction', () => {
    it('should set retrieveModalSE title, currentResultId, currentResult and chagePhaseModal', () => {
      const result = { id: 42, title: 'Test Result' };

      component.onPressAction(result);

      expect(mockRetrieveModalSE.title).toBe('Test Result');
      expect(mockApiService.resultsSE.currentResultId).toBe(42);
      expect(mockApiService.dataControlSE.currentResult).toBe(result);
      expect(mockApiService.dataControlSE.chagePhaseModal).toBe(true);
    });

    it('should handle result with null title', () => {
      const result = { id: 10, title: null };

      component.onPressAction(result);

      expect(mockRetrieveModalSE.title).toBeNull();
      expect(mockApiService.resultsSE.currentResultId).toBe(10);
    });
  });

  describe('columnOrder', () => {
    it('should have 7 columns defined', () => {
      expect(component.columnOrder.length).toBe(7);
    });
  });
});
