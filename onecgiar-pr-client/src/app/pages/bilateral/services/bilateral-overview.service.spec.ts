// @akili-spec bilateral/center-overview-tab (COV-T-3, COV-R-17, COV-R-21, COV-DD-8)
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BilateralOverviewService } from './bilateral-overview.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { FIXTURE_D1_ROWS, FIXTURE_PROJECTS } from '../pages/bilateral-overview/bilateral-overview.fixtures';

describe('BilateralOverviewService', () => {
  let service: BilateralOverviewService;
  let resultsSubjects: Subject<any>[];
  let projectsSubjects: Subject<any>[];
  let mockApi: { GET_bilateralCenterResults: jest.Mock; GET_bilateralProjects: jest.Mock };

  /** The real `GET_bilateralCenterResults` envelope: `{ response: [...] }`. */
  function respondResults(index: number, rows: unknown[]) {
    resultsSubjects[index].next({ response: rows });
    resultsSubjects[index].complete();
  }

  /** The real `GET_bilateralProjects` envelope: `{ response: { projects: [...] } }`
   *  (`bilateral-creation.service.spec.ts:62`). */
  function respondProjects(index: number, projects: unknown[]) {
    projectsSubjects[index].next({ response: { projects } });
    projectsSubjects[index].complete();
  }

  beforeEach(() => {
    resultsSubjects = [];
    projectsSubjects = [];
    mockApi = {
      GET_bilateralCenterResults: jest.fn(() => {
        const subject = new Subject<any>();
        resultsSubjects.push(subject);
        return subject.asObservable();
      }),
      GET_bilateralProjects: jest.fn(() => {
        const subject = new Subject<any>();
        projectsSubjects.push(subject);
        return subject.asObservable();
      }),
    };

    TestBed.configureTestingModule({
      providers: [BilateralOverviewService, { provide: BilateralApiService, useValue: mockApi }],
    });
    service = TestBed.inject(BilateralOverviewService);
  });

  it('load() fetches results + projects independently and stores them under the real envelope shapes', () => {
    service.load('AfricaRice', 36);
    expect(mockApi.GET_bilateralCenterResults).toHaveBeenCalledTimes(1);
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(1);
    expect(service.resultsLoading('AfricaRice', 36)()).toBe(true);
    expect(service.projectsLoading('AfricaRice')()).toBe(true);

    respondResults(0, FIXTURE_D1_ROWS);
    respondProjects(0, FIXTURE_PROJECTS);

    expect(service.resultsLoading('AfricaRice', 36)()).toBe(false);
    expect(service.projectsLoading('AfricaRice')()).toBe(false);
    expect(service.resultsData('AfricaRice', 36)()).toEqual(FIXTURE_D1_ROWS);
    expect(service.projectsData('AfricaRice')()).toEqual(FIXTURE_PROJECTS);

    const entry = service.entry('AfricaRice', 36)();
    expect(entry).toEqual({
      results: FIXTURE_D1_ROWS,
      projects: FIXTURE_PROJECTS,
      resultsError: null,
      projectsError: null,
      loading: false,
    });
  });

  it('cache hit avoids a second HTTP call for the same key', () => {
    service.load('AfricaRice', 36);
    respondResults(0, FIXTURE_D1_ROWS);
    respondProjects(0, FIXTURE_PROJECTS);

    service.load('AfricaRice', 36); // returning to the tab — same center::version
    expect(mockApi.GET_bilateralCenterResults).toHaveBeenCalledTimes(1);
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(1);
  });

  it('projects are cached per center: a phase switch on the same center does not refetch projects', () => {
    service.load('AfricaRice', 36);
    respondResults(0, FIXTURE_D1_ROWS);
    respondProjects(0, FIXTURE_PROJECTS);

    service.load('AfricaRice', 35); // different version, same center
    expect(mockApi.GET_bilateralCenterResults).toHaveBeenCalledTimes(2);
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(1); // reused from the center cache

    respondResults(1, []);
    expect(service.projectsData('AfricaRice')()).toEqual(FIXTURE_PROJECTS);
    expect(service.resultsData('AfricaRice', 35)()).toEqual([]);
  });

  it('COV-R-17: results call fails AND projects call succeeds → projects stay readable, resultsError set', () => {
    service.load('AfricaRice', 36);
    resultsSubjects[0].error(new Error('boom'));
    respondProjects(0, FIXTURE_PROJECTS);

    const entry = service.entry('AfricaRice', 36)();
    expect(entry.resultsError).not.toBeNull();
    expect(entry.results).toBeNull();
    expect(entry.projects).toEqual(FIXTURE_PROJECTS); // "Projects covered" can still show "0 of N"
    expect(entry.projectsError).toBeNull();
    expect(entry.loading).toBe(false);
  });

  it('projects call fails AND results call succeeds → results stay readable, projectsError set', () => {
    service.load('AfricaRice', 36);
    respondResults(0, FIXTURE_D1_ROWS);
    projectsSubjects[0].error(new Error('boom'));

    const entry = service.entry('AfricaRice', 36)();
    expect(entry.projectsError).not.toBeNull();
    expect(entry.projects).toBeNull();
    expect(entry.results).toEqual(FIXTURE_D1_ROWS);
    expect(entry.resultsError).toBeNull();
    expect(entry.loading).toBe(false);
  });

  it('out-of-order responses: key B resolving before key A leaves key A intact and key B rendered', () => {
    service.load('AfricaRice', 36); // key A — results call index 0
    service.load('AfricaRice', 35); // key B — results call index 1

    // Projects are keyed by center, not by version: the second load joins the ONE in-flight
    // projects call rather than issuing a second one, so there is no `projectsSubjects[1]`.
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(1);

    // B resolves first
    respondResults(1, [FIXTURE_D1_ROWS[0]]);
    respondProjects(0, FIXTURE_PROJECTS);

    expect(service.resultsData('AfricaRice', 35)()).toEqual([FIXTURE_D1_ROWS[0]]);
    expect(service.resultsData('AfricaRice', 36)()).toBeNull(); // A still pending — not corrupted by B's data

    // A resolves late
    respondResults(0, FIXTURE_D1_ROWS);

    expect(service.resultsData('AfricaRice', 36)()).toEqual(FIXTURE_D1_ROWS);
    expect(service.resultsData('AfricaRice', 35)()).toEqual([FIXTURE_D1_ROWS[0]]); // untouched by A's late arrival
  });

  it('invalidate() always retries results, but only retries projects if projects previously errored', () => {
    service.load('AfricaRice', 36);
    respondResults(0, FIXTURE_D1_ROWS);
    respondProjects(0, FIXTURE_PROJECTS);

    service.invalidate('AfricaRice', 36);
    expect(mockApi.GET_bilateralCenterResults).toHaveBeenCalledTimes(2); // results always retried
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(1); // a successful projects list is NOT refetched
    expect(service.resultsData('AfricaRice', 36)()).toBeNull(); // cleared while the refetch is in flight
    expect(service.projectsData('AfricaRice')()).toEqual(FIXTURE_PROJECTS); // untouched

    respondResults(1, []);
    expect(service.resultsData('AfricaRice', 36)()).toEqual([]);
  });

  it('invalidate() refetches projects too when projects previously errored', () => {
    service.load('AfricaRice', 36);
    respondResults(0, FIXTURE_D1_ROWS);
    projectsSubjects[0].error(new Error('boom'));

    service.invalidate('AfricaRice', 36);
    expect(mockApi.GET_bilateralCenterResults).toHaveBeenCalledTimes(2);
    expect(mockApi.GET_bilateralProjects).toHaveBeenCalledTimes(2); // the failed stream IS retried
    expect(service.projectsData('AfricaRice')()).toBeNull();
    expect(service.projectsError('AfricaRice')()).toBeNull(); // cleared while the retry is in flight

    respondResults(1, FIXTURE_D1_ROWS);
    respondProjects(1, FIXTURE_PROJECTS);
    expect(service.projectsData('AfricaRice')()).toEqual(FIXTURE_PROJECTS);
  });
});
