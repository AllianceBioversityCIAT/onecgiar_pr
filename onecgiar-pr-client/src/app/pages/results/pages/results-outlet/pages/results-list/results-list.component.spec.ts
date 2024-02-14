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
        currentResult: {
          phase_year: 2023
        },
        myInitiativesList: [
          { id: 1, selected: false },
          { id: 2, selected: false },
        ],
        showShareRequest: false,
        chagePhaseModal: false
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      },
    };

    mockShareRequestModalService = {
      inNotifications: true
    };

    mockResultLevelService = {
      removeResultTypes: jest.fn()
    }

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
        ReportNewResultButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        MenuModule,
        TableModule,
        DialogModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ShareRequestModalService, useValue: mockShareRequestModalService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: RetrieveModalService, useValue: mockRetrieveModalService },
        { provide: ExportTablesService, useValue: mockExportTablesService },
        { provide: ResultsListService, useValue: mockResultsListService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe('ngOnInit()', () => {
    it('should call updateResultsList and getAllPhases on ngOnInit', () => {
      const spy = jest.spyOn(mockApiService, 'updateResultsList');
      const spyGetAllPhases = jest.spyOn(component, 'getAllPhases');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
      expect(spyGetAllPhases).toHaveBeenCalled();
      expect(mockShareRequestModalService.inNotifications).toBeFalsy();
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
      const dom = parser.parseFromString(`
      <div id="resultListTable"></div>`,
        'text/html');

      jest.spyOn(document, 'getElementById')
        .mockImplementation((selector) => dom.getElementById(selector));

      component.validateOrder('column');

      jest.runAllTimers();

      expect(component.combine).toBeTruthy();
    });
  });

  describe('onPressAction()', () => {
    it('should set retrieve modal title and update current result on onPressAction', () => {
      const result = { id: 1, title: 'Test Result' };
      component.onPressAction(result);

      expect(mockRetrieveModalService.title).toBe(result.title);
      expect(mockApiService.resultsSE.currentResultId).toBe(result.id);
      expect(mockApiService.dataControlSE.currentResult).toBe(result);
    });
  });

  describe('onDownLoadTableAsExcel()', () => {
    it('should set gettingReport to true and export Excel on exportExcel API response', () => {
      const spyExportExcel = jest.spyOn(mockExportTablesService, 'exportExcel');

      component.onDownLoadTableAsExcel();

      expect(spyExportExcel).toHaveBeenCalledWith([], 'results_list');
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
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_DeleteResult').mockReturnValue(throwError(errorMessage));;
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

  describe('getAllPhases()', () => {
    it('should update currentPhase property on successful API call', () => {
     const spy = jest.spyOn(mockApiService.resultsSE, 'GET_versioning');
  
      component.getAllPhases();
  
      expect(component.currentPhase).toEqual(2023);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy()', () => {
    it('should set selected to true for each item in myInitiativesList', () => {
      component.ngOnDestroy();
  
      expect(mockApiService.dataControlSE.myInitiativesList.every(item => item.selected)).toBeTruthy();
    });
  });
});
