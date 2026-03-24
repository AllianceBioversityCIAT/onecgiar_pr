import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ResultFrameworkReportingComponent } from './result-framework-reporting.component';
import { ApiService } from '../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

describe('ResultFrameworkReportingComponent', () => {
  let component: ResultFrameworkReportingComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(
          of({
            response: {
              mySciencePrograms: [],
              otherSciencePrograms: []
            }
          })
        ),
        GET_RecentActivity: jest.fn().mockReturnValue(of({ response: [] }))
      },
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
      imports: [RouterModule, HttpClientTestingModule]
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

    it('should call getScienceProgramsProgress and getRecentActivity on service', () => {
      const getScienceProgramsProgressSpy = jest.spyOn(component.resultFrameworkReportingHomeService, 'getScienceProgramsProgress');
      const getRecentActivitySpy = jest.spyOn(component.resultFrameworkReportingHomeService, 'getRecentActivity');

      component.ngOnInit();

      expect(getScienceProgramsProgressSpy).toHaveBeenCalled();
      expect(getRecentActivitySpy).toHaveBeenCalled();
    });
  });
});
