import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingHomeComponent } from './result-framework-reporting-home.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultFrameworkReportingHomeService } from './services/result-framework-reporting-home.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('ResultFrameworkReportingHomeComponent', () => {
  let component: ResultFrameworkReportingHomeComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultFrameworkReportingHomeComponent],
      providers: [
        // The page routes now: the cycle strip links to the result creator and the Results Center,
        // and every "where you report" row is a routerLink.
        provideRouter([]),
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              reportingPhaseVersion: () => 1,
              reportingCurrentPhase: { phaseName: 'Reporting 2026', portfolioAcronym: 'P25' }
            },
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
            mySPsList: () => [
              {
                initiativeId: 1,
                initiativeCode: 'SP01',
                initiativeName: 'Breeding for Tomorrow',
                initiativeShortName: 'Breeding for Tomorrow',
                versions: [
                  // 🛑 The version name carries the portfolio; the phase name does not. Matching
                  // them with `===` showed 0 for a programme with 142 results — that is what this
                  // fixture is here to keep from coming back.
                  {
                    phaseName: 'Reporting 2026 - P25',
                    phaseYear: 2026,
                    totalResults: 142,
                    statuses: [
                      { statusId: 1, statusName: 'Editing', count: 128 },
                      { statusId: 2, statusName: 'Quality Assessed', count: 2 },
                      { statusId: 3, statusName: 'Submitted', count: 11 },
                      { statusId: 4, statusName: 'Discontinued', count: 1 }
                    ]
                  },
                  { phaseName: 'Reporting 2025 - P25', phaseYear: 2025, totalResults: 99, statuses: [{ statusId: 1, statusName: 'Editing', count: 99 }] }
                ]
              }
            ],
            otherSPsList: () => [],
            otherProjectsList: () => [],
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

  // ------------------------------------------------------------------ home redesign
  it('counts the CURRENT phase only, matching the version name that carries the portfolio', () => {
    const totals = component.myStatusTotals();

    // 142, not 241: the 2025 version must not be added in.
    expect(totals.total).toBe(142);
    expect(totals.tiles.map(tile => [tile.label, tile.count])).toEqual([
      ['QAed', 2],
      ['Submitted', 11],
      ['Editing', 128],
      ['Discontinued', 1]
    ]);
  });

  it('lists programmes and centres as one list, with reported progress on the programme', () => {
    const places = component.myPlaces();

    expect(places.map(place => place.kind)).toEqual(['program', 'center']);
    const programme = places[0];
    expect(programme.code).toBe('SP01');
    // Reported = Submitted + Quality Assessed. 13 of 142 → 9%.
    expect(programme.reported).toBe(13);
    expect(programme.total).toBe(142);
    expect(programme.percent).toBe(9);
    expect(programme.link).toEqual(['/result-framework-reporting/entity-details', 'SP01']);
    expect(places[1].link).toEqual(['/bilateral', 'CIMMYT', 'home']);
  });

  it('shows no numbers at all when the phase cannot be resolved, instead of summing every phase', () => {
    const api = TestBed.inject(ApiService) as unknown as { dataControlSE: { reportingCurrentPhase: unknown } };
    api.dataControlSE.reportingCurrentPhase = null;

    const fresh = TestBed.createComponent(ResultFrameworkReportingHomeComponent).componentInstance;
    expect(fresh.myStatusTotals().total).toBe(0);
    expect(fresh.myPlaces()[0].total).toBe(0);
  });

  it('keeps the rest of the portfolio closed until asked for', () => {
    expect(component.exploreOpen()).toBe(false);
  });
});
