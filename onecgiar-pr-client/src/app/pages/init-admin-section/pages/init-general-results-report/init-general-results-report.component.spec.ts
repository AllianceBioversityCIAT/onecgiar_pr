import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitGeneralResultsReportComponent } from './init-general-results-report.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterInitWithRoleCoordAndLeadPipe } from '../../pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.pipe';
import { PrMultiSelectComponent } from '../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../custom-fields/alert-status/alert-status.component';
import { ListFilterByTextAndAttrPipe } from '../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';

describe('InitGeneralResultsReportComponent', () => {
  let component: InitGeneralResultsReportComponent;
  let fixture: ComponentFixture<InitGeneralResultsReportComponent>;
  let mockApiService: any;
  let mockExportTablesService: any;
  let mockCustomizedAlertsService: any;
  let mockCustomizedAlertsFeService: any;
  let mockPhasesService: any;
  const mockResultStatusList = [
    { status_id: 1, name: 'Status1', className: 'status1' },
    { status_id: 2, name: 'Status Name', className: 'status2' },
  ];
  const mockInitiatives = [
    { initiative_id: 1, name: 'Initiative 1' },
    { initiative_id: 2, name: 'Initiative 2' }
  ];
  const mockPOST_reportSesultsCompletenessResponse = [
    {
      result_code: 1,
      result_title: 'Result 1',
      status_id: 1,
      result_type_name: 'Category 1',
      is_submitted: 1,
      official_code: 'code',
      name: 'name',
      className: 'class',
      full_name_html: ''
    },
  ];
  const mockPOST_excelFullReportResponse = {
    fullReport: [{}],
    resultsAgaintsToc: [{}]
  }

  beforeEach(async () => {
    mockApiService = {
      rolesSE: {
        isAdmin: true
      },
      resultsSE: {
        GET_AllInitiatives: () => of({ response: mockInitiatives }),
        GET_allResultStatuses: () => of({ response: mockResultStatusList }),
        POST_reportSesultsCompleteness: () => of({ response: mockPOST_reportSesultsCompletenessResponse }),
        POST_excelFullReport: () => of({ response: mockPOST_excelFullReportResponse })
      }
    };

    mockExportTablesService = {
      exportMultipleSheetsExcel: jest.fn()
    };

    mockCustomizedAlertsService = {
      show: jest.fn()
    };

    mockPhasesService = {
      getPhasesObservable: () => of([
        { id: 1, status: 'open' },
      ]),
      phases: {
        reporting: [
          { id: 1, status: 'open' },
        ]
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn()
    }

    await TestBed.configureTestingModule({
      declarations: [
        InitGeneralResultsReportComponent,
        FilterInitWithRoleCoordAndLeadPipe,
        PrMultiSelectComponent,
        AlertStatusComponent,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        ScrollingModule,
        FormsModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ExportTablesService, useValue: mockExportTablesService },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsService },
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InitGeneralResultsReportComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call getAllResultStatuses, getPhases, and getAll', () => {
      const spyGetAllResultStatuses = jest.spyOn(component, 'getAllResultStatuses');
      const spyGetPhases = jest.spyOn(component, 'getPhases');
      const spyGetAll = jest.spyOn(component, 'getAll');

      component.ngOnInit();

      expect(spyGetAllResultStatuses).toHaveBeenCalled();
      expect(spyGetPhases).toHaveBeenCalled();
      expect(spyGetAll).toHaveBeenCalled();
    });
  });

  describe('getAllResultStatuses', () => {
    it('should fetch resultStatusList', () => {
      component.getAllResultStatuses();

      expect(component.resultStatusList).toEqual(mockResultStatusList);
      expect(component.resultStatusList[1].className).toEqual('status-name');
    });
  });

  describe('getPhases', () => {
    it('should select open phases when phasesSE.phases.reporting.length is false', () => {
      mockPhasesService.phases.reporting = [];

      component.getPhases();

      expect(component.reportingPhases).toEqual([{ id: 1, status: 'open' }]);
    });
    it('should call autoSelectOpenPhases when phasesSE.phases.reporting.length is true', () => {
      mockPhasesService.phases.reporting = [
        { id: 1, status: 'open' }
      ];

      component.getPhases();

      expect(component.reportingPhases).toEqual([{ id: 1, status: 'open' }]);
    });
  });

  describe('onSelectDropdown', () => {
    it('should call POST_reportSesultsCompleteness with correct parameters', () => {
      component.initiativesSelected = [{ initiative_id: 1 }];
      component.phasesSelected = [{ id: 1 }];
      const spy = jest.spyOn(component, 'POST_reportSesultsCompleteness');

      component.onSelectDropdown();

      expect(spy).toHaveBeenCalledWith([1], [1]);
    });
  });

  describe('getAll', () => {
    it('should call GET_AllInitiatives', () => {
      const spy = jest.spyOn(component, 'GET_AllInitiatives');

      component.getAll();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should fetch all initiatives if isAdmin is true', () => {
      component.api.rolesSE.isAdmin = true;

      component.GET_AllInitiatives();

      expect(component.allInitiatives).toEqual(mockInitiatives);
    });
    it('should not fetch initiatives if isAdmin is false', () => {
      component.api.rolesSE.isAdmin = false;
      const spyGetAllInitiatives = jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spyGetAllInitiatives).not.toHaveBeenCalled();
    });
  });

  describe('openFolderText', () => {
    it('should generate the correct folder text', () => {
      const expectedText = 'In this <a href="https://cgiar.sharepoint.com/:f:/s/PRMSProject/Ev8QdqJv6vtPmcRvE4QLnDUB17Hke9nHOUneI1AZCI5KHg?e=5He46N"  class="open_route" target="_blank">folder</a>, you will find the latest reports that contains all the results reported in the tool. Please make sure to check the date of each report to ensure that you are always downloading the most recent version.';

      const result = component.openFolderText();

      expect(result).toEqual(expectedText);
    });
  });

  describe('POST_reportSesultsCompleteness', () => {
    it('should update resultsList based on API response', () => {
      component.resultStatusList = mockInitiatives;
      component.POST_reportSesultsCompleteness([1, 2], [3, 4]);

      expect(component.resultsList).toEqual(mockPOST_reportSesultsCompletenessResponse);
      expect(component.resultsList[0].full_name_html).toContain('completeness-');
      expect(component.resultsList[0].full_name_html).toContain('Result code: (1)');
      expect(component.resultsList[0].full_name_html).toContain('Indicator category: (Category 1)');
      expect(component.resultsList[0].full_name_html).toEqual('<div class=\"completeness-undefined completeness-state\">undefined</div> <strong>Result code: (1)</strong> - Result 1  - <strong>Official code: (code)</strong> - <strong>Indicator category: (Category 1)</strong>');
    });
  });

  describe('exportExcel', () => {
    it('should call POST_excelFullReportPromise and exportMultipleSheetsExcel', async () => {
      component.resultsList = [{ results_id: 1 }];
      const spyPostExcelFullReportPromise = jest.spyOn(component, 'POST_excelFullReportPromise');
      const spyExportMultipleSheetsExcel = jest.spyOn(mockExportTablesService, 'exportMultipleSheetsExcel');

      await component.exportExcel(component.resultsList);

      expect(spyPostExcelFullReportPromise).toHaveBeenCalledWith(1, 0);
      expect(spyExportMultipleSheetsExcel).toHaveBeenCalledWith([{}], 'results_list', null, [{}]);
      expect(component.requesting).toBeFalsy();
    });
  });

  describe('POST_excelFullReportPromise', () => {
    it('should call POST_excelFullReport and resolve promise', async () => {
      const spyPostExcelFullReport = jest.spyOn(mockApiService.resultsSE, 'POST_excelFullReport');

      await component.POST_excelFullReportPromise(1, 0);

      expect(spyPostExcelFullReport).toHaveBeenCalledWith([1]);
      expect(component.dataToExport).toEqual([{}]);
      expect(component.tocToExport).toEqual([{}]);
      expect(component.requestCounter).toBe(1);
    });
    it('should handle POST_excelFullReport API error', async () => {
      jest.spyOn(mockApiService.resultsSE, 'POST_excelFullReport')
        .mockReturnValue(throwError({}));
      const spy = jest.spyOn(mockCustomizedAlertsFeService, 'show');

      await component.POST_excelFullReportPromise(1, 0);

      expect(spy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.',
        status: 'error'
      });
      expect(component.requestCounter).toBe(0);
    });
  });

  describe('onRemoveinit', () => {
    it('should handle the removal of an initiative', () => {
      const spy = jest.spyOn(component, 'onRemoveinit');

      component.onRemoveinit({});

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('parseCheck', () => {
    it('should return "Pending" for value 0', () => {
      const result = component.parseCheck(0);
      expect(result).toBe('Pending');
    });

    it('should return "Completed" for a value other than 0', () => {
      const result = component.parseCheck(1);
      expect(result).toBe('Completed');
    });
  });
});
