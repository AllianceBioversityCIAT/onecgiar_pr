import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorKeyResultsComponent } from './tor-key-results.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { of, throwError } from 'rxjs';
import { AlertStatusComponent } from '../../../../custom-fields/alert-status/alert-status.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';

describe('TorKeyResultsComponent', () => {
  let component: TorKeyResultsComponent;
  let fixture: ComponentFixture<TorKeyResultsComponent>;
  let mockApiService: any;
  let mockExportTablesService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_excelFullReportByInitiativeId: jest.fn().mockReturnValue(of({ response: 'mockResponse' })),
        GET_platformGlobalVariablesByCategoryId: jest.fn().mockReturnValue(of([]))
      },
      rolesSE: {
        isAdmin: true
      },
      alertsFe: {
        show: jest.fn()
      }
    };
    mockExportTablesService = {
      exportExcel: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [TorKeyResultsComponent, AlertStatusComponent, PrButtonComponent],
      imports: [HttpClientTestingModule, TooltipModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ExportTablesService, useValue: mockExportTablesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TorKeyResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have keyResultsDesc property', () => {
    expect(component.keyResultsDesc).toBeDefined();
  });

  it('should return the correct description', () => {
    const initiativeShortName = 'Initiative short name';
    const expectedValue = `This section provides an overview of results reported and contributed to, by the CGIAR Research Initiative on ${initiativeShortName} from 2022 to 2024. These results align with the CGIAR Results Framework and ${initiativeShortName}’s theory of change. <br/><br/>
    The data used to create the graphics in this section were sourced from the CGIAR Results Dashboard on March 3rd, 2025. These results are accurate as of this date and may differ from information in previous Technical Reports. Such differences may be due to data updates throughout the reporting year, revisions to previously reported results, or updates to the theory of change. <br/><br/>
    If you need assistance selecting graphs for inclusion in your annual technical report, and/or if you require support in developing additional graphs beyond those included in this section, please contact us at <a class="open_route" href="mailto:performanceandresults@cgiar.org" target="_blank">performanceandresults@cgiar.org</a>.`;

    const result = component.keyResultsDesc(initiativeShortName);

    expect(result).toEqual(expectedValue);
  });

  it('should call the API service and export tables service with the correct parameters', () => {
    const initiativeSelected = 'mockInitiative';
    const mockColumns = [{ header: '0', key: '0', width: 24 }];

    component.exportExcel(initiativeSelected);

    expect(mockApiService.resultsSE.GET_excelFullReportByInitiativeId).toHaveBeenCalledWith(
      component.typeOneReportSE.getInitiativeID(initiativeSelected)?.id,
      component.typeOneReportSE.phaseDefaultId
    );
    expect(mockExportTablesService.exportExcel).toHaveBeenCalledWith('mockResponse', 'Initiative-progress-and-key-results', mockColumns);
  });

  it('should set requesting to false after exporting the excel', () => {
    const initiativeSelected = 'mockInitiative';

    component.exportExcel(initiativeSelected);

    expect(component.requesting).toBe(false);
  });

  it('should show an error alert if there is an error in the API call', () => {
    const initiativeSelected = 'mockInitiative';
    const mockError = new Error('mockError');

    mockApiService.resultsSE.GET_excelFullReportByInitiativeId.mockReturnValue(throwError(mockError));

    component.exportExcel(initiativeSelected);

    expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
      id: 'loginAlert',
      title: 'Oops!',
      description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.',
      status: 'error'
    });
  });

  describe('generateColumns', () => {
    it('should return empty array if input data is empty', () => {
      const result = component['generateColumns']([]);
      expect(result).toEqual([]);
    });

    it('should generate columns with correct formatting', () => {
      const mockData = [
        {
          first_name: 'John',
          last_name: 'Doe',
          user_id: 123
        }
      ];

      const expectedColumns = [
        {
          header: 'First Name',
          key: 'first_name',
          width: 24
        },
        {
          header: 'Last Name',
          key: 'last_name',
          width: 24
        },
        {
          header: 'User Id',
          key: 'user_id',
          width: 24
        }
      ];

      const result = component['generateColumns'](mockData);
      expect(result).toEqual(expectedColumns);
    });

    it('should handle single word keys correctly', () => {
      const mockData = [
        {
          name: 'Test',
          age: 25
        }
      ];

      const expectedColumns = [
        {
          header: 'Name',
          key: 'name',
          width: 24
        },
        {
          header: 'Age',
          key: 'age',
          width: 24
        }
      ];

      const result = component['generateColumns'](mockData);
      expect(result).toEqual(expectedColumns);
    });
  });
});
