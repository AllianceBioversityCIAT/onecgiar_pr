import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralManualCreateFlowService } from './bilateral-manual-create-flow.service';
import { BilateralOverviewService } from './bilateral-overview.service';

describe('BilateralManualCreateFlowService', () => {
  let service: BilateralManualCreateFlowService;
  let creationService: BilateralCreationService;
  let router: { navigate: jest.Mock; events: Subject<unknown>; url: string };
  let mockOverviewService: { invalidate: jest.Mock };
  let rolesSE: { getMyCenters: jest.Mock; rolesVersion: number; isAdmin: boolean };
  let bilateralApiMock: { POST_createBilateralHeader: jest.Mock; GET_bilateralProjects: jest.Mock };
  let alertsFeShow: jest.Mock;

  /** A Center User assignment for the centre every existing test above opens as (`AfricaRice`). */
  const AFRICARICE_MEMBER = { center_id: 'AfricaRice', center_acronym: 'AfricaRice', role_id: 9 };

  const singleSpProject = {
    id: 101,
    shortName: 'B-A1080',
    fullName: 'Project',
    summary: null,
    description: null,
    leadCenter: null,
    sciencePrograms: [{ programId: 1, programCode: 'SP13', allocation: '100', spName: 'Genebank', spShortName: 'GENE' }]
  } as any;

  beforeEach(() => {
    router = { navigate: jest.fn().mockResolvedValue(true), events: new Subject<unknown>(), url: '/bilateral/AfricaRice/home' };
    mockOverviewService = { invalidate: jest.fn() };
    alertsFeShow = jest.fn();
    bilateralApiMock = {
      POST_createBilateralHeader: jest.fn().mockReturnValue(of({ response: { id: 99 } })),
      GET_bilateralProjects: jest.fn()
    };
    // `ASC-T-5` rework: defaults to a Center User of `AfricaRice`, the centre `ctx.setCenter`
    // opens as below, so every pre-existing test in this file (none of which touches `canUseAi`)
    // keeps seeing what it saw before this membership check existed.
    rolesSE = { getMyCenters: jest.fn().mockReturnValue([AFRICARICE_MEMBER]), rolesVersion: 0, isAdmin: false };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BilateralManualCreateFlowService,
        BilateralCreationService,
        BilateralContextService,
        { provide: Router, useValue: router },
        { provide: BilateralOverviewService, useValue: mockOverviewService },
        { provide: BilateralApiService, useValue: bilateralApiMock },
        {
          provide: ApiService,
          useValue: {
            alertsFe: { show: alertsFeShow },
            resultsSE: {},
            dataControlSE: {},
            get rolesSE() {
              return rolesSE;
            }
          }
        }
      ]
    });
    service = TestBed.inject(BilateralManualCreateFlowService);
    creationService = TestBed.inject(BilateralCreationService);
    const ctx = TestBed.inject(BilateralContextService);
    ctx.setCenter('AfricaRice', 'Africa Rice Center', 'AfricaRice');
    jest.spyOn(creationService, 'createResult').mockReturnValue(
      of({ response: { id: 99, result_code: 5001, version_id: 36 } }) as any
    );
  });

  it('opens the drawer from a home project card without navigating away', () => {
    const event = { preventDefault: jest.fn() } as unknown as Event;
    service.beginFromProject(singleSpProject, event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(service.drawerOpen()).toBe(true);
    expect(creationService.selectedProject()?.shortName).toBe('B-A1080');
    expect(creationService.selectedPrimarySp()?.programCode).toBe('SP13');
    expect(service.canShowCreateForm()).toBe(true);
    expect(service.selectedReportingWay()).toBeNull();
    expect(service.drawerProjectTitle()).toBe('Project');
  });

  // P2-3756: CLARISA fills these two fields independently, so the drawer renders whichever ones
  // actually have content. Each case below is one shape seen in `clarisa_projects`.
  it('keeps summary and description apart when the project carries both', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: 'Climate adaptation training across partner countries',
      description: 'Longer description text',
    });

    expect(service.drawerProjectSummary()).toBe('Climate adaptation training across partner countries');
    expect(service.drawerProjectDescription()).toBe('Longer description text');
  });

  it('treats a null summary and an empty-string description as absent (2026 projects)', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: null,
      description: '   ',
    });

    expect(service.drawerProjectSummary()).toBe('');
    expect(service.drawerProjectDescription()).toBe('');
  });

  it('keeps the description when only it is filled', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: null,
      description: 'Technical and Scientific Support for Groundwater Management in Laos',
    });

    expect(service.drawerProjectSummary()).toBe('');
    expect(service.drawerProjectDescription()).toBe(
      'Technical and Scientific Support for Groundwater Management in Laos'
    );
  });

  it('drops the description when it only repeats the summary', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: 'Fertilize Right Vietnam',
      description: 'fertilize right vietnam',
    });

    expect(service.drawerProjectSummary()).toBe('Fertilize Right Vietnam');
    expect(service.drawerProjectDescription()).toBe('');
  });

  it('drops text that only repeats the project title already shown above it', () => {
    service.beginFromProject({
      ...singleSpProject,
      fullName: 'Project',
      summary: 'project',
      description: 'Project',
    });

    expect(service.drawerProjectSummary()).toBe('');
    expect(service.drawerProjectDescription()).toBe('');
  });

  it('forwards CLARISA summary, description, and lead center for KP project match', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: 'Fertilize Right Vietnam',
      description: 'Regional fertilize-right work',
      leadCenter: { id: 1, name: 'IRRI', acronym: 'IRRI' }
    });
    expect(service.drawerProjectSummary()).toBe('Fertilize Right Vietnam');
    expect(service.drawerProjectDescription()).toBe('Regional fertilize-right work');
    expect(service.drawerLeadCenterAcronym()).toBe('IRRI');
  });

  it('opens manual form directly when the wizard already chose manual', () => {
    service.openDrawerForManual();
    expect(service.drawerOpen()).toBe(true);
    expect(service.selectedReportingWay()).toBe('manual');
    expect(service.canGoBack()).toBe(true);
  });

  it('goes back from manual form to reporting way selection', () => {
    service.beginFromProject(singleSpProject);
    service.selectReportingWay('manual');
    service.goBack();
    expect(service.selectedReportingWay()).toBeNull();
  });

  it('keeps the selected SP when going back from a reporting way to the combined setup page', () => {
    service.beginFromProject({
      ...singleSpProject,
      sciencePrograms: [
        { programId: 1, programCode: 'SP01', allocation: '80', spName: 'One', spShortName: 'O1' },
        { programId: 2, programCode: 'SP02', allocation: '20', spName: 'Two', spShortName: 'O2' }
      ]
    });
    creationService.selectPrimarySp({ programId: 1, programCode: 'SP01', allocation: '80' });
    service.selectReportingWay('manual');
    service.goBack();
    expect(service.selectedReportingWay()).toBeNull();
    expect(creationService.selectedPrimarySp()?.programCode).toBe('SP01');
    expect(service.canGoBack()).toBe(false);
  });

  it('shows combined setup for multi-program projects until SP and way are chosen', () => {
    service.beginFromProject({
      ...singleSpProject,
      sciencePrograms: [
        { programId: 1, programCode: 'SP01', allocation: '80', spName: 'One', spShortName: 'O1' },
        { programId: 2, programCode: 'SP02', allocation: '20', spName: 'Two', spShortName: 'O2' }
      ]
    });
    expect(service.drawerOpen()).toBe(true);
    expect(service.canShowCreateForm()).toBe(false);
    expect(service.showSpSelectionInDrawer()).toBe(true);
    expect(service.selectedReportingWay()).toBeNull();
  });

  it('submits create with title and navigates to the editor', () => {
    creationService.selectProject(singleSpProject);
    creationService.selectPrimarySp({ programId: 1, programCode: 'SP13', allocation: '100' });
    service.submitCreate({ levelId: 4, typeId: 8, title: 'Manual title' });
    expect(creationService.createResult).toHaveBeenCalledWith(4, 8, undefined, 'Manual title');
    expect(mockOverviewService.invalidate).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
    expect(service.drawerOpen()).toBe(false);
  });

  // Night sweep 2026-09-23, C-2: a fast double-click on "Create and continue" created two identical
  // results. Control negative: without the `isCreating()` re-entry guard createResult is called twice.
  it('C-2: ignores a second submit while the first create is still in flight', () => {
    const pending = new Subject<any>();
    (creationService.createResult as jest.Mock).mockReturnValue(pending.asObservable());
    creationService.selectProject(singleSpProject);
    creationService.selectPrimarySp({ programId: 1, programCode: 'SP13', allocation: '100' });

    service.submitCreate({ levelId: 4, typeId: 8, title: 'Manual title' });
    service.submitCreate({ levelId: 4, typeId: 8, title: 'Manual title' });

    expect(creationService.createResult).toHaveBeenCalledTimes(1);
  });

  // `ASC-T-5` rework (`ASC-R-15`, `ASC-AC-13`): the reviewer-found gap. This service's `canUseAi`
  // is the REAL entry point both the bilateral-home "+ Create result" and the in-wizard drawer
  // read from — hiding only the wizard's own inline selector left this one wide open.
  describe('canUseAi — membership gate (ASC-T-5 rework)', () => {
    it('is true for a Center User of the current centre, project and SP selected', () => {
      service.beginFromProject(singleSpProject);
      expect(service.canUseAi()).toBe(true);
    });

    it('ASC-AC-13 — is false for an admin who is not a Center User of the current centre', () => {
      rolesSE.getMyCenters.mockReturnValue([]);
      rolesSE.isAdmin = true;
      service.beginFromProject(singleSpProject);
      expect(service.canUseAi()).toBe(false);
    });

    it('is false while no project/SP is selected, even for a member', () => {
      expect(service.canUseAi()).toBe(false);
    });
  });

  // `ARM-T-1` (P2-3853, docs/specs/bilateral/ai-queue-report-manually) — the AI drawer's
  // "Report manually" entry point. `design.md` §7.1-7.3, §7.2 (in-place rule), DD-2, DD-4, DD-6.
  describe('beginFromJob (ARM-T-1)', () => {
    const twoProgramProject = {
      id: 500,
      shortName: 'B-J500',
      fullName: 'Two Program Job Project',
      summary: null,
      description: null,
      leadCenter: null,
      sciencePrograms: [
        { programId: 10, programCode: 'SP10', allocation: '50', spName: 'Ten', spShortName: 'T10' },
        { programId: 11, programCode: 'SP11', allocation: '50', spName: 'Eleven', spShortName: 'T11' }
      ]
    } as any;

    const oneProgramJobProject = {
      id: 501,
      shortName: 'B-J501',
      fullName: 'One Program Job Project',
      summary: null,
      description: null,
      leadCenter: null,
      sciencePrograms: [
        { programId: 12, programCode: 'SP12', allocation: '100', spName: 'Twelve', spShortName: 'T12' }
      ]
    } as any;

    // design.md §7.2 "in-place" rule: seg1 = 'bilateral', seg2 = job.centerAcronym, seg3 !== 'result'.
    describe('the in-place rule (ARM-R-1, ARM-R-2, design §7.2)', () => {
      const job = { projectId: 500, centerId: 77, centerAcronym: 'CIP' };

      beforeEach(() => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [] } }));
      });

      it('/bilateral/CIP/drafts + job CIP: stays in place, no navigate', () => {
        router.url = '/bilateral/CIP/drafts';
        service.beginFromJob(job);
        expect(router.navigate).not.toHaveBeenCalled();
      });

      it('/bilateral/CIP/result/123 + job CIP: navigates home (ARM-R-2 D, result editor)', () => {
        router.url = '/bilateral/CIP/result/123';
        service.beginFromJob(job);
        expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'CIP', 'home']);
      });

      it('/bilateral/ABC/home + job CIP: navigates to CIP home with no second argument (ARM-R-2 A)', () => {
        router.url = '/bilateral/ABC/home';
        service.beginFromJob(job);
        expect(router.navigate.mock.calls[0]).toEqual([['/bilateral', 'CIP', 'home']]);
      });

      it('/result/framework + job CIP: navigates home (ARM-R-2 C, outside bilateral)', () => {
        router.url = '/result/framework';
        service.beginFromJob(job);
        expect(router.navigate).toHaveBeenCalledWith(['/bilateral', 'CIP', 'home']);
      });
    });

    describe('resolving the job project (ARM-R-1 A/B, ARM-R-4 A)', () => {
      beforeEach(() => {
        router.url = '/bilateral/CIP/drafts';
      });

      it('a project with 2+ Programs opens with no Program/way chosen (ARM-R-1 A)', () => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [twoProgramProject] } }));
        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });

        expect(service.drawerOpen()).toBe(true);
        expect(service.selectedReportingWay()).toBeNull();
        expect(creationService.selectedPrimarySp()).toBeNull();
        expect(bilateralApiMock.GET_bilateralProjects).toHaveBeenCalledTimes(1);
      });

      it('a project with exactly 1 Program auto-picks it, way stays unset (ARM-R-1 B)', () => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [oneProgramJobProject] } }));
        service.beginFromJob({ projectId: 501, centerId: 77, centerAcronym: 'CIP' });

        expect(service.drawerOpen()).toBe(true);
        expect(creationService.selectedPrimarySp()?.programCode).toBe('SP12');
        expect(service.selectedReportingWay()).toBeNull();
      });

      it('does not populate the create wizard project catalogue (ARM-DD-2)', () => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [twoProgramProject] } }));
        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
        expect(creationService.projects()).toEqual([]);
      });

      it('opens only once the deferred catalogue resolves, never empty in between (ARM-R-4 A)', () => {
        const projects$ = new Subject<any>();
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(projects$.asObservable());

        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
        expect(service.drawerOpen()).toBe(false);

        projects$.next({ response: { projects: [twoProgramProject] } });
        expect(service.drawerOpen()).toBe(true);
      });

      it('a stale first response never opens the drawer once a second call supersedes it (ARM-R-4 A guard)', () => {
        const first$ = new Subject<any>();
        const second$ = new Subject<any>();
        bilateralApiMock.GET_bilateralProjects
          .mockReturnValueOnce(first$.asObservable())
          .mockReturnValueOnce(second$.asObservable());

        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
        service.beginFromJob({ projectId: 501, centerId: 77, centerAcronym: 'CIP' });

        second$.next({ response: { projects: [oneProgramJobProject] } });
        first$.next({ response: { projects: [twoProgramProject] } });

        expect(creationService.selectedProject()?.id).toBe(501);
        expect(bilateralApiMock.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      });

      it('shows a toast and keeps the drawer closed when the project is not in the catalogue (ARM-R-4 B)', () => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [] } }));
        const externalEntrySpy = jest.fn();
        service.externalEntry.subscribe(externalEntrySpy);

        service.beginFromJob({ projectId: 999, centerId: 77, centerAcronym: 'CIP' });

        expect(alertsFeShow).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
        expect(service.drawerOpen()).toBe(false);
        expect(externalEntrySpy).not.toHaveBeenCalled();
      });

      it('shows a toast and keeps the drawer closed on a request error (ARM-R-4 B)', () => {
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(throwError(() => new Error('boom')));

        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });

        expect(alertsFeShow).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
        expect(service.drawerOpen()).toBe(false);
      });
    });

    it.each([
      ['projectId', { projectId: null, centerId: 77, centerAcronym: 'CIP' }],
      ['centerId', { projectId: 500, centerId: null, centerAcronym: 'CIP' }],
      ['centerAcronym', { projectId: 500, centerId: 77, centerAcronym: null }]
    ])('is a no-op when %s is missing — no HTTP, no navigate (ARM-R-4 C)', (_label, job) => {
      router.url = '/bilateral/CIP/drafts';
      service.beginFromJob(job as any);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(bilateralApiMock.GET_bilateralProjects).not.toHaveBeenCalled();
    });

    it('does not fetch the catalogue when the navigate resolves false (cross-center)', async () => {
      router.url = '/bilateral/ABC/home';
      router.navigate.mockResolvedValue(false);

      service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
      await Promise.resolve();
      await Promise.resolve();

      expect(bilateralApiMock.GET_bilateralProjects).not.toHaveBeenCalled();
    });

    it('externalEntry fires only on a successful resolve, with no replay for a later subscriber', () => {
      router.url = '/bilateral/CIP/drafts';
      bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [twoProgramProject] } }));
      const firstSpy = jest.fn();
      service.externalEntry.subscribe(firstSpy);

      service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
      expect(firstSpy).toHaveBeenCalledTimes(1);

      const lateSpy = jest.fn();
      service.externalEntry.subscribe(lateSpy);
      expect(lateSpy).not.toHaveBeenCalled();
    });

    describe('close on path change (design §7.1, DD-6)', () => {
      beforeEach(() => {
        router.url = '/bilateral/CIP/drafts';
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [twoProgramProject] } }));
        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
        expect(service.drawerOpen()).toBe(true);
      });

      it('closes the drawer once the router path changes', () => {
        router.url = '/bilateral/CIP/home';
        router.events.next(new NavigationEnd(1, '/bilateral/CIP/home', '/bilateral/CIP/home'));

        expect(service.drawerOpen()).toBe(false);
      });

      it('stays open on a query-only route change', () => {
        router.url = '/bilateral/CIP/drafts?job=abc123';
        router.events.next(new NavigationEnd(1, '/bilateral/CIP/drafts?job=abc123', '/bilateral/CIP/drafts?job=abc123'));

        expect(service.drawerOpen()).toBe(true);
      });
    });

    // Reviewer FAIL, attempt 1, issue 1: `openPathAtEntry` was written only inside `beginFromJob`
    // and never cleared, so a drawer opened by "+ Create result" or the wizard's Manual entry was
    // checked against the path of the LAST job open (or never checked at all when no job had run
    // yet) — exactly the DD-6 defect for the two entries this task does not own. Both openers now
    // record their own open path, via `beginFromProject`/`openDrawerForManual` themselves, not a
    // job-scoped write.
    describe('close on path change — every opener, not only beginFromJob (design §7.1, DD-6)', () => {
      it('beginFromProject: a route change after a home-panel open still closes the drawer', () => {
        router.url = '/bilateral/CIP/drafts';
        service.beginFromProject(twoProgramProject);
        expect(service.drawerOpen()).toBe(true);

        router.url = '/bilateral/CIP/home';
        router.events.next(new NavigationEnd(1, '/bilateral/CIP/home', '/bilateral/CIP/home'));

        expect(service.drawerOpen()).toBe(false);
      });

      it('openDrawerForManual after a prior job open on another path: a query-only change on ITS OWN path stays open', () => {
        // A job opens the drawer on path A.
        router.url = '/bilateral/CIP/drafts';
        bilateralApiMock.GET_bilateralProjects.mockReturnValue(of({ response: { projects: [twoProgramProject] } }));
        service.beginFromJob({ projectId: 500, centerId: 77, centerAcronym: 'CIP' });
        expect(service.drawerOpen()).toBe(true);

        service.closeDrawer();
        expect(service.drawerOpen()).toBe(false);

        // The wizard's Manual entry opens it again, on a DIFFERENT path (C).
        router.url = '/bilateral/CIP/create';
        service.openDrawerForManual();
        expect(service.drawerOpen()).toBe(true);

        // A query-only change on path C (not the stale path A) must not close it.
        router.url = '/bilateral/CIP/create?foo=1';
        router.events.next(new NavigationEnd(2, '/bilateral/CIP/create?foo=1', '/bilateral/CIP/create?foo=1'));

        expect(service.drawerOpen()).toBe(true);
      });
    });
  });
});
