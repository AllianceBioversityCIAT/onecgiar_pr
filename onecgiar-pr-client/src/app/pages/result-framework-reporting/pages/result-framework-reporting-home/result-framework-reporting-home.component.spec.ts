import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultFrameworkReportingHomeComponent } from './result-framework-reporting-home.component';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

describe('ResultFrameworkReportingHomeComponent', () => {
  let component: ResultFrameworkReportingHomeComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingHomeComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_ScienceProgramsProgress: jest.fn().mockReturnValue(of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })),
        GET_RecentActivity: jest.fn().mockReturnValue(of({ response: [] }))
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
      imports: [RouterModule, ResultFrameworkReportingHomeComponent, HttpClientTestingModule, CustomFieldsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingHomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
