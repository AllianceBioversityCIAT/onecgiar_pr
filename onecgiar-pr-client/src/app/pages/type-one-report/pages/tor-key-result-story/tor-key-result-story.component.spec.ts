import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorKeyResultStoryComponent } from './tor-key-result-story.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../custom-fields/no-data-text/no-data-text.component';

describe('TorKeyResultStoryComponent', () => {
  let component: TorKeyResultStoryComponent;
  let fixture: ComponentFixture<TorKeyResultStoryComponent>;
  let apiService: ApiService;
  let typeOneReportService: TypeOneReportService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TorKeyResultStoryComponent, NoDataTextComponent],
      providers: [ApiService, TypeOneReportService],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKeyResultStoryComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    typeOneReportService = TestBed.inject(TypeOneReportService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GET_keyResultStoryInitiativeId method and set keyResultStoryData and tablesList', () => {
    const initiativeId = 1;
    // const phaseSelected = 18;
    const response = [{ contributing_center: 'contributing centers', contributing_initiative: 'contributing initiative', contribution_external_partner: 'contributing external partner(s)', countries: 'countries', global_targets: 'global targets', impact_area_id: null, impact_areas: null, is_impact: '1', other_impact_areas: null, primary_submitter: 'primary submitter', regions: 'regions', result_code: 'result code', result_title: 'result title', web_legacy: null }];

    jest.spyOn(typeOneReportService, 'getInitiativeID').mockReturnValue({ id: initiativeId });
    jest.spyOn(apiService.resultsSE, 'GET_keyResultStoryInitiativeId').mockReturnValue(of({ response }));

    component.GET_keyResultStoryInitiativeId();

    expect(typeOneReportService.getInitiativeID).toHaveBeenCalledWith(typeOneReportService.initiativeSelected);
    // expect(apiService.resultsSE.GET_keyResultStoryInitiativeId).toHaveBeenCalledWith(initiativeId, phaseSelected);
    expect(typeOneReportService.keyResultStoryData).toEqual(response);
    expect(component.tablesList.length).toBe(1);
  });

  it('should call onSaveSection method and call PATCH_primaryImpactAreaKrs method', () => {
    const keyResultStoryData = [{ data: 'value' }];

    jest.spyOn(apiService.resultsSE, 'PATCH_primaryImpactAreaKrs').mockReturnValue(of({}));
    jest.spyOn(component, 'GET_keyResultStoryInitiativeId');
    jest.spyOn(apiService.alertsFe, 'show');

    component.typeOneReportSE.keyResultStoryData = keyResultStoryData;
    component.onSaveSection();

    expect(apiService.resultsSE.PATCH_primaryImpactAreaKrs).toHaveBeenCalledWith(keyResultStoryData);
    expect(component.GET_keyResultStoryInitiativeId).toHaveBeenCalled();
    expect(apiService.alertsFe.show).toHaveBeenCalledWith({
      id: 'save-button',
      title: 'Key result story informaion saved correctly',
      description: '',
      status: 'success',
      closeIn: 500
    });
  });

  it('should console log the error if onSaveSection method fails', () => {
    const error = 'error';

    jest.spyOn(apiService.resultsSE, 'PATCH_primaryImpactAreaKrs').mockReturnValue(throwError(error));
    const consoleErrorSpy = jest.spyOn(console, 'error');

    component.onSaveSection();

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
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
