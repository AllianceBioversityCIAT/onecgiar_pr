import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingHomeComponent } from './result-framework-reporting-home.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { of } from 'rxjs';

describe('ResultFrameworkReportingHomeComponent', () => {
  let component: ResultFrameworkReportingHomeComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingHomeComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            authSE: { localStorageUser: { user_name: 'Test User' } },
            resultsSE: {
              GET_RecentActivity: () => of({ response: [] }),
              GET_ScienceProgramsProgress: () =>
                of({ response: { mySciencePrograms: [], otherSciencePrograms: [] } })
            }
          }
        },
        {
          provide: RolesService,
          useValue: {
            getMyCenters: () => [
              { center_id: 'CIMMYT', center_name: 'CIMMYT', center_acronym: 'CIMMYT', role_id: 9, role_name: 'Center User' }
            ]
          }
        },
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: () => [],
            otherSPsList: () => [],
            recentActivityList: () => [],
            isLoadingSPLists: () => false,
            isLoadingRecentActivity: () => false,
            getRecentActivity: jest.fn(),
            getScienceProgramsProgress: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingHomeComponent);
    component = fixture.componentInstance;
  });

  it('should expose assigned centers from roles service', () => {
    expect(component.myCentersList()).toHaveLength(1);
    expect(component.myCentersList()[0].center_id).toBe('CIMMYT');
  });
});
