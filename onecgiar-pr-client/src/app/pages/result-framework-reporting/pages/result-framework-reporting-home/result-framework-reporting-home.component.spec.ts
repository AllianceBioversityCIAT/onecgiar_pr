import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingHomeComponent } from './result-framework-reporting-home.component';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultFrameworkReportingHomeComponent', () => {
  let component: ResultFrameworkReportingHomeComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingHomeComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } }))
      }
    };
    await TestBed.configureTestingModule({
      declarations: [],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ],
      imports: [RouterModule, ResultFrameworkReportingHomeComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingHomeComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should set properties correctly in ngOnInit', () => {
      const spy = jest.spyOn(component, 'getScienceProgramsProgress');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });
});
