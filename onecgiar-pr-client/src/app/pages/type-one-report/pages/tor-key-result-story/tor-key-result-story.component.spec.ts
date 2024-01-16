import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorKeyResultStoryComponent } from './tor-key-result-story.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../custom-fields/no-data-text/no-data-text.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';
import { SaveButtonComponent } from '../../../../custom-fields/save-button/save-button.component';
import { SimpleTableWithClipboardComponent } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { TorKrsPrimaryImpactAreaSelectorComponent } from '../../../../shared/components/simple-table-with-clipboard/components/tor-krs-primary-impact-area-selector/tor-krs-primary-impact-area-selector.component';
import { PrSelectComponent } from '../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { ToastModule } from 'primeng/toast';

describe('TorKeyResultStoryComponent', () => {
  let component: TorKeyResultStoryComponent;
  let fixture: ComponentFixture<TorKeyResultStoryComponent>;
  let mockApiService: any;
  let mockGET_keyResultStoryInitiativeIdResponse = [
    {
      result_title: 'title',
      result_code: 1,
      primary_submitter: 'submiter',
      contributing_initiative: 'initiative',
      contributing_center: 'center',
      contribution_external_partner: 'partner',
      countries: 'countries',
      regions: 'regions',
      impact_areas: '[{"disabled": false, "selected": false}]',
      other_impact_areas: 'areas',
      global_targets: 'targets',
      web_legacy: 'web'
    }
  ];
  let mockTypeOneReportService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_keyResultStoryInitiativeId: () => of({ response: mockGET_keyResultStoryInitiativeIdResponse }),
        PATCH_primaryImpactAreaKrs: () => of({})
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockTypeOneReportService = {
      keyResultStoryData: {},
      getInitiativeID: jest.fn(),
      phaseSelected: 'phase'
    };

    await TestBed.configureTestingModule({
      declarations: [TorKeyResultStoryComponent, NoDataTextComponent, SaveButtonComponent, SimpleTableWithClipboardComponent, PrButtonComponent, TorKrsPrimaryImpactAreaSelectorComponent, PrSelectComponent, LabelNamePipe, ListFilterByTextAndAttrPipe, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, TooltipModule, ScrollingModule, FormsModule, ToastModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: TypeOneReportService,
          useValue: mockTypeOneReportService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKeyResultStoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should call GET_keyResultStoryInitiativeId on ngOnInit', () => {
      const spy = jest.spyOn(component, 'GET_keyResultStoryInitiativeId');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('GET_keyResultStoryInitiativeId()', () => {
    it('should call GET_keyResultStoryInitiativeId API and format data on GET_keyResultStoryInitiativeId', () => {
      const spy = jest.spyOn(component, 'formatTable');
      const spyGET_keyResultStoryInitiativeId = jest.spyOn(mockApiService.resultsSE, 'GET_keyResultStoryInitiativeId');

      component.GET_keyResultStoryInitiativeId();

      expect(spy).toHaveBeenCalled();
      expect(spyGET_keyResultStoryInitiativeId).toHaveBeenCalled();
      expect(mockTypeOneReportService.keyResultStoryData).toEqual(mockGET_keyResultStoryInitiativeIdResponse);
    });
  });

  describe('onSaveSection()', () => {
    it('should call GET_keyResultStoryInitiativeId and show success alert on PATCH_primaryImpactAreaKrs success', () => {
      const spy = jest.spyOn(component, 'GET_keyResultStoryInitiativeId');
      const spyAlerts = jest.spyOn(mockApiService.alertsFe, 'show');
      const spyGET_keyResultStoryInitiativeId = jest.spyOn(component, 'GET_keyResultStoryInitiativeId');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGET_keyResultStoryInitiativeId).toHaveBeenCalled();
      expect(spyAlerts).toHaveBeenCalledWith({
        id: 'save-button',
        title: 'Key result story informaion saved correctly',
        description: '',
        status: 'success',
        closeIn: 500
      });
    });
    it('should log error on PATCH_primaryImpactAreaKrs error', () => {
      const errorResponse = { status: 500, message: 'Internal Server Error' };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_primaryImpactAreaKrs').mockReturnValue(throwError(errorResponse));
      const spyGET_keyResultStoryInitiativeId = jest.spyOn(component, 'GET_keyResultStoryInitiativeId');
      const spyError = jest.spyOn(console, 'error');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGET_keyResultStoryInitiativeId).not.toHaveBeenCalled();
      expect(spyError).toHaveBeenCalledWith(errorResponse);
    });
  });

  describe('formatTable()', () => {
    it('should set data and header correctly when tableData is provided', () => {
      component.formatTable(mockGET_keyResultStoryInitiativeIdResponse[0]);

      const header = component.tablesList[0].header;
      const data = component.tablesList[0].data;

      expect(header).toEqual([{ attr: 'category' }, { attr: 'value' }]);
      expect(data[0].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].result_title);
      expect(data[0].id).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].result_code);
      expect(data[1].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].primary_submitter);
      expect(data[2].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].contributing_initiative);
      expect(data[3].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].contributing_center);
      expect(data[4].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].contribution_external_partner);
      const expectedGeoLocation = `<strong>Countries:</strong><br> ${mockGET_keyResultStoryInitiativeIdResponse[0].countries} <br><br><strong>Regions:</strong><br>${mockGET_keyResultStoryInitiativeIdResponse[0].regions}<br> `;
      expect(data[5].value).toBe(expectedGeoLocation);
      expect(data[6].value).toEqual(JSON.parse(mockGET_keyResultStoryInitiativeIdResponse[0].impact_areas));
      expect(data[7].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].other_impact_areas);
      expect(data[8].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].global_targets);
      expect(data[9].value).toBe(mockGET_keyResultStoryInitiativeIdResponse[0].web_legacy);
    });
    it('should set default values when tableData properties are not provided', () => {
      const tableData = {
        result_title: '',
        result_code: '',
        primary_submitter: '',
        contributing_initiative: '',
        contributing_center: '',
        contribution_external_partner: '',
        countries: '',
        regions: '',
        impact_areas: null,
        other_impact_areas: '',
        global_targets: '',
        web_legacy: ''
      };
      component.tablesList = [];
      component.formatTable(tableData);

      const data = component.tablesList[0].data;

      expect(data[0].value).toBe('<div class="no-data-text-format">There are not result title data</div>');
      expect(data[0].id).toBe('');
      expect(data[1].value).toBe('<div class="no-data-text-format">There are not primary submitter data</div>');
      expect(data[2].value).toBe('<div class="no-data-text-format">There are not contributing Initiatives data</div>');
      expect(data[3].value).toBe('<div class="no-data-text-format">There are not contributing centers data</div>');
      expect(data[4].value).toBe('<div class="no-data-text-format">There are not contributing external partner(s) data</div>');
      expect(data[5].value).toBe('<div class="no-data-text-format">There are not Geographic location data</div>');
      expect(data[6].value).toBe('<div class="no-data-text-format">This result is not a impact reported in the PRMS Reporting Tool</div>');
      expect(data[7].value).toBe('<div class="no-data-text-format">This result is not a impact reported in the PRMS Reporting Tool</div>');
      expect(data[8].value).toBe('<div class="no-data-text-format">This result is not a impact reported in the PRMS Reporting Tool</div>');
      expect(data[9].value).toBe('<div class="no-data-text-format">There are not web legacy data</div>');
    });
    it('should set data to null when tableData is not provided', () => {
      component.tablesList = [];

      component.formatTable(null);

      expect(component.tablesList).toEqual([]);
    });
  });

  it('should set data to null if tableData is null', () => {
    const tableData = null;

    component.formatTable(tableData);

    expect(component.tablesList.length).toBe(0);
  });

  it('should call formatTable method and update tablesList', () => {
    const tableData = {
      contributing_center: 'contributing centers',
      contributing_initiative: 'contributing initiative',
      contribution_external_partner: 'contributing external partner(s)',
      countries: 'countries',
      global_targets: 'global targets',
      impact_area_id: null,
      impact_areas: null,
      is_impact: '1',
      other_impact_areas: null,
      primary_submitter: 'primary submitter',
      regions: 'regions',
      result_code: 'result code',
      result_title: 'result title',
      web_legacy: null
    };

    const expectedData = [
      {
        category: 'Result title',
        value: 'result title',
        id: 'result code'
      },
      {
        category: 'Primary submitter',
        value: 'primary submitter'
      },
      {
        category: 'Contributing Initiatives',
        value: 'contributing initiative'
      },
      {
        category: 'Contributing centers',
        value: 'contributing centers'
      },
      {
        category: 'Contributing external partner(s)',
        value: 'contributing external partner(s)'
      },
      {
        category: 'Geographic scope',
        value: '<strong>Countries:</strong><br> countries <br><br><strong>Regions:</strong><br>regions<br> '
      },
      {
        category: 'Primary Impact Area',
        value: '<div class="no-data-text-format">This result is not an impact reported in the PRMS Reporting Tool</div>'
      },
      {
        category: 'Other relevant Impact Area(s)',
        value: '<div class="no-data-text-format">This result is not an impact reported in the PRMS Reporting Tool</div>'
      },
      {
        category: 'Which collective global targets for the relevant Impact Area(s) from the CGIAR 2030 Research and Innovation Strategy does the key result contribute to?',
        value: 'global targets'
      },
      {
        category: 'Does this key result build on work or previous results from one or more CRPs?',
        value: '<div class="no-data-text-format">There is no web legacy data</div>'
      }
    ];

    component.formatTable(tableData);

    expect(component.tablesList.length).toBe(1);
    expect(component.tablesList[0].data).toEqual(expectedData);
  });

  it('should call formatTable method and update tablesList with no data text', () => {
    const tableData = {
      contributing_center: null,
      contributing_initiative: null,
      contribution_external_partner: null,
      countries: null,
      global_targets: null,
      impact_area_id: null,
      impact_areas: null,
      is_impact: '1',
      other_impact_areas: null,
      primary_submitter: null,
      regions: null,
      result_code: 'result code',
      result_title: null,
      web_legacy: null
    };

    const expectedData = [
      {
        category: 'Result title',
        value: '<div class="no-data-text-format">There is no result title data</div>',
        id: 'result code'
      },
      {
        category: 'Primary submitter',
        value: '<div class="no-data-text-format">There is no primary submitter data</div>'
      },
      {
        category: 'Contributing Initiatives',
        value: '<div class="no-data-text-format">There are no contributing Initiatives data</div>'
      },
      {
        category: 'Contributing centers',
        value: '<div class="no-data-text-format">There are no contributing centers data</div>'
      },
      {
        category: 'Contributing external partner(s)',
        value: '<div class="no-data-text-format">There are no contributing external partner(s) data</div>'
      },
      {
        category: 'Geographic scope',
        value: '<div class="no-data-text-format">There is no Geographic location data</div>'
      },
      {
        category: 'Primary Impact Area',
        value: '<div class="no-data-text-format">This result is not an impact reported in the PRMS Reporting Tool</div>'
      },
      {
        category: 'Other relevant Impact Area(s)',
        value: '<div class="no-data-text-format">This result is not an impact reported in the PRMS Reporting Tool</div>'
      },
      {
        category: 'Which collective global targets for the relevant Impact Area(s) from the CGIAR 2030 Research and Innovation Strategy does the key result contribute to?',
        value: '<div class="no-data-text-format">This result is not an impact reported in the PRMS Reporting Tool</div>'
      },
      {
        category: 'Does this key result build on work or previous results from one or more CRPs?',
        value: '<div class="no-data-text-format">There is no web legacy data</div>'
      }
    ];

    component.formatTable(tableData);

    expect(component.tablesList.length).toBe(1);
    expect(component.tablesList[0].data).toEqual(expectedData);
  });

  it('should return true if keyResultStoryData has at least one item with non-empty impact_areas', () => {
    component.typeOneReportSE.keyResultStoryData = [{ impact_areas: '[1, 2, 3]' }];

    const result = component.validateOneDropDown();

    expect(result).toBe(true);
  });

  it('should return false if keyResultStoryData does not have any item with non-empty impact_areas', () => {
    component.typeOneReportSE.keyResultStoryData = [{ impact_areas: '[]' }];

    const result = component.validateOneDropDown();

    expect(result).toBe(false);
  });
});
