import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralManualCreateFlowService } from './bilateral-manual-create-flow.service';
import { BilateralOverviewService } from './bilateral-overview.service';

describe('BilateralManualCreateFlowService', () => {
  let service: BilateralManualCreateFlowService;
  let creationService: BilateralCreationService;
  let router: { navigate: jest.Mock };
  let mockOverviewService: { invalidate: jest.Mock };

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
    router = { navigate: jest.fn().mockResolvedValue(true) };
    mockOverviewService = { invalidate: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BilateralManualCreateFlowService,
        BilateralCreationService,
        BilateralContextService,
        { provide: Router, useValue: router },
        { provide: BilateralOverviewService, useValue: mockOverviewService },
        {
          provide: BilateralApiService,
          useValue: { POST_createBilateralHeader: jest.fn().mockReturnValue(of({ response: { id: 99 } })) }
        },
        {
          provide: ApiService,
          useValue: {
            alertsFe: { show: jest.fn() },
            resultsSE: {},
            dataControlSE: {},
            rolesSE: {}
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

  it('derives drawer project subtitle from summary or description', () => {
    service.beginFromProject({
      ...singleSpProject,
      summary: 'Climate adaptation training across partner countries',
      description: 'Longer description text',
    });

    expect(service.drawerProjectSubtitle()).toBe('Climate adaptation training across partner countries');
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
});
