import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PhaseDetailComponent } from './phase-detail.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';

describe('PhaseDetailComponent', () => {
  let component: PhaseDetailComponent;
  let fixture: ComponentFixture<PhaseDetailComponent>;
  let mockApiService: any;
  let mockCustomizedAlertsFeSE: any;
  let mockRouter: any;

  const mockPhaseResponse = {
    response: {
      phase: {
        id: 1,
        phase_name: 'Reporting 2025',
        phase_year: 2025,
        status: true,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        portfolio: { id: 1, name: 'Portfolio', acronym: 'P25' }
      },
      science_programs: [
        { id: 1, official_code: 'SGP-01', name: 'Program 1', category: 'Science programs', reporting_enabled: true, color: '#ff0000' },
        { id: 2, official_code: 'SGP-02', name: 'Program 2', category: 'Accelerators', reporting_enabled: false, color: '#00ff00' },
        { id: 3, official_code: 'SP-03', name: 'Program 3', category: 'Science programs', reporting_enabled: true, color: '#0000ff' }
      ]
    }
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_phaseReportingInitiatives: jest.fn().mockReturnValue(of(mockPhaseResponse)),
        PATCH_phaseReportingInitiativeToggle: jest.fn().mockReturnValue(of({})),
        PATCH_phaseReportingInitiativesBulk: jest.fn().mockReturnValue(of({ response: mockPhaseResponse.response.science_programs }))
      },
      dataControlSE: {
        notifyReportingStatusChanged: jest.fn()
      }
    };

    mockCustomizedAlertsFeSE = {
      show: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PhaseDetailComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeSE },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '5'
              }
            }
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PhaseDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should parse phaseId from route and call loadPhaseDetail', () => {
      const loadSpy = jest.spyOn(component, 'loadPhaseDetail');
      component.ngOnInit();
      expect(component.phaseId).toBe(5);
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('loadPhaseDetail', () => {
    it('should set phaseDetail and sciencePrograms on success', () => {
      component.phaseId = 5;
      component.loadPhaseDetail();

      expect(component.isLoading()).toBe(false);
      expect(component.phaseDetail()).toEqual(mockPhaseResponse.response.phase);
      expect(component.sciencePrograms()).toEqual(mockPhaseResponse.response.science_programs);
    });

    it('should set isLoading false and show error on failure', () => {
      mockApiService.resultsSE.GET_phaseReportingInitiatives.mockReturnValue(throwError(() => new Error('fail')));

      component.phaseId = 5;
      component.loadPhaseDetail();

      expect(component.isLoading()).toBe(false);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-load-error', status: 'error' })
      );
    });
  });

  describe('filteredPrograms', () => {
    beforeEach(() => {
      component.phaseId = 5;
      component.loadPhaseDetail();
    });

    it('should return all programs when no filter applied', () => {
      expect(component.filteredPrograms()).toHaveLength(3);
    });

    it('should filter by search text (name)', () => {
      component.searchText.set('program 1');
      expect(component.filteredPrograms()).toHaveLength(1);
      expect(component.filteredPrograms()[0].name).toBe('Program 1');
    });

    it('should filter by search text (official_code)', () => {
      component.searchText.set('sgp-02');
      expect(component.filteredPrograms()).toHaveLength(1);
      expect(component.filteredPrograms()[0].official_code).toBe('SGP-02');
    });

    it('should filter by category', () => {
      component.selectedCategory.set('Accelerators');
      expect(component.filteredPrograms()).toHaveLength(1);
      expect(component.filteredPrograms()[0].category).toBe('Accelerators');
    });

    it('should combine search and category filters', () => {
      component.searchText.set('program');
      component.selectedCategory.set('Science programs');
      expect(component.filteredPrograms()).toHaveLength(2);
    });
  });

  describe('openCount and totalCount', () => {
    beforeEach(() => {
      component.phaseId = 5;
      component.loadPhaseDetail();
    });

    it('should compute openCount correctly', () => {
      expect(component.openCount()).toBe(2);
    });

    it('should compute totalCount correctly', () => {
      expect(component.totalCount()).toBe(3);
    });
  });

  describe('onToggleProgram', () => {
    beforeEach(() => {
      component.phaseId = 5;
      component.loadPhaseDetail();
    });

    it('should call PATCH and show success on toggle', () => {
      const program = { ...mockPhaseResponse.response.science_programs[0], reporting_enabled: false };
      component.onToggleProgram(program);

      expect(mockApiService.resultsSE.PATCH_phaseReportingInitiativeToggle).toHaveBeenCalledWith(
        5, 1, { reporting_enabled: false }
      );
      expect(mockApiService.dataControlSE.notifyReportingStatusChanged).toHaveBeenCalled();
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-toggle', status: 'success' })
      );
    });

    it('should show "opened" in title when reporting_enabled is true', () => {
      const program = { ...mockPhaseResponse.response.science_programs[0], reporting_enabled: true };
      component.onToggleProgram(program);

      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'SGP-01 opened' })
      );
    });

    it('should show "closed" in title when reporting_enabled is false', () => {
      const program = { ...mockPhaseResponse.response.science_programs[0], reporting_enabled: false };
      component.onToggleProgram(program);

      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'SGP-01 closed' })
      );
    });

    it('should revert reporting_enabled and show error on failure', () => {
      mockApiService.resultsSE.PATCH_phaseReportingInitiativeToggle.mockReturnValue(throwError(() => new Error('fail')));

      const program = { ...mockPhaseResponse.response.science_programs[0], reporting_enabled: false };
      component.onToggleProgram(program);

      expect(program.reporting_enabled).toBe(true); // reverted
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-toggle-error', status: 'error' })
      );
    });
  });

  describe('openAll', () => {
    beforeEach(() => {
      component.phaseId = 5;
    });

    it('should show confirmation dialog and call bulk API on confirm', () => {
      mockCustomizedAlertsFeSE.show.mockImplementation((config, callback) => {
        if (callback) callback();
      });

      component.openAll();

      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-open-all', status: 'warning' }),
        expect.any(Function)
      );
      expect(mockApiService.resultsSE.PATCH_phaseReportingInitiativesBulk).toHaveBeenCalledWith(5, { reporting_enabled: true });
      expect(component.isBulkUpdating()).toBe(false);
    });

    it('should show error on bulk API failure', () => {
      mockApiService.resultsSE.PATCH_phaseReportingInitiativesBulk.mockReturnValue(throwError(() => new Error('fail')));
      mockCustomizedAlertsFeSE.show.mockImplementation((config, callback) => {
        if (callback) callback();
      });

      component.openAll();

      expect(component.isBulkUpdating()).toBe(false);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-bulk-error', status: 'error' })
      );
    });
  });

  describe('closeAll', () => {
    beforeEach(() => {
      component.phaseId = 5;
    });

    it('should show confirmation dialog and call bulk API on confirm', () => {
      mockCustomizedAlertsFeSE.show.mockImplementation((config, callback) => {
        if (callback) callback();
      });

      component.closeAll();

      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-close-all', status: 'warning' }),
        expect.any(Function)
      );
      expect(mockApiService.resultsSE.PATCH_phaseReportingInitiativesBulk).toHaveBeenCalledWith(5, { reporting_enabled: false });
    });

    it('should show error on bulk API failure', () => {
      mockApiService.resultsSE.PATCH_phaseReportingInitiativesBulk.mockReturnValue(throwError(() => new Error('fail')));
      mockCustomizedAlertsFeSE.show.mockImplementation((config, callback) => {
        if (callback) callback();
      });

      component.closeAll();

      expect(component.isBulkUpdating()).toBe(false);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sp-bulk-error', status: 'error' })
      );
    });
  });

  describe('goBack', () => {
    it('should navigate to parent route', () => {
      const route = TestBed.inject(ActivatedRoute);
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: route });
    });
  });

  describe('getInitials', () => {
    it('should return "SG" for codes starting with SGP', () => {
      expect(component.getInitials('SGP-01')).toBe('SG');
      expect(component.getInitials('SGP02')).toBe('SG');
    });

    it('should return "SP" for other codes', () => {
      expect(component.getInitials('SP-01')).toBe('SP');
      expect(component.getInitials('INIT-01')).toBe('SP');
      expect(component.getInitials('ACC-01')).toBe('SP');
    });
  });
});
