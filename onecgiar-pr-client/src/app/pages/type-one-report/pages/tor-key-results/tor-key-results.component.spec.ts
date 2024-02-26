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
    const name = 'Initiative short name';
    const expectedValue = `This section provides an overview of results reported by the CGIAR Initiative on <strong>${name}</strong>. These results align with the CGIAR Results Framework and <strong>${name}</strong> theory of change.
  The following diagrams have been produced using quality assessed reported results and the information is a cumulative overview of quality assessed reported results from 2022 and 2023.<br>
  Further information on these results is available through the <a class="open_route" href="https://www.cgiar.org/food-security-impact/new-results-dashboard/" target="_blank">CGIAR Results Dashboard</a>.
  `;

    const result = component.keyResultsDesc(name);

    expect(result).toEqual(expectedValue);
  });

  it('should call the API service and export tables service with the correct parameters', () => {
    const initiativeSelected = 'mockInitiative';

    component.exportExcel(initiativeSelected);

    expect(mockApiService.resultsSE.GET_excelFullReportByInitiativeId).toHaveBeenCalledWith(component.typeOneReportSE.getInitiativeID(initiativeSelected)?.id, component.typeOneReportSE.phaseSelected);
    expect(mockExportTablesService.exportExcel).toHaveBeenCalledWith('mockResponse', 'Initiative-progress-and-key-results');
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
});
