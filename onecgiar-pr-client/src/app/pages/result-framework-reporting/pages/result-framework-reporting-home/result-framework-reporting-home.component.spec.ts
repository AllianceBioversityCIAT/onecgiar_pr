import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingHomeComponent } from './result-framework-reporting-home.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { of } from 'rxjs';

describe('ResultFrameworkReportingHomeComponent', () => {
  let component: ResultFrameworkReportingHomeComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingHomeComponent>;
  const dataControlStub = { reportingPhaseVersion: () => 0, reportingCurrentPhase: { phaseYear: 2026 } as { phaseYear: number | null } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingHomeComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: dataControlStub,
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
            rolesVersion: 0,
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

  describe('hidden centers by phase year', () => {
    const allCenters = [
      { center_id: 'CIMMYT', center_name: 'CIMMYT', center_acronym: 'CIMMYT', role_id: 9, role_name: 'Center User' },
      { center_id: 'ICRAF', center_name: 'ICRAF', center_acronym: 'ICRAF', role_id: 9, role_name: 'Center User' },
      { center_id: 'CIFOR', center_name: 'CIFOR', center_acronym: 'cifor', role_id: 9, role_name: 'Center User' }
    ];
    let getMyCenters: jest.Mock;

    beforeEach(() => {
      getMyCenters = jest.fn(() => allCenters);
      TestBed.inject(RolesService).getMyCenters = getMyCenters as any;
    });

    it('hides ICRAF and CIFOR (case-insensitive) in 2026', () => {
      dataControlStub.reportingCurrentPhase = { phaseYear: 2026 };
      expect(component.myCentersList()).toHaveLength(1);
      expect(component.myCentersList()[0].center_id).toBe('CIMMYT');
    });

    it('shows all centers in 2025', () => {
      dataControlStub.reportingCurrentPhase = { phaseYear: 2025 };
      expect(component.myCentersList()).toHaveLength(3);
    });

    it('shows all centers while the phase year is null', () => {
      dataControlStub.reportingCurrentPhase = { phaseYear: null };
      expect(component.myCentersList()).toHaveLength(3);
    });

    it('does not filter the roles service source list', () => {
      dataControlStub.reportingCurrentPhase = { phaseYear: 2026 };
      component.myCentersList();
      expect(TestBed.inject(RolesService).getMyCenters()).toHaveLength(3);
    });
  });

  it('should expose assigned centers from roles service', () => {
    expect(component.myCentersList()).toHaveLength(1);
    expect(component.myCentersList()[0].center_id).toBe('CIMMYT');
  });
});
