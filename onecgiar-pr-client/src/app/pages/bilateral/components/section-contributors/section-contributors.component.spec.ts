import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';

import { SectionContributorsComponent } from './section-contributors.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../shared/services/global/institutions.service';
import { InnovationUseResultsService } from '../../../../shared/services/global/innovation-use-results.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

const center = (institutionId: number, code = `C${institutionId}`, acronym: string | undefined = `A${institutionId}`) => ({
  institutionId,
  code,
  name: `Center ${institutionId}`,
  acronym
});

describe('SectionContributorsComponent', () => {
  let fixture: ComponentFixture<SectionContributorsComponent>;
  let component: SectionContributorsComponent;
  let creation: any;
  let autoSave: any;
  let centersService: any;
  let institutionsService: any;
  let innovationUseResults: any;
  let api: any;
  let bilateralApi: any;

  const build = () => {
    fixture = TestBed.createComponent(SectionContributorsComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    creation = {
      selectedPrimarySp: signal<any>(null),
      selectedProject: signal<any>(null),
      resultLeadCenterId: signal<number | null>(null),
      resultContributingCenterIds: signal<number[]>([]),
      resultContributingProjectIds: signal<number[]>([]),
      resultContributingProjects: signal<any[]>([]),
      selectedSecondarySps: signal<any[]>([]),
      currentResultId: signal<number | null>(4242),
      resultLevelId: signal<number | null>(null),
      isLoadingResult: signal(false)
    };

    autoSave = {
      saveContributors: jest.fn(),
      fieldStatus: signal<Record<string, string>>({})
    };

    centersService = {
      centersList: [] as any[],
      loadedCenters: new EventEmitter<boolean>(),
      getData: jest.fn().mockResolvedValue([])
    };

    institutionsService = {
      institutionsWithoutCentersPartners: signal<any[]>([
        { institutions_id: 100, institutions_acronym: 'FAO', institutions_name: 'Food and Agriculture Organization' },
        { institutions_id: 200, institutions_acronym: '', institutions_name: 'Ministry of Agriculture' }
      ])
    };

    innovationUseResults = { resultsList: [] as any[] };

    api = {
      resultsSE: {
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
        // P25 programs/accelerators catalogue for "Contributing science programs" (2026-09-03).
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    // P2-3443: the partner block is read back from the bilateral detail endpoint.
    bilateralApi = {
      GET_BilateralResultDetail: jest.fn().mockReturnValue(of({ response: { commonFields: {}, contributingInstitutions: [] } }))
    };

    await TestBed.configureTestingModule({
      imports: [SectionContributorsComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        { provide: CentersService, useValue: centersService },
        { provide: InstitutionsService, useValue: institutionsService },
        { provide: InnovationUseResultsService, useValue: innovationUseResults },
        { provide: ApiService, useValue: api },
        { provide: BilateralApiService, useValue: bilateralApi }
      ]
    })
      .overrideTemplate(SectionContributorsComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  // ── primarySpData ────────────────────────────────────────────────────
  describe('primarySpData', () => {
    it('returns null when there is no primary SP', () => {
      build();
      expect(component.primarySpData()).toBeNull();
    });

    it('falls back to the project science-program data when the SP has no names', () => {
      creation.selectedPrimarySp.set({ programId: 7, programCode: 'SP07', allocation: '40' });
      creation.selectedProject.set({
        id: 1,
        sciencePrograms: [{ programId: 7, spShortName: 'Short', spName: 'Long' }]
      });
      build();
      const data = component.primarySpData();
      expect(data?.shortName).toBe('Short');
      expect(data?.name).toBe('Long');
      expect(data?.iconSrc).toContain('SP07.png');
    });

    it('prefers the SP own names and tolerates a project without science programs', () => {
      creation.selectedPrimarySp.set({
        programId: 7,
        programCode: 'SP07',
        allocation: '40',
        shortName: 'Own short',
        name: 'Own name'
      });
      creation.selectedProject.set({ id: 1 });
      build();
      const data = component.primarySpData();
      expect(data?.shortName).toBe('Own short');
      expect(data?.name).toBe('Own name');
    });

    it('returns empty names when neither the SP nor the project provide them', () => {
      creation.selectedPrimarySp.set({ programId: 9, programCode: 'SP09', allocation: '10' });
      creation.selectedProject.set(null);
      build();
      const data = component.primarySpData();
      expect(data?.shortName).toBe('');
      expect(data?.name).toBe('');
    });
  });

  // ── computed option lists ────────────────────────────────────────────
  describe('option lists', () => {
    it('disables the lead project option', () => {
      creation.selectedProject.set({ id: '2' });
      build();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      expect(component.availableProjectsComputed().map(p => p.disabled)).toEqual([false, true]);
      expect(component.disabledProjectOptions().length).toBe(1);
    });

    it('leaves every project enabled when there is no lead project id', () => {
      creation.selectedProject.set({ shortName: 'no id' });
      build();
      component.availableProjects.set([{ id: 1, shortName: 'P1', fullName: 'Project 1' }]);
      expect(component.availableProjectsComputed()[0].disabled).toBe(false);
      expect(component.disabledProjectOptions()).toEqual([]);
    });

    it('disables the lead center taken from the project', () => {
      creation.selectedProject.set({ id: 1, leadCenter: { id: 5 } });
      build();
      component.availableCenters.set([center(5), center(6)] as any);
      expect(component.availableCentersComputed().map(c => c.disabled)).toEqual([true, false]);
      expect(component.disabledCenterOptions().length).toBe(1);
    });

    it('falls back to resultLeadCenterId when the project has no lead center', () => {
      creation.selectedProject.set({ id: 1 });
      creation.resultLeadCenterId.set(6);
      build();
      component.availableCenters.set([center(5), center(6)] as any);
      expect(component.availableCentersComputed().map(c => c.disabled)).toEqual([false, true]);
    });

    it('disables nothing when there is no lead center at all', () => {
      build();
      component.availableCenters.set([center(5)] as any);
      expect(component.availableCentersComputed()[0].disabled).toBe(false);
    });
  });

  // ── loading ──────────────────────────────────────────────────────────
  describe('loading data', () => {
    it('maps centers directly when the centers list is already cached', () => {
      centersService.centersList = [center(1), center(2, 'C2', '')];
      build();
      fixture.detectChanges();
      expect(centersService.getData).not.toHaveBeenCalled();
      expect(component.availableCenters().length).toBe(2);
      expect(component.availableCenters()[0].acronym).toBe('A1');
      expect(component.availableCenters()[1].acronym).toBe('C2');
      expect(component.availableCenters()[1].full_name).toBe('C2 - Center 2');
    });

    it('sets lead center and selection when centers and lead center id are ready', () => {
      centersService.centersList = [center(5), center(6)];
      creation.resultLeadCenterId.set(5);
      build();
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(5);
      expect(component.selectedCenterInstitutionIds()).toContain(5);
    });

    it('keeps the lead center from the project when it is already selected', () => {
      centersService.centersList = [center(5)];
      creation.selectedProject.set({ id: 1, leadCenter: { id: 5 } });
      build();
      component.selectedCenterInstitutionIds.set([5]);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(5);
      expect(component.selectedCenterInstitutionIds()).toEqual([5]);
    });

    it('drops unknown ids from the payload via onCentersChange', () => {
      centersService.centersList = [center(5)];
      creation.resultLeadCenterId.set(5);
      build();
      fixture.detectChanges();
      component.onCentersChange([404]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith(
        expect.objectContaining({
          contributing_center: [{ institution_id: 5 }],
          contributing_bilateral_projects: []
        })
      );
    });

    it('does not persist a lead center that is missing from the cached list', () => {
      centersService.centersList = [center(6)];
      creation.resultLeadCenterId.set(5);
      build();
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBeNull();
      expect(autoSave.saveContributors).not.toHaveBeenCalled();
    });

    it('subscribes to loadedCenters when the cache is empty', () => {
      build();
      fixture.detectChanges();
      expect(centersService.getData).toHaveBeenCalled();
      centersService.centersList = [center(3)];
      centersService.loadedCenters.emit(true);
      expect(component.availableCenters().length).toBe(1);
    });

    it('tolerates a rejected getData promise', () => {
      centersService.getData = jest.fn().mockReturnValue(undefined);
      build();
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('handles a null centersList in mapCenters', () => {
      build();
      fixture.detectChanges();
      centersService.centersList = null;
      centersService.loadedCenters.emit(true);
      expect(component.availableCenters()).toEqual([]);
    });

    it('maps the projects response', () => {
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '11', shortName: 'P11', fullName: 'Project 11' }] })
      );
      build();
      fixture.detectChanges();
      expect(component.availableProjects()).toEqual([{ id: 11, shortName: 'P11', fullName: 'Project 11' }]);
    });

    it('defaults to an empty list when the projects response is null', () => {
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.availableProjects()).toEqual([]);
    });

    it('empties the projects list on error', () => {
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(throwError(() => new Error('boom')));
      build();
      fixture.detectChanges();
      expect(component.availableProjects()).toEqual([]);
    });

    it('unsubscribes on destroy', () => {
      build();
      fixture.detectChanges();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('does not throw on destroy when no subscription was made', () => {
      centersService.centersList = [center(1)];
      build();
      fixture.detectChanges();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ── effects ──────────────────────────────────────────────────────────
  describe('lead center effect', () => {
    it('marks the lead center as read-only on hydration', () => {
      centersService.centersList = [center(5), center(6)];
      build();
      fixture.detectChanges();
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(5);
      expect(component.selectedCenterInstitutionIds()).toContain(5);
    });

    it('ignores a lead center that is not part of the available list', () => {
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(5)] as any);
      creation.resultLeadCenterId.set(999);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBeNull();
    });

    it('does nothing when there are no centers loaded yet', () => {
      build();
      fixture.detectChanges();
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBeNull();
    });

    it('swaps the previous read-only lead center out of the selection', () => {
      centersService.centersList = [center(5), center(6)];
      build();
      fixture.detectChanges();
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      creation.resultLeadCenterId.set(6);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(6);
      expect(component.selectedCenterInstitutionIds()).toContain(6);
      expect(component.selectedCenterInstitutionIds()).not.toContain(5);
    });

    it('drops unknown ids from the payload via onCentersChange (effect section)', () => {
      centersService.centersList = [center(5)];
      creation.resultLeadCenterId.set(5);
      build();
      fixture.detectChanges();
      component.onCentersChange([404]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith(
        expect.objectContaining({
          contributing_center: [{ institution_id: 5 }],
          contributing_bilateral_projects: []
        })
      );
    });
  });

  describe('saved contributing centers effect', () => {
    it('merges saved ids with the read-only lead center', () => {
      centersService.centersList = [center(5), center(7)];
      build();
      fixture.detectChanges();
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      creation.resultContributingCenterIds.set([7]);
      fixture.detectChanges();
      expect(component.selectedCenterInstitutionIds().sort()).toEqual([5, 7]);
    });

    it('uses only the saved ids when there is no lead center', () => {
      centersService.centersList = [center(7)];
      build();
      fixture.detectChanges();
      creation.resultContributingCenterIds.set([7]);
      fixture.detectChanges();
      expect(component.selectedCenterInstitutionIds()).toEqual([7]);
    });
  });

  describe('lead project effect', () => {
    it('marks the lead project as read-only on hydration', () => {
      centersService.centersList = [center(1)];
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '1', shortName: 'P1', fullName: 'Project 1' }, { id: '2', shortName: 'P2', fullName: 'Project 2' }] })
      );
      build();
      fixture.detectChanges();
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBe(1);
    });

    it('ignores a lead project missing from the available list', () => {
      build();
      fixture.detectChanges();
      component.availableProjects.set([{ id: 1, shortName: 'P1', fullName: 'Project 1' }]);
      creation.selectedProject.set({ id: 55 });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBeNull();
    });

    it('does nothing when the project has no id or the list is empty', () => {
      build();
      fixture.detectChanges();
      creation.selectedProject.set({ shortName: 'no id' });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBeNull();
    });

    it('swaps the previous read-only lead project out of the selection', () => {
      centersService.centersList = [center(1)];
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '1', shortName: 'P1', fullName: 'Project 1' }, { id: '2', shortName: 'P2', fullName: 'Project 2' }] })
      );
      build();
      fixture.detectChanges();
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      creation.selectedProject.set({ id: 2 });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBe(2);
      expect(component.selectedProjectIds()).not.toContain(1);
    });

    it('drops unknown project ids from the payload via onProjectsChange', () => {
      centersService.centersList = [center(1)];
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '1', shortName: 'P1', fullName: 'Project 1' }] })
      );
      build();
      fixture.detectChanges();
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      component.onProjectsChange([987]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith(
        expect.objectContaining({
          contributing_bilateral_projects: [{ project_id: 1, is_lead: true }],
          contributing_center: []
        })
      );
    });
  });

  describe('saved contributing projects effect', () => {
    it('merges saved ids with the read-only lead project', () => {
      centersService.centersList = [center(1)];
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '1', shortName: 'P1', fullName: 'Project 1' }, { id: '3', shortName: 'P3', fullName: 'Project 3' }] })
      );
      build();
      fixture.detectChanges();
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      creation.resultContributingProjectIds.set([3]);
      fixture.detectChanges();
      expect(component.selectedProjectIds().sort()).toEqual([1, 3]);
    });

    it('uses only the saved ids when there is no lead project', () => {
      centersService.centersList = [center(1)];
      api.resultsSE.GET_ClarisaProjects.mockReturnValue(
        of({ response: [{ id: '3', shortName: 'P3', fullName: 'Project 3' }] })
      );
      build();
      fixture.detectChanges();
      creation.resultContributingProjectIds.set([3]);
      fixture.detectChanges();
      expect(component.selectedProjectIds()).toEqual([3]);
    });
  });

  // ── model change handlers ────────────────────────────────────────────
  describe('model change handlers', () => {
    it('accepts objects for centers', () => {
      build();
      component.availableCenters.set([center(5)] as any);
      component.onCentersModelChange([{ institutionId: 5 }]);
      expect(component.selectedCenterInstitutionIds()).toEqual([5]);
    });

    it('accepts raw ids and null for centers', () => {
      build();
      component.availableCenters.set([center(5)] as any);
      component.onCentersModelChange([5]);
      expect(component.selectedCenterInstitutionIds()).toEqual([5]);
      component.onCentersModelChange(null as any);
      expect(component.selectedCenterInstitutionIds()).toEqual([]);
    });

    it('accepts objects for projects', () => {
      build();
      component.availableProjects.set([{ id: 4, shortName: 'P4', fullName: 'Project 4' }]);
      component.onProjectsModelChange([{ id: 4 }]);
      expect(component.selectedProjectIds()).toEqual([4]);
    });

    it('accepts raw ids and null for projects', () => {
      build();
      component.availableProjects.set([{ id: 4, shortName: 'P4', fullName: 'Project 4' }]);
      component.onProjectsModelChange([4]);
      expect(component.selectedProjectIds()).toEqual([4]);
      component.onProjectsModelChange(null as any);
      expect(component.selectedProjectIds()).toEqual([]);
    });
  });

  describe('onCentersChange / onProjectsChange', () => {
    it('re-injects the read-only lead center when it is missing', () => {
      build();
      component.availableCenters.set([center(5), center(6)] as any);
      component.readonlyLeadCenterInstitutionId = 5;
      component.onCentersChange([6]);
      expect(component.selectedCenterInstitutionIds()).toEqual([5, 6]);
    });

    it('does not duplicate the lead center when it is already selected', () => {
      build();
      component.availableCenters.set([center(5)] as any);
      component.readonlyLeadCenterInstitutionId = 5;
      component.onCentersChange([5]);
      expect(component.selectedCenterInstitutionIds()).toEqual([5]);
    });

    it('handles a null id list for centers', () => {
      build();
      component.contributorsHydrated.set(true);
      component.onCentersChange(null as any);
      expect(component.selectedCenterInstitutionIds()).toEqual([]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({ contributing_center: [], contributing_bilateral_projects: [], contributing_programs: [] });
    });

    it('skips ids that are not part of the available centers', () => {
      build();
      component.contributorsHydrated.set(true);
      component.availableCenters.set([center(5)] as any);
      component.onCentersChange([5, 404]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }],
        contributing_bilateral_projects: [],
        contributing_programs: []
      });
    });

    it('re-injects the read-only lead project when it is missing', () => {
      build();
      component.contributorsHydrated.set(true);
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      creation.selectedProject.set({ id: 1 });
      component.readonlyLeadProjectId = 1;
      component.onProjectsChange([2]);
      expect(component.selectedProjectIds()).toEqual([1, 2]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [],
        contributing_bilateral_projects: [
          { project_id: 1, is_lead: true },
          { project_id: 2, is_lead: false }
        ],
        contributing_programs: []
      });
    });

    it('handles a null id list for projects', () => {
      build();
      component.contributorsHydrated.set(true);
      component.onProjectsChange(null as any);
      expect(component.selectedProjectIds()).toEqual([]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({ contributing_bilateral_projects: [], contributing_center: [], contributing_programs: [] });
    });

    it('skips ids that are not part of the available projects', () => {
      build();
      component.contributorsHydrated.set(true);
      component.availableProjects.set([{ id: 1, shortName: 'P1', fullName: 'Project 1' }]);
      component.onProjectsChange([1, 99]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [{ project_id: 1, is_lead: false }],
        contributing_center: [],
        contributing_programs: []
      });
    });
  });

  // ── small helpers ────────────────────────────────────────────────────
  describe('helpers', () => {
    it('formats allocations', () => {
      build();
      expect(component.formatAlloc(null)).toBe('');
      expect(component.formatAlloc(undefined)).toBe('');
      expect(component.formatAlloc('')).toBe('');
      expect(component.formatAlloc('abc')).toBe('abc');
      expect(component.formatAlloc('40.6')).toBe('41');
    });

    it('maps the field status to a css class', () => {
      build();
      expect(component.getStatusClass('contributors')).toBe('');
      autoSave.fieldStatus.set({ contributors: 'saving' });
      expect(component.getStatusClass('contributors')).toBe('status-saving');
    });

    it('resolves center display names', () => {
      build();
      component.availableCenters.set([center(5), center(6, 'C6', '')] as any);
      expect(component.getCenterDisplayName(5)).toBe('A5');
      expect(component.getCenterDisplayName(6)).toBe('C6');
      expect(component.getCenterDisplayName(404)).toBe('404');
    });

    it('resolves project display names from the available list', () => {
      build();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: '', fullName: 'Project 2' }
      ]);
      expect(component.getProjectDisplayName(1)).toBe('P1');
      expect(component.getProjectDisplayName(2)).toBe('Project 2');
    });

    it('falls back to loaded contributing projects, then to the lead project, then to empty', () => {
      creation.resultContributingProjects.set([
        { id: 8, shortName: '', fullName: 'Loaded 8' },
        { id: 9, shortName: 'L9', fullName: 'Loaded 9' }
      ]);
      creation.selectedProject.set({ id: 10, shortName: '', fullName: 'Lead project' });
      build();
      expect(component.getProjectDisplayName(8)).toBe('Loaded 8');
      expect(component.getProjectDisplayName(9)).toBe('L9');
      expect(component.getProjectDisplayName(10)).toBe('Lead project');
      expect(component.getProjectDisplayName(404)).toBe('');
    });

    it('returns empty when the lead project does not match either', () => {
      creation.selectedProject.set(null);
      build();
      expect(component.getProjectDisplayName(1)).toBe('');
    });

    it('identifies lead center and lead project items', () => {
      build();
      component.readonlyLeadCenterInstitutionId = 5;
      component.readonlyLeadProjectId = 1;
      expect(component.isLeadCenterItem({ institutionId: 5 } as any)).toBe(true);
      expect(component.isLeadCenterItem({ institutionId: 6 } as any)).toBe(false);
      expect(component.isLeadCenter(5)).toBe(true);
      expect(component.isLeadCenter(6)).toBe(false);
      expect(component.isLeadProject(1)).toBe(true);
      expect(component.isLeadProject(2)).toBe(false);
    });

    it('refuses to remove the lead center and removes any other', () => {
      build();
      component.availableCenters.set([center(5), center(6)] as any);
      component.readonlyLeadCenterInstitutionId = 5;
      component.selectedCenterInstitutionIds.set([5, 6]);
      component.removeCenter(5);
      expect(component.selectedCenterInstitutionIds()).toEqual([5, 6]);
      component.removeCenter(6);
      expect(component.selectedCenterInstitutionIds()).toEqual([5]);
    });

    it('refuses to remove the lead project and removes any other', () => {
      build();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      component.readonlyLeadProjectId = 1;
      component.selectedProjectIds.set([1, 2]);
      component.removeProject(1);
      expect(component.selectedProjectIds()).toEqual([1, 2]);
      component.removeProject(2);
      expect(component.selectedProjectIds()).toEqual([1]);
    });
  });

  // P2-3348 (same defect class, found while fixing Capacity Sharing): `contributing-selection` was
  // tracked here while both multi-selects that feed it render `[required]="false"`. Submit is gated on
  // overallStatus() === 'complete', so a field the UI labels Optional could hold the button disabled
  // with nothing on screen explaining why.
  describe('updateContributorsMds', () => {
    it('tracks only the lead pair, never the optional contributing selection', () => {
      build();
      const tracker = TestBed.inject(BilateralMdsTrackerService) as any;
      component.readonlyLeadCenterInstitutionId = 7;
      component.readonlyLeadProjectId = 3;
      component.selectedCenterInstitutionIds.set([7, 9]);
      component.selectedProjectIds.set([3, 4]);

      component.updateContributorsMds();

      const [section, items, group] = tracker.setSectionFields.mock.calls.at(-1);
      expect(section).toBe('contributors');
      expect(group).toBe('partners');
      expect(items.map((i: any) => i.key)).toEqual(['lead-center', 'lead-project', 'external-partners']);
    });

    it('leaves the lead pair unfilled when the result has no lead center or project yet', () => {
      build();
      const tracker = TestBed.inject(BilateralMdsTrackerService) as any;
      component.readonlyLeadCenterInstitutionId = null;
      component.readonlyLeadProjectId = null;

      component.updateContributorsMds();

      const items = tracker.setSectionFields.mock.calls.at(-1)[1];
      expect(items.every((i: any) => i.filled === false)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // P2-3368 — Minimum data + Full metadata
  // ────────────────────────────────────────────────────────────────────

  describe('P2-3368 · external partners (mandatory, two ways to satisfy it)', () => {
    it('is unsatisfied when there is no partner and the "no partners" box is unchecked (AC5)', () => {
      build();
      expect(component.selectedPartnerInstitutionIds()).toEqual([]);
      expect(component.noExternalPartners()).toBe(false);
      expect(component.externalPartnersSatisfied()).toBe(false);
    });

    it('is satisfied by selecting at least one partner', () => {
      build();
      component.onPartnersModelChange([{ institutions_id: 100 }]);
      expect(component.selectedPartnerInstitutionIds()).toEqual([100]);
      expect(component.externalPartnersSatisfied()).toBe(true);
    });

    it('accepts plain ids as well as option objects from the multi-select', () => {
      build();
      component.onPartnersModelChange([100, '200'] as any);
      expect(component.selectedPartnerInstitutionIds()).toEqual([100, 200]);
    });

    it('is satisfied by ticking "This result has no external partners" (AC7)', () => {
      build();
      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();
      expect(component.externalPartnersSatisfied()).toBe(true);
    });

    it('clears any selected partner when the "no partners" box is ticked', () => {
      build();
      component.onPartnersModelChange([{ institutions_id: 100 }]);
      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();
      expect(component.selectedPartnerInstitutionIds()).toEqual([]);
    });

    it('falls back to unsatisfied when the box is unticked again with no partner (edge case in the story)', () => {
      build();
      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();
      component.noExternalPartners.set(false);
      component.onNoExternalPartnersChange();
      expect(component.externalPartnersSatisfied()).toBe(false);
    });

    it('removes a single partner and re-evaluates the requirement', () => {
      build();
      component.onPartnersModelChange([{ institutions_id: 100 }, { institutions_id: 200 }]);
      component.removePartner(100);
      expect(component.selectedPartnerInstitutionIds()).toEqual([200]);
      component.removePartner(200);
      expect(component.externalPartnersSatisfied()).toBe(false);
    });

    it('labels a partner by acronym, falling back to its name and then to the raw id', () => {
      build();
      expect(component.getPartnerDisplayName(100)).toBe('FAO');
      expect(component.getPartnerDisplayName(200)).toBe('Ministry of Agriculture');
      expect(component.getPartnerDisplayName(999)).toBe('999');
    });

    it('keeps demanding the field on screen: empty is invalid, a partner or the checkbox satisfies it', () => {
      build();
      expect(component.externalPartnersSatisfied()).toBe(false);

      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();
      expect(component.externalPartnersSatisfied()).toBe(true);

      component.noExternalPartners.set(false);
      component.onNoExternalPartnersChange();
      component.onPartnersModelChange([{ institutions_id: 100 }]);
      expect(component.externalPartnersSatisfied()).toBe(true);
    });

    // P2-3443 reversed the earlier decision: the item was held out of the tracker ONLY because the
    // answer was not persisted (a reload made it unfilled again and Submit stayed blocked with no
    // way out). Now that it round-trips, the mandatory affordance on screen and the Submit gate
    // agree again. If persistence ever breaks, take the item out again — do not loosen the UI.
    it('publishes external-partners to the MDS tracker now that the answer is persisted (P2-3443)', () => {
      build();
      const tracker = TestBed.inject(BilateralMdsTrackerService) as any;

      // Hydrated: only then does `buildContributorsPayload()` carry the partner keys, and only
      // then may the item be reported as filled — see the invariant in `updateContributorsMds`.
      component.partnersHydrated.set(true);
      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();

      const [section, items, group] = tracker.setSectionFields.mock.calls.at(-1);
      expect(section).toBe('contributors');
      expect(group).toBe('partners');
      expect(items.map((i: any) => i.key)).toEqual(['lead-center', 'lead-project', 'external-partners']);
      expect(items.find((i: any) => i.key === 'external-partners').filled).toBe(true);
    });

    it('reports external-partners as unfilled while nothing is selected and the box is unticked', () => {
      build();
      const tracker = TestBed.inject(BilateralMdsTrackerService) as any;

      component.updateContributorsMds();

      const items = tracker.setSectionFields.mock.calls.at(-1)[1];
      expect(items.find((i: any) => i.key === 'external-partners').filled).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // P2-3443 — external partners actually reach the server and come back
  // ────────────────────────────────────────────────────────────────────

  describe('P2-3443 · persisting the external partners block', () => {
    const lastPayload = () => autoSave.saveContributors.mock.calls.at(-1)[0];

    // The hydrate effect only runs once centers AND projects are ready, so the cached centers list
    // has to be primed before the component is built or nothing fires.
    const buildWithCenters = () => {
      centersService.centersList = [center(1)];
      build();
      fixture.detectChanges();
    };

    it('does not touch the partner keys before the stored block has been read back', () => {
      build();
      component.onPartnersModelChange([{ institutions_id: 100 }]);

      const payload = lastPayload();
      expect(payload.institutions).toBeUndefined();
      expect(payload.no_external_partners).toBeUndefined();
      expect(payload.is_lead_by_partner).toBeUndefined();
    });

    it('sends the selected partners once hydrated, and still withholds the centre keys', () => {
      build();
      component.partnersHydrated.set(true);
      component.onPartnersModelChange([{ institutions_id: 100 }, { institutions_id: 200 }]);

      const payload = lastPayload();
      expect(payload.institutions).toEqual([{ institutions_id: 100 }, { institutions_id: 200 }]);
      expect(payload.no_external_partners).toBe(false);
      expect(payload.is_lead_by_partner).toBe(false);
      // The two hydration flags are independent: partners being on screen says nothing about the
      // centre and project catalogues having loaded. Sending `[]` here is what wiped the lead centre.
      expect(payload.contributing_center).toBeUndefined();
    });

    it('sends an explicit empty set plus the flag when the "no partners" box is ticked', () => {
      build();
      component.partnersHydrated.set(true);
      component.onPartnersModelChange([{ institutions_id: 100 }]);
      component.noExternalPartners.set(true);
      component.onNoExternalPartnersChange();

      const payload = lastPayload();
      expect(payload.institutions).toEqual([]);
      expect(payload.no_external_partners).toBe(true);
    });

    it('persists a removal', () => {
      build();
      component.partnersHydrated.set(true);
      component.onPartnersModelChange([{ institutions_id: 100 }, { institutions_id: 200 }]);
      component.removePartner(100);

      expect(lastPayload().institutions).toEqual([{ institutions_id: 200 }]);
    });

    it('hydrates the stored partners from the bilateral detail payload', () => {
      creation.currentResultId.set(4242);
      bilateralApi.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: {
            commonFields: { no_applicable_partner: 0 },
            contributingInstitutions: [{ institutions_id: 100 }, { institutions_id: '200' }, { institutions_id: 100 }]
          }
        })
      );
      buildWithCenters();

      expect(bilateralApi.GET_BilateralResultDetail).toHaveBeenCalledWith(4242);
      expect(component.selectedPartnerInstitutionIds()).toEqual([100, 200]);
      expect(component.noExternalPartners()).toBe(false);
      expect(component.partnersHydrated()).toBe(true);
    });

    it('re-ticks the "no partners" box when that is what was stored', () => {
      creation.currentResultId.set(4242);
      bilateralApi.GET_BilateralResultDetail.mockReturnValue(
        of({ response: { commonFields: { no_applicable_partner: 1 }, contributingInstitutions: [] } })
      );
      buildWithCenters();

      expect(component.noExternalPartners()).toBe(true);
      expect(component.externalPartnersSatisfied()).toBe(true);
    });

    // The flag is a MySQL tinyint and can arrive as the string '0', which `!!` reads as true.
    it('does not tick the box when the stored flag arrives as the string "0"', () => {
      creation.currentResultId.set(4242);
      bilateralApi.GET_BilateralResultDetail.mockReturnValue(
        of({ response: { commonFields: { no_applicable_partner: '0' }, contributingInstitutions: [] } })
      );
      buildWithCenters();

      expect(component.noExternalPartners()).toBe(false);
    });

    it('reads the detail endpoint once per result, not once per effect run', () => {
      creation.currentResultId.set(4242);
      buildWithCenters();
      creation.resultContributingCenterIds.set([1]);
      fixture.detectChanges();
      creation.resultContributingCenterIds.set([1, 2]);
      fixture.detectChanges();

      expect(bilateralApi.GET_BilateralResultDetail).toHaveBeenCalledTimes(1);
    });

    it('stays unhydrated when the read fails, so a later save cannot wipe the stored partners', () => {
      creation.currentResultId.set(4242);
      bilateralApi.GET_BilateralResultDetail.mockReturnValue(throwError(() => new Error('boom')));
      buildWithCenters();

      expect(component.partnersHydrated()).toBe(false);
      component.onPartnersModelChange([{ institutions_id: 100 }]);
      expect(lastPayload().institutions).toBeUndefined();
    });

    it('does not call the detail endpoint when there is no result yet', () => {
      creation.currentResultId.set(null);
      buildWithCenters();

      expect(bilateralApi.GET_BilateralResultDetail).not.toHaveBeenCalled();
    });

    // ── the failed read must be VISIBLE, never silent ──────────────────────────────────────
    // 🛑 THE INVARIANT: a field is never reported as satisfied while the payload is discarding its
    // keys. Before this, a failed GET left the section reporting `external-partners` as filled off
    // an in-memory selection that every PATCH threw away — green tick, Submit unlocked, nothing
    // written. The hydrate effect never re-runs on its own, so there is no self-healing either.
    describe('when the stored partner block cannot be read', () => {
      const buildWithFailedRead = () => {
        creation.currentResultId.set(4242);
        bilateralApi.GET_BilateralResultDetail.mockReturnValue(throwError(() => new Error('boom')));
        buildWithCenters();
      };

      it('drops no partner key into the payload AND leaves the MDS entry unfilled', () => {
        buildWithFailedRead();
        const tracker = TestBed.inject(BilateralMdsTrackerService) as any;

        expect(component.partnersHydrated()).toBe(false);

        component.onPartnersModelChange([{ institutions_id: 100 }]);

        const payload = lastPayload();
        expect(payload.institutions).toBeUndefined();
        expect(payload.no_external_partners).toBeUndefined();
        expect(payload.is_lead_by_partner).toBeUndefined();

        // ...and the very same selection must NOT satisfy the tracker entry.
        const items = tracker.setSectionFields.mock.calls.at(-1)[1];
        expect(items.find((i: any) => i.key === 'external-partners').filled).toBe(false);
      });

      it('keeps the entry unfilled even when the "no partners" box is ticked', () => {
        buildWithFailedRead();
        const tracker = TestBed.inject(BilateralMdsTrackerService) as any;

        component.noExternalPartners.set(true);
        component.onNoExternalPartnersChange();

        expect(component.externalPartnersSatisfied()).toBe(true); // the answer is given...
        const items = tracker.setSectionFields.mock.calls.at(-1)[1];
        expect(items.find((i: any) => i.key === 'external-partners').filled).toBe(false); // ...but unsaveable
      });

      it('raises the error flag the block renders, and publishes the unfilled entry on failure', () => {
        buildWithFailedRead();
        const tracker = TestBed.inject(BilateralMdsTrackerService) as any;

        expect(component.partnersLoadFailed()).toBe(true);
        const items = tracker.setSectionFields.mock.calls.at(-1)[1];
        expect(items.find((i: any) => i.key === 'external-partners').filled).toBe(false);
      });

      it('retries on demand and clears the error once the read succeeds', () => {
        buildWithFailedRead();
        expect(bilateralApi.GET_BilateralResultDetail).toHaveBeenCalledTimes(1);

        bilateralApi.GET_BilateralResultDetail.mockReturnValue(
          of({ response: { commonFields: { no_applicable_partner: 0 }, contributingInstitutions: [{ institutions_id: 100 }] } })
        );
        component.retryLoadExternalPartners();

        expect(bilateralApi.GET_BilateralResultDetail).toHaveBeenCalledTimes(2);
        expect(component.partnersLoadFailed()).toBe(false);
        expect(component.partnersHydrated()).toBe(true);
        expect(component.selectedPartnerInstitutionIds()).toEqual([100]);

        component.onPartnersModelChange([{ institutions_id: 100 }]);
        expect(lastPayload().institutions).toEqual([{ institutions_id: 100 }]);
      });

      it('re-raises the error when the retry fails again', () => {
        buildWithFailedRead();
        component.retryLoadExternalPartners();

        expect(bilateralApi.GET_BilateralResultDetail).toHaveBeenCalledTimes(2);
        expect(component.partnersLoadFailed()).toBe(true);
        expect(component.partnersHydrated()).toBe(false);
      });
    });
  });

  describe('P2-3368 · read-only lead center and primary science program (AC1)', () => {
    it('never lets the researcher drop the lead center from the contributing list', () => {
      build();
      component.readonlyLeadCenterInstitutionId = 5;
      component.selectedCenterInstitutionIds.set([5, 9]);

      component.removeCenter(5);
      expect(component.selectedCenterInstitutionIds()).toEqual([5, 9]);

      // and it is re-added even if the dropdown hands back a list without it
      component.onCentersChange([9]);
      expect(component.selectedCenterInstitutionIds()).toEqual([5, 9]);
      expect(component.isLeadCenter(5)).toBe(true);
    });

    it('exposes the primary science program as derived read-only data, with no setter', () => {
      creation.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '100', name: 'Breeding for Tomorrow' });
      creation.selectedProject.set({ id: 1, sciencePrograms: [] });
      build();

      expect(component.primarySpData()).toEqual(
        expect.objectContaining({ programCode: 'SP01', name: 'Breeding for Tomorrow' })
      );
      // primarySpData is a computed over the service — the section offers no way to write it back.
      expect((component as any).primarySpData.set).toBeUndefined();
    });

    it('excludes the primary science program from the contributing science programs options', () => {
      creation.selectedPrimarySp.set({ programId: 1, programCode: 'SP01', allocation: '100' });
      creation.selectedProject.set({
        id: 1,
        sciencePrograms: [
          { programId: 1, programCode: 'SP01', spName: 'Breeding for Tomorrow' },
          { programId: 2, programCode: 'SP02', spName: 'Multifunctional Landscapes' }
        ]
      });
      build();

      expect(component.availableSecondarySpOptions().map(o => o.programCode)).toEqual(['SP02']);
      expect(component.availableSecondarySpOptions()[0].full_name).toBe('SP02 - Multifunctional Landscapes');
    });
  });

  describe('P2-3368 · Full metadata toggle (AC8/AC9) and the linked/bundled question', () => {
    beforeEach(() => localStorage.clear());

    it('starts collapsed and flips on toggle', () => {
      build();
      expect(component.showAllFields()).toBe(false);
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(true);
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(false);
    });

    it('remembers the expanded state per result', () => {
      build();
      component.toggleShowAll();
      expect(localStorage.getItem('bp_extra_4242_contributors')).toBe('true');
    });

    // The suite overrides the template, so the toggle is asserted through the gates the template
    // renders (`showLinkedResultQuestion` / `showLinkedResultsDropdown` / `fullMetadataButtonLabel`).
    it('reveals the linked/bundled question only while the block is expanded (AC8/AC9)', () => {
      build();
      expect(component.showLinkedResultQuestion()).toBe(false);
      expect(component.fullMetadataButtonLabel()).toBe('Complete full metadata');

      component.toggleShowAll();
      expect(component.showLinkedResultQuestion()).toBe(true);
      expect(component.fullMetadataButtonLabel()).toBe('Hide full metadata');

      component.toggleShowAll();
      expect(component.showLinkedResultQuestion()).toBe(false);
      expect(component.fullMetadataButtonLabel()).toBe('Complete full metadata');
    });

    it('uses the single P2-3358 sentence for every typology', () => {
      build();
      expect(component.linkedResultQuestionLabel).toBe(
        'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?'
      );
    });

    it('shows the results dropdown only on Yes, and never while the block is collapsed (AC11)', () => {
      build();
      component.onHasLinkedResultChange(true);
      expect(component.showLinkedResultsDropdown()).toBe(false); // still collapsed

      component.toggleShowAll();
      expect(component.showLinkedResultsDropdown()).toBe(true);

      component.onHasLinkedResultChange(false);
      expect(component.showLinkedResultsDropdown()).toBe(false);
    });

    it('keeps the question unanswered by default (AC10)', () => {
      build();
      expect(component.hasLinkedResult()).toBeNull();
      expect(component.selectedLinkedResultIds()).toEqual([]);
    });

    // ── the linked/bundled block is Coming soon ────────────────────────────────────────────
    // 🛑 HOUSE RULE: a control whose value cannot be stored ships visible-but-DISABLED with the
    // tag, and the screen never claims it will be saved. The answer has no field on
    // SaveBilateralContributorsDto and no home in the detail payload — it only ever reached a
    // component signal. AC13's note used to count it, so the user read "1 hidden field has values
    // and will be saved.", reloaded, and found it empty. These tests hold that shut.
    describe('linked/bundled question · Coming soon', () => {
      it('flags the unpersisted controls so the template disables them and shows the tag', () => {
        build();
        expect(component.unpersistedFieldsComingSoon).toBe(true);
      });

      it('never promises a save: the hidden-field counter stays at zero and the note never shows', () => {
        build();
        expect(component.hiddenFieldsWithValues()).toBe(0);
        expect(component.showHiddenFieldsNote()).toBe(false);

        // Even with the signals populated (only reachable from code while the control is disabled)
        // there is nothing to announce, because nothing of this leaves the browser.
        component.onHasLinkedResultChange(true);
        component.onLinkedResultsModelChange([{ id: 11 }]);
        expect(component.hiddenFieldsWithValues()).toBe(0);
        expect(component.showHiddenFieldsNote()).toBe(false);

        component.toggleShowAll();
        expect(component.showHiddenFieldsNote()).toBe(false);
      });

      it('sends nothing of the answer to the server', () => {
        build();
        autoSave.saveContributors.mockClear();

        component.onHasLinkedResultChange(true);
        component.onLinkedResultsModelChange([{ id: 11 }, { id: 12 }]);

        expect(autoSave.saveContributors).not.toHaveBeenCalled();
      });

      // Kept green so the wiring is one flag away from working the day the DTO accepts the field.
      it('still clears the selected results when the answer flips back to No (AC12)', () => {
        build();
        component.onHasLinkedResultChange(true);
        component.onLinkedResultsModelChange([{ id: 11 }, { id: 12 }]);
        expect(component.selectedLinkedResultIds()).toEqual([11, 12]);

        component.onHasLinkedResultChange(false);
        expect(component.selectedLinkedResultIds()).toEqual([]);
      });
    });

    // Nicoleta Trifa via Ángel Jarrín, 2026-09-03: contributing programs are persisted now
    // (`contributing_programs[]` on the contributors PATCH), so picking one stages a save.
    it('stages the contributing science programs for Save draft', () => {
      creation.selectedProject.set({ id: 1, sciencePrograms: [{ programId: 7, programCode: 'SP07' }] });
      build();
      component.contributorsHydrated.set(true);
      autoSave.saveContributors.mockClear();

      component.onSecondarySpsModelChange([{ programId: 7 }]);

      expect(creation.selectedSecondarySps()).toEqual([{ programId: 7, programCode: 'SP07', allocation: '' }]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith(
        expect.objectContaining({ contributing_programs: [{ science_program_id: 'SP07' }] })
      );
    });

    it('offers every P25 program from the catalogue, not only the project\'s own, minus the primary', () => {
      api.resultsSE.GET_AllInitiatives.mockReturnValue(
        of({
          response: [
            { id: 1, official_code: 'SP01', name: 'Breeding for Tomorrow' },
            { id: 6, official_code: 'SP06', name: 'Climate Action' },
            { id: 20, official_code: 'AC01', short_name: 'Accelerator One' }
          ]
        })
      );
      creation.selectedPrimarySp.set({ programId: 6, programCode: 'SP06', allocation: '100' });
      // A project mapped 100% to SP06 used to leave this list empty.
      creation.selectedProject.set({ id: 1, sciencePrograms: [{ programId: 6, programCode: 'SP06' }] });
      build();
      fixture.detectChanges();

      expect(api.resultsSE.GET_AllInitiatives).toHaveBeenCalledWith('p25');
      expect(component.availableSecondarySpOptions().map(o => o.full_name)).toEqual([
        'SP01 - Breeding for Tomorrow',
        'AC01 - Accelerator One'
      ]);
    });

    it('does not send contributing programs before the stored ones have been hydrated', () => {
      build();
      autoSave.saveContributors.mockClear();
      component.onSecondarySpsModelChange([]);
      const payload = autoSave.saveContributors.mock.calls.at(-1)?.[0] ?? {};
      expect(payload).not.toHaveProperty('contributing_programs');
    });

    it('formats a linked result as code + name + type + title', () => {
      build();
      expect(
        component.formatResultLabel({ result_code: 'PO-1', name: 'Policy result', result_type_name: 'Policy Change', title: 'A title', acronym: 'SP01', phase_year: 2026 })
      ).toBe('(SP01 - 2026) PO-1 - Policy result (Policy Change) - A title');
      expect(component.formatResultLabel({ title: 'Just a title' })).toBe('Just a title');
    });
  });

  /**
   * The lead centre is read-only in this section, so once the server deactivates its row the user
   * has NO control to put it back, and `assertCenterPermission` refuses the submit forever with
   * "The result has no lead center assigned". The client is the only place this can be prevented
   * cheaply: an omitted key means "leave untouched", an empty array means "deactivate everything".
   */
  describe('withholding the centre and project keys until the catalogues are on screen', () => {
    it('omits both keys while the catalogues have not hydrated', () => {
      build();
      component.selectedCenterInstitutionIds.set([1]);
      component.onCentersChange();

      const payload = autoSave.saveContributors.mock.calls.at(-1)[0];
      expect(payload.contributing_center).toBeUndefined();
      expect(payload.contributing_bilateral_projects).toBeUndefined();
    });

    it('never sends an empty array, which is what deactivated the lead row', () => {
      build();
      component.onProjectsChange();

      const payload = autoSave.saveContributors.mock.calls.at(-1)[0];
      expect(payload.contributing_center).not.toEqual([]);
      expect(payload.contributing_bilateral_projects).not.toEqual([]);
    });

    it('sends both keys once hydrated', () => {
      build();
      component.contributorsHydrated.set(true);
      component.onCentersChange();

      const payload = autoSave.saveContributors.mock.calls.at(-1)[0];
      expect(payload.contributing_center).toBeDefined();
      expect(payload.contributing_bilateral_projects).toBeDefined();
    });

    it('keeps the two hydration flags independent', () => {
      build();
      component.partnersHydrated.set(true);
      component.contributorsHydrated.set(false);
      component.onPartnersModelChange([{ institutions_id: 7 }]);

      const payload = autoSave.saveContributors.mock.calls.at(-1)[0];
      expect(payload.institutions).toEqual([{ institutions_id: 7 }]);
      expect(payload.contributing_center).toBeUndefined();
    });
  });
});
