import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorInitProgressAndKeyResultsComponent } from './tor-init-progress-and-key-results.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { AlertStatusComponent } from '../../../../custom-fields/alert-status/alert-status.component';
import { TooltipModule } from 'primeng/tooltip';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

describe('TorInitProgressAndKeyResultsComponent', () => {
  let component: TorInitProgressAndKeyResultsComponent;
  let fixture: ComponentFixture<TorInitProgressAndKeyResultsComponent>;
  let mockApiService: any;
  let mockExportTablesService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_excelFullReportByInitiativeId: () => of({}),
      },
      alertsFe: {
        show: jest.fn()
      },
      rolesSE: {
        isAdmin: false
      },
      dataControlSE: {
        myInitiativesList: []
      }
    };

    mockExportTablesService = {
      exportExcel: jest.fn()
    }

    await TestBed.configureTestingModule({
      declarations: [ 
        TorInitProgressAndKeyResultsComponent ,
        AlertStatusComponent,
        PrButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        TooltipModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: ExportTablesService,
          useValue: mockExportTablesService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorInitProgressAndKeyResultsComponent);
    component = fixture.componentInstance;
  });

  describe('exportExcel()', () => {
    it('should export Excel and reset requesting flag on success', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_excelFullReportByInitiativeId');
      const spyExportExcel = jest.spyOn(mockExportTablesService, 'exportExcel');
      const initiativeId = 'initiative123';

      component.exportExcel(initiativeId);
  
      expect(spy).toHaveBeenCalled();
      expect(spyExportExcel).toHaveBeenCalled();
      expect(component.requesting).toBeFalsy();
    });

    it('should show an error alert on API error', () => {
      const initiativeId = 'initiative123';
      const errorResponse = { status: 500, message: 'Internal Server Error' };
      jest.spyOn(mockApiService.resultsSE, 'GET_excelFullReportByInitiativeId')
        .mockReturnValue(throwError(errorResponse));
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
  
      component.exportExcel(initiativeId);

      expect(spy).toHaveBeenCalledWith({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.',
        status: 'error',
      });
    });
  });
});
