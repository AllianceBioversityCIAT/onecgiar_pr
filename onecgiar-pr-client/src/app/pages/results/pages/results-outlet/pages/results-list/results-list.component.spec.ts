import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListComponent } from './results-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsListFilterPipe } from './pipes/results-list-filter.pipe';
import { ResultsToUpdateModalComponent } from './components/results-to-update-modal/results-to-update-modal.component';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ResultsToUpdateFilterPipe } from './components/results-to-update-modal/results-to-update-filter.pipe';
import { ResultsListFiltersComponent } from './components/results-list-filters/results-list-filters.component';
import { ReportNewResultButtonComponent } from './components/report-new-result-button/report-new-result-button.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { ResultsListService } from './services/results-list.service';
import { ChangePhaseModalComponent } from '../../../../../../shared/components/change-phase-modal/change-phase-modal.component';
import { PopoverModule } from 'primeng/popover';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

jest.useFakeTimers();

describe('ResultsListComponent', () => {
  let component: ResultsListComponent;
  let fixture: ComponentFixture<ResultsListComponent>;
  let mockApiService: any;
  let mockShareRequestModalService: any;
  let mockResultLevelService: any;
  let mockRetrieveModalService: any;
  let mockExportTablesService: any;
  let mockResultsListService: any;
  let mockResultsListFilterService: any;
  let mockPhasesService: any;
  let mockResultsNotificationsService: any;
  let mockTable: any;

  beforeEach(async () => {
    mockApiService = {
      shouldShowUpdate: jest.fn(),
      updateResultsList: jest.fn(),
      resultsSE: {
        GET_reportingList: () => of({ response: [] }),
        PATCH_DeleteResult: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_versioning: () => of({ response: [{ phase_year: 2023 }] }),
        GET_allRequest: () => of({}),
        GET_requestStatus: () => of({}),
        currentResultId: 1
      },
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        reportingCurrentPhase: { phaseYear: 2024 },
        currentResult: {
          phase_year: 2023
        },
        currentResultSignal: signal({}),
        myInitiativesList: [
          { id: 1, selected: false },
          { id: 2, selected: false }
        ],
        showShareRequest: false,
        chagePhaseModal: false
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      },
      rolesSE: {
        isAdmin: false
      },
      updateUserData: jest.fn()
    };

    mockShareRequestModalService = {
      inNotifications: true
    };

    mockResultLevelService = {
      removeResultTypes: jest.fn(),
      currentResultLevelIdSignal: signal(null)
    };

    mockRetrieveModalService = {
      title: ''
    };

    mockExportTablesService = {
      exportExcel: jest.fn()
    };

    mockResultsListService = {
      showDeletingResultSpinner: false
    };

    mockResultsListFilterService = {
      text_to_search: jest.fn(() => ''),
      selectedPhases: jest.fn(() => []),
      selectedSubmitters: jest.fn(() => []),
      selectedSubmittersAdmin: jest.fn(() => []),
      selectedIndicatorCategories: jest.fn(() => []),
      selectedStatus: jest.fn(() => [])
    };

    mockPhasesService = {};

    mockResultsNotificationsService = {};

    mockTable = {
      reset: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        ResultsListComponent,
        ResultsListFilterPipe,
        ResultsToUpdateModalComponent,
        ResultsToUpdateFilterPipe,
        ReportNewResultButtonComponent,
        ChangePhaseModalComponent
      ],
      imports: [HttpClientTestingModule, MenuModule, TableModule, DialogModule, PopoverModule, ResultsListFiltersComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ShareRequestModalService, useValue: mockShareRequestModalService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: RetrieveModalService, useValue: mockRetrieveModalService },
        { provide: ExportTablesService, useValue: mockExportTablesService },
        { provide: ResultsListService, useValue: mockResultsListService },
        { provide: ResultsListFilterService, useValue: mockResultsListFilterService },
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: ResultsNotificationsService, useValue: mockResultsNotificationsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit()', () => {
    it('should call unSelectInits if user is admin', () => {
      mockApiService.rolesSE.isAdmin = true;
      const spyUnSelectInits = jest.spyOn(component, 'unSelectInits');

      component.ngOnInit();

      expect(spyUnSelectInits).toHaveBeenCalled();
    });

    it('should call updateUserData if user is not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      const spyUpdateUserData = jest.spyOn(mockApiService, 'updateUserData');

      component.ngOnInit();

      expect(spyUpdateUserData).toHaveBeenCalled();
    });

    it('should set inNotifications to false', () => {
      component.ngOnInit();

      expect(mockShareRequestModalService.inNotifications).toBeFalsy();
    });

    it('should call getCurrentPhases', () => {
      const spyGetCurrentPhases = jest.spyOn(mockApiService.dataControlSE, 'getCurrentPhases');

      component.ngOnInit();

      expect(spyGetCurrentPhases).toHaveBeenCalled();
    });
  });

  describe('Menu Items', () => {
    it('should set showShareRequest to true', () => {
      component.items[0].command();

      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });

    it('should set showShareRequest to true on command call of itemsWithDelete[0]', () => {
      component.itemsWithDelete[0].command();

      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });

    it('should set chagePhaseModal to true on command call of itemsWithDelete[1]', () => {
      component.itemsWithDelete[1].command();

      expect(mockApiService.dataControlSE.chagePhaseModal).toBeTruthy();
    });

    it('should call onDeleteREsult on command call of itemsWithDelete[2]', () => {
      const spy = jest.spyOn(component, 'onDeleteREsult');
      document.getElementById = jest.fn().mockReturnValue({
        scrollIntoView: jest.fn()
      });

      component.itemsWithDelete[3].command();
      jest.runAllTimers();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('validateOrder()', () => {
    it('should set combine to true if columnAttr is "result_code"', () => {
      component.validateOrder('result_code');

      jest.runAllTimers();

      expect(component.combine).toBeTruthy();
    });

    it('should set combine based on the presence of sorting in the table', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div id="resultListTable"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'getElementById').mockImplementation(selector => dom.getElementById(selector));

      component.validateOrder('column');

      jest.runAllTimers();

      expect(component.combine).toBeTruthy();
    });
  });

  describe('onPressAction()', () => {
    it('should set retrieve modal title and update current result on onPressAction', () => {
      const result = { id: '1', title: 'Test Result' };
      component.onPressAction(result);

      expect(mockRetrieveModalService.title).toBe(result.title);
      expect(mockApiService.resultsSE.currentResultId).toBe(result.id);
      expect(mockApiService.dataControlSE.currentResult).toBe(result);
    });

    it('should set itemsWithDelete[1].visible to true if current result phase year is less than reporting current phase year', () => {
      const result = {
        id: '1',
        title: 'Test Result',
        phase_year: 2022,
        initiative_entity_map: [{ entityId: '1' }],
        initiative_entity_user: [{ initiative_id: '1' }]
      };
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2023 };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(true);
    });

    it('should set itemsWithDelete[1].visible to false if current result phase year is equal to reporting current phase year', () => {
      const result = {
        id: '1',
        title: 'Test Result',
        phase_year: 2023,
        initiative_entity_map: [{ entityId: '1' }],
        initiative_entity_user: [{ initiative_id: '1' }]
      };
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2023 };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(false);
    });

    it('should set itemsWithDelete[1].visible to false if current result phase year is greater than reporting current phase year', () => {
      const result = {
        id: '1',
        title: 'Test Result',
        phase_year: 2024,
        initiative_entity_map: [{ entityId: '1' }],
        initiative_entity_user: [{ initiative_id: '1' }]
      };
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2023 };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(false);
    });
  });

  describe('onDeleteREsult()', () => {
    it('should show confirmation alert and delete result on confirmed action', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_DeleteResult');
      const spyUpdateResultsList = jest.spyOn(mockApiService, 'updateResultsList');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      document.getElementById = jest.fn().mockReturnValue({
        scrollIntoView: jest.fn()
      });
      component.onDeleteREsult();
      jest.runAllTimers();

      expect(spy).toHaveBeenCalledWith(component.api.dataControlSE.currentResult.id);
      expect(spyUpdateResultsList).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalled();
      expect(component.resultsListService.showDeletingResultSpinner).toBeFalsy();
    });
    it('should handle errors from PATCH_DeleteResult correctly', () => {
      const errorMessage = 'error message';
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_DeleteResult').mockReturnValue(throwError(errorMessage));
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const consoleErrorSpy = jest.spyOn(console, 'error');

      document.getElementById = jest.fn().mockReturnValue({
        scrollIntoView: jest.fn()
      });
      component.onDeleteREsult();
      jest.runAllTimers();

      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage);
      expect(spy).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'delete-error',
        title: 'Error when delete result',
        description: '',
        status: 'error'
      });
      expect(component.resultsListService.showDeletingResultSpinner).toBeFalsy();
    });
  });

  describe('ngOnDestroy()', () => {
    it('should set selected to true for each item in myInitiativesList', () => {
      component.ngOnDestroy();

      expect(mockApiService.dataControlSE.myInitiativesList.every(item => item.selected)).toBeTruthy();
    });
  });

  describe('resetTableManually()', () => {
    beforeEach(() => {
      // Set up the table ViewChild mock
      component.table = mockTable;
    });

    it('should reset the table when resetTableManually is called', () => {
      component.resetTableManually();

      expect(mockTable.reset).toHaveBeenCalled();
    });

    it('should be callable from external components', () => {
      // Simulate external component calling the method
      expect(() => component.resetTableManually()).not.toThrow();
      expect(mockTable.reset).toHaveBeenCalled();
    });

    it('should handle case when table is undefined', () => {
      component.table = undefined;

      expect(() => component.resetTableManually()).not.toThrow();
    });
  });

  describe('ngAfterViewInit()', () => {
    beforeEach(() => {
      component.table = mockTable;
    });

    it('should call resetTable after view initialization', () => {
      const spyResetTable = jest.spyOn(component as any, 'resetTable');

      component.ngAfterViewInit();
      jest.runAllTimers();

      expect(spyResetTable).toHaveBeenCalled();
    });
  });

  describe('unSelectInits()', () => {
    it('should set selected to false for all items in myInitiativesList', () => {
      component.unSelectInits();

      expect(mockApiService.dataControlSE.myInitiativesList.every(item => !item.selected)).toBeTruthy();
    });
  });

  describe('getDeleteTooltipText()', () => {
    it('should return QAed status tooltip when status_id is 2', () => {
      mockApiService.dataControlSE.currentResult = { status_id: '2' };

      const result = (component as any).getDeleteTooltipText();

      expect(result).toBe('You are not allowed to perform this action because the result is in the status "QAed".');
    });

    it('should return role permission tooltip when role_id is not 3, 4, or 5', () => {
      mockApiService.dataControlSE.currentResult = {
        status_id: '1',
        role_id: 1
      };

      const result = (component as any).getDeleteTooltipText();

      expect(result).toBe('You are not allowed to perform this action. Please contact your leader or co-leader.');
    });

    it('should return empty string when user has permission', () => {
      mockApiService.dataControlSE.currentResult = {
        status_id: '1',
        role_id: 3
      };

      const result = (component as any).getDeleteTooltipText();

      expect(result).toBe('');
    });
  });

  describe('Component Properties', () => {
    it('should have correct column order configuration', () => {
      expect(component.columnOrder).toEqual([
        { title: 'Result code', attr: 'result_code', center: true, width: '90px' },
        { title: 'Title', attr: 'title', class: 'notCenter', width: '305px' },
        { title: 'Funding Source', attr: 'source_name', center: true, width: '100px' },
        { title: 'Center', attr: 'lead_center', center: true, width: '100px' },
        { title: 'Phase - Portfolio', attr: 'phase_name', width: '155px' },
        { title: 'Indicator category', attr: 'result_type', center: true, width: '100px' },
        { title: 'Submitter', attr: 'submitter', center: true, width: '30px' },
        { title: 'Status', attr: 'full_status_name_html', center: true, width: '124px' },
        { title: 'Creation date	', attr: 'created_date', center: true, width: '120px' },
        { title: 'Created by	', attr: 'full_name', width: '120px' }
      ]);
    });

    it('should initialize with correct default values', () => {
      expect(component.gettingReport).toBe(false);
      expect(component.combine).toBe(true);
    });

    it('should have correct menu items configuration', () => {
      expect(component.items).toHaveLength(3);
      expect(component.itemsWithDelete).toHaveLength(4);

      expect(component.items[0].label).toBe('Map to TOC');
      expect(component.items[1].label).toBe('Update result');
      expect(component.items[2].label).toBe('Review result');
      expect(component.itemsWithDelete[3].label).toBe('Delete');
    });
  });

  describe('Menu Item Commands', () => {
    it('should set chagePhaseModal to true on command call of items[1]', () => {
      component.items[1].command();

      expect(mockApiService.dataControlSE.chagePhaseModal).toBeTruthy();
    });

    it('should call navigateToResult on items[2] command', () => {
      const spy = jest.spyOn(component, 'navigateToResult');
      mockApiService.dataControlSE.currentResult = { id: '1', title: 'Test' };

      component.items[2].command();

      expect(spy).toHaveBeenCalledWith(mockApiService.dataControlSE.currentResult);
    });

    it('should call navigateToResult on itemsWithDelete[2] command', () => {
      const spy = jest.spyOn(component, 'navigateToResult');
      mockApiService.dataControlSE.currentResult = { id: '1', title: 'Test' };

      component.itemsWithDelete[2].command();

      expect(spy).toHaveBeenCalledWith(mockApiService.dataControlSE.currentResult);
    });
  });

  describe('applyDefaultSort()', () => {
    it('should call sortSingle when available', () => {
      const mockTableWithSort = {
        reset: jest.fn(),
        sortField: '',
        sortOrder: 1,
        sortSingle: jest.fn(),
        sort: jest.fn()
      };
      component.table = mockTableWithSort as any;

      (component as any).applyDefaultSort();

      expect(mockTableWithSort.sortField).toBe('result_code');
      expect(mockTableWithSort.sortOrder).toBe(-1);
      expect(mockTableWithSort.sortSingle).toHaveBeenCalled();
      expect(mockTableWithSort.sort).not.toHaveBeenCalled();
    });

    it('should call sort when sortSingle is not a function', () => {
      const mockTableWithSort = {
        reset: jest.fn(),
        sortField: '',
        sortOrder: 1,
        sortSingle: 'not-a-function',
        sort: jest.fn()
      };
      component.table = mockTableWithSort as any;

      (component as any).applyDefaultSort();

      expect(mockTableWithSort.sort).toHaveBeenCalledWith({ field: 'result_code', order: -1 });
    });

    it('should do nothing when table is undefined', () => {
      component.table = undefined;

      expect(() => (component as any).applyDefaultSort()).not.toThrow();
    });

    it('should handle table with neither sortSingle nor sort as functions', () => {
      const mockTableNoSort = {
        reset: jest.fn(),
        sortField: '',
        sortOrder: 1,
        sortSingle: null,
        sort: null
      };
      component.table = mockTableNoSort as any;

      expect(() => (component as any).applyDefaultSort()).not.toThrow();
      expect(mockTableNoSort.sortField).toBe('result_code');
      expect(mockTableNoSort.sortOrder).toBe(-1);
    });
  });

  describe('isW3BilateralsAvisa() (private)', () => {
    it('should return false when source_name is not W3/Bilaterals', () => {
      const result = { source_name: 'Other', submitter: 'SGP-02' } as any;

      const ret = (component as any).isW3BilateralsAvisa(result);

      expect(ret).toBe(false);
    });

    it('should return true when source_name is W3/Bilaterals and submitter is SGP-02', () => {
      const result = { source_name: 'W3/Bilaterals', submitter: 'SGP-02' } as any;

      const ret = (component as any).isW3BilateralsAvisa(result);

      expect(ret).toBe(true);
    });

    it('should return true when source_name is W3/Bilaterals and submitter is SGP02', () => {
      const result = { source_name: 'W3/Bilaterals', submitter: 'SGP02' } as any;

      const ret = (component as any).isW3BilateralsAvisa(result);

      expect(ret).toBe(true);
    });

    it('should fallback to initiative_official_code when submitter is null and code is SGP-02', () => {
      const result = { source_name: 'W3/Bilaterals', submitter: null, initiative_official_code: 'SGP-02' } as any;

      const ret = (component as any).isW3BilateralsAvisa(result);

      expect(ret).toBe(true);
    });

    it('should return false when source_name is W3/Bilaterals but code is not SGP-02 or SGP02', () => {
      const result = { source_name: 'W3/Bilaterals', submitter: 'OTHER' } as any;

      const ret = (component as any).isW3BilateralsAvisa(result);

      expect(ret).toBe(false);
    });

    it('should return false for null result', () => {
      const ret = (component as any).isW3BilateralsAvisa(null);

      expect(ret).toBe(false);
    });
  });

  describe('onPressAction() - W3/Bilaterals flow', () => {
    it('should hide map/update and show review with Pending Review status for W3/Bilaterals', () => {
      const result = {
        id: '1',
        title: 'Test',
        source_name: 'W3/Bilaterals',
        submitter: 'OTHER',
        status_name: 'Pending Review',
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.items[0].visible).toBe(false);
      expect(component.items[1].visible).toBe(false);
      expect(component.items[2].visible).toBe(true);
      expect(component.items[2].label).toBe('Review result');
      expect(component.items[2].icon).toBe('pi pi-pencil');
      expect(component.itemsWithDelete[0].visible).toBe(false);
      expect(component.itemsWithDelete[1].visible).toBe(false);
      expect(component.itemsWithDelete[2].visible).toBe(true);
      expect(component.itemsWithDelete[2].label).toBe('Review result');
      expect(component.itemsWithDelete[2].icon).toBe('pi pi-pencil');
    });

    it('should show "See result" for W3/Bilaterals with non-Pending status', () => {
      const result = {
        id: '1',
        title: 'Test',
        source_name: 'W3/Bilaterals',
        submitter: 'OTHER',
        status_name: 'Approved',
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.items[2].label).toBe('See result');
      expect(component.items[2].icon).toBe('pi pi-eye');
      expect(component.itemsWithDelete[2].label).toBe('See result');
      expect(component.itemsWithDelete[2].icon).toBe('pi pi-eye');
    });
  });

  describe('onPressAction() - admin delete tooltip', () => {
    it('should disable delete for admin when status is QAed', () => {
      mockApiService.rolesSE.isAdmin = true;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '2',
        status_name: 'QAed',
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(true);
      expect(component.itemsWithDelete[3].tooltipShow).toBe(true);
      expect(component.itemsWithDelete[3].tooltipText).toContain('QAed');
    });

    it('should not disable delete for admin when status is not QAed', () => {
      mockApiService.rolesSE.isAdmin = true;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        status_name: 'Draft',
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(false);
      expect(component.itemsWithDelete[3].tooltipShow).toBe(false);
    });
  });

  describe('onPressAction() - non-admin delete tooltip', () => {
    it('should disable delete for non-admin with role_id not 3, 4, or 5', () => {
      mockApiService.rolesSE.isAdmin = false;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 1,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(true);
      expect(component.itemsWithDelete[3].tooltipShow).toBe(true);
      expect(component.itemsWithDelete[3].tooltipText).toContain('leader or co-leader');
    });

    it('should not disable delete for non-admin with role_id 3', () => {
      mockApiService.rolesSE.isAdmin = false;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 3,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(false);
      expect(component.itemsWithDelete[3].tooltipShow).toBe(false);
    });

    it('should not disable delete for non-admin with role_id 4', () => {
      mockApiService.rolesSE.isAdmin = false;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 4,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(false);
    });

    it('should not disable delete for non-admin with role_id 5', () => {
      mockApiService.rolesSE.isAdmin = false;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 5,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(false);
    });

    it('should disable delete for non-admin with QAed status even with allowed role', () => {
      mockApiService.rolesSE.isAdmin = false;
      const result = {
        id: '1',
        title: 'Test',
        status_id: '2',
        role_id: 3,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].disabled).toBe(true);
      expect(component.itemsWithDelete[3].tooltipText).toContain('QAed');
    });
  });

  describe('onPressAction() - portfolioAcronym visibility', () => {
    it('should show delete button when portfolioAcronym matches result acronym', () => {
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 3,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].visible).toBe(true);
    });

    it('should hide delete button when portfolioAcronym does not match result acronym', () => {
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 3,
        acronym: 'P24',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[3].visible).toBe(false);
    });
  });

  describe('onPressAction() - P25 update visibility', () => {
    it('should set itemsWithDelete[1].visible based on canUpdate when portfolioAcronym is P25', () => {
      mockApiService.shouldShowUpdate.mockReturnValue(true);
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 3,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(true);
    });

    it('should set itemsWithDelete[1].visible false when portfolioAcronym is P25 and canUpdate is false', () => {
      mockApiService.shouldShowUpdate.mockReturnValue(false);
      const result = {
        id: '1',
        title: 'Test',
        status_id: '1',
        role_id: 3,
        acronym: 'P25',
        phase_year: 2023,
        result_level_id: 1
      } as any;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2024, portfolioAcronym: 'P25' };

      component.onPressAction(result);

      expect(component.itemsWithDelete[1].visible).toBe(false);
    });
  });

  describe('navigateToResult()', () => {
    it('should navigate to result detail for W3/Bilaterals AVISA result', () => {
      const navigateSpy = jest.spyOn(component.router, 'navigateByUrl').mockResolvedValue(true);
      const result = {
        source_name: 'W3/Bilaterals',
        submitter: 'SGP-02',
        result_code: 'R-1',
        version_id: 10
      } as any;

      component.navigateToResult(result);

      expect(navigateSpy).toHaveBeenCalledWith('/result/result-detail/R-1/general-information?phase=10');
    });

    it('should navigate to entity-details for W3/Bilaterals non-AVISA result', () => {
      const navigateSpy = jest.spyOn(component.router, 'navigateByUrl').mockResolvedValue(true);
      const result = {
        source_name: 'W3/Bilaterals',
        submitter: 'OTHER',
        result_code: 'R-2',
        version_id: 10
      } as any;

      component.navigateToResult(result);

      expect(navigateSpy).toHaveBeenCalledWith('/result-framework-reporting/entity-details/OTHER/results-review');
    });

    it('should navigate to result detail for non-W3/Bilaterals result', () => {
      const navigateSpy = jest.spyOn(component.router, 'navigateByUrl').mockResolvedValue(true);
      const result = {
        source_name: 'Initiative',
        result_code: 'R-3',
        version_id: 10
      } as any;

      component.navigateToResult(result);

      expect(navigateSpy).toHaveBeenCalledWith('/result/result-detail/R-3/general-information?phase=10');
    });

    it('should set currentResultToReview and show review drawer for W3/Bilaterals non-AVISA', async () => {
      jest.spyOn(component.router, 'navigateByUrl').mockResolvedValue(true);
      const result = {
        source_name: 'W3/Bilaterals',
        submitter: 'OTHER',
        result_code: 'R-2',
        version_id: 10
      } as any;

      component.navigateToResult(result);

      expect(component.bilateralResultsService.currentResultToReview()).toBe(result);
    });
  });

  describe('onDeleteREsult() - with selected phases', () => {
    it('should include version_id when selectedPhaseIds returns a non-empty string', () => {
      mockResultsListFilterService.selectedPhases = jest.fn(() => [{ id: 1 }, { id: 2 }]);
      const spyUpdateResultsList = jest.spyOn(mockApiService, 'updateResultsList');

      mockApiService.alertsFe.show = jest.fn().mockImplementation((config, callback) => {
        if (callback) callback();
      });

      document.getElementById = jest.fn().mockReturnValue({
        scrollIntoView: jest.fn()
      });
      component.onDeleteREsult();
      jest.runAllTimers();

      expect(spyUpdateResultsList).toHaveBeenCalledWith({ version_id: '1,2' });
    });
  });
});
