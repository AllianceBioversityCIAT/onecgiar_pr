import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListComponent } from './results-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsListFilterPipe } from './pipes/results-list-filter.pipe';
import { ResultsToUpdateModalComponent } from './components/results-to-update-modal/results-to-update-modal.component';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ResultsToUpdateFilterPipe } from './components/results-to-update-modal/results-to-update-filter.pipe';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
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
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';

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
      removeResultTypes: jest.fn()
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
        PrButtonComponent,
        ReportNewResultButtonComponent,
        ChangePhaseModalComponent
      ],
      imports: [HttpClientTestingModule, MenuModule, TableModule, DialogModule, PopoverModule, ResultsListFiltersComponent, CustomFieldsModule],
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

    it('should call updateResultsList', () => {
      const spyUpdateResultsList = jest.spyOn(mockApiService, 'updateResultsList');

      component.ngOnInit();

      expect(spyUpdateResultsList).toHaveBeenCalled();
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

      component.itemsWithDelete[2].command();
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
        { title: 'Title', attr: 'title', class: 'notCenter' },
        { title: 'Phase - Portfolio', attr: 'phase_name' },
        { title: 'Indicator category', attr: 'result_type' },
        { title: 'Submitter', attr: 'submitter', center: true },
        { title: 'Status', attr: 'full_status_name_html', center: true },
        { title: 'Creation date	', attr: 'created_date' },
        { title: 'Created by	', attr: 'full_name' }
      ]);
    });

    it('should initialize with correct default values', () => {
      expect(component.gettingReport).toBe(false);
      expect(component.combine).toBe(true);
    });

    it('should have correct menu items configuration', () => {
      expect(component.items).toHaveLength(2);
      expect(component.itemsWithDelete).toHaveLength(3);

      expect(component.items[0].label).toBe('Map to TOC');
      expect(component.items[1].label).toBe('Update result');
      expect(component.itemsWithDelete[2].label).toBe('Delete');
    });
  });

  describe('Menu Item Commands', () => {
    it('should set chagePhaseModal to true on command call of items[1]', () => {
      component.items[1].command();

      expect(mockApiService.dataControlSE.chagePhaseModal).toBeTruthy();
    });
  });
});
