import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListComponent } from './results-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsListFilterPipe } from './pipes/results-list-filter.pipe';
import { ResultsToUpdateModalComponent } from './components/results-to-update-modal/results-to-update-modal.component';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ResultsToUpdateFilterPipe } from './components/results-to-update-modal/results-to-update-filter.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
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
        getCurrentPhases: () => {},
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

    await TestBed.configureTestingModule({
      declarations: [
        ResultsListComponent,
        ResultsListFilterPipe,
        ResultsToUpdateModalComponent,
        ResultsToUpdateFilterPipe,
        PrFieldHeaderComponent,
        PrButtonComponent,
        ResultsListFiltersComponent,
        ReportNewResultButtonComponent,
        ChangePhaseModalComponent
      ],
      imports: [HttpClientTestingModule, MenuModule, TableModule, DialogModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ShareRequestModalService, useValue: mockShareRequestModalService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: RetrieveModalService, useValue: mockRetrieveModalService },
        { provide: ExportTablesService, useValue: mockExportTablesService },
        { provide: ResultsListService, useValue: mockResultsListService }
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
      component.items[0].command(null);

      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });

    it('should set showShareRequest to true on command call of itemsWithDelete[0]', () => {
      component.itemsWithDelete[0].command(null);

      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });

    it('should set chagePhaseModal to true on command call of itemsWithDelete[1]', () => {
      component.itemsWithDelete[1].command(null);

      expect(mockApiService.dataControlSE.chagePhaseModal).toBeTruthy();
    });

    it('should call onDeleteREsult on command call of itemsWithDelete[2]', () => {
      const spy = jest.spyOn(component, 'onDeleteREsult');
      document.getElementById = jest.fn().mockReturnValue({
        scrollIntoView: jest.fn()
      });

      component.itemsWithDelete[2].command(null);
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

  describe('onDownLoadTableAsExcel()', () => {
    it('should set gettingReport to true and export Excel on exportExcel API response', () => {
      const spyExportExcel = jest.spyOn(mockExportTablesService, 'exportExcel');
      const wscols = [
        { header: 'Result code', key: 'result_code', width: 13 },
        { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
        { header: 'Reporting year', key: 'reported_year_id', width: 13 },
        { header: 'Result title', key: 'title', width: 125 },
        { header: 'Description', key: 'description', width: 125 },
        { header: 'Result type', key: 'result_type', width: 45 },
        { header: 'Is Key Result Story', key: 'is_key_result', width: 45 },
        { header: 'Gender tag level', key: 'gender_tag_level', width: 20 },
        { header: 'Climate tag level', key: 'climate_tag_level', width: 20 },
        { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 20 },
        { header: 'Environment/biodiversity tag level', key: 'environment_tag_level', width: 38 },
        { header: 'Poverty tag level', key: 'poverty_tag_level', width: 20 },
        { header: 'Submitter', key: 'official_code', width: 14 },
        { header: 'Status', key: 'status_name', width: 17 },
        { header: 'Creation date', key: 'creation_date', width: 15 },
        { header: 'Work package id', key: 'work_package_id', width: 18 },
        { header: 'Work package title', key: 'work_package_title', width: 125 },
        { header: 'ToC result id', key: 'toc_result_id', width: 15 },
        { header: 'ToC result title', key: 'toc_result_title', width: 125 },
        { header: 'Action Area(s)', key: 'action_areas', width: 53 },
        { header: 'Center(s)', key: 'centers', width: 80 },
        { header: 'Contributing Initiative(s)', key: 'contributing_initiative', width: 26 },
        { header: 'PDF Link', key: 'pdf_link', width: 65 }
      ];

      component.onDownLoadTableAsExcel();

      expect(spyExportExcel).toHaveBeenCalledWith([], 'results_list', wscols, [
        {
          cellNumber: 23,
          cellKey: 'pdf_link'
        }
      ]);
      expect(component.gettingReport).toBeFalsy();
    });

    it('should handle errors fromexportExcelresponse', () => {
      const errorMessage = 'error message';
      jest.spyOn(mockApiService.resultsSE, 'GET_reportingList').mockReturnValue(throwError(errorMessage));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      component.onDownLoadTableAsExcel();

      expect(component.gettingReport).toBeFalsy();
      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage);
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
});
