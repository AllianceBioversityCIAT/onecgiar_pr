import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ResultFrameworkReportingComponent } from './result-framework-reporting.component';
import { ApiService } from '../../shared/services/api/api.service';

describe('ResultFrameworkReportingComponent', () => {
  let component: ResultFrameworkReportingComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        detailSectionTitle: jest.fn()
      },
      rolesSE: {
        platformIsClosed: true
      },
      globalVariablesSE: {
        get: {
          result_is_closed: true
        }
      }
    };
    await TestBed.configureTestingModule({
      declarations: [ResultFrameworkReportingComponent],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ],
      imports: [RouterModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should set properties correctly in ngOnInit', () => {
      component.ngOnInit();
      const spy = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      expect(spy).toHaveBeenCalledWith('Results Framework & Reporting');
    });
  });
});
