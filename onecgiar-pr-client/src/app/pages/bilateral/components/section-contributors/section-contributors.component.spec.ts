import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';

import { SectionContributorsComponent } from './section-contributors.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { ApiService } from '../../../../shared/services/api/api.service';

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
  let api: any;

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

    api = {
      resultsSE: {
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [SectionContributorsComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        { provide: CentersService, useValue: centersService },
        { provide: ApiService, useValue: api }
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

    it('persists the lead center as soon as the cached centers are mapped', () => {
      centersService.centersList = [center(5), center(6)];
      creation.resultLeadCenterId.set(5);
      build();
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(5);
      expect(component.selectedCenterInstitutionIds()).toContain(5);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }]
      });
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

    it('drops already selected ids that are unknown while persisting the lead center', () => {
      centersService.centersList = [center(5)];
      creation.resultLeadCenterId.set(5);
      build();
      component.selectedCenterInstitutionIds.set([404]);
      fixture.detectChanges();
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }]
      });
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
    it('marks the lead center as read-only and persists it', () => {
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(5), center(6)] as any);
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(5);
      expect(component.selectedCenterInstitutionIds()).toContain(5);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }]
      });
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
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(5), center(6)] as any);
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      creation.resultLeadCenterId.set(6);
      fixture.detectChanges();
      expect(component.readonlyLeadCenterInstitutionId).toBe(6);
      expect(component.selectedCenterInstitutionIds()).toContain(6);
      expect(component.selectedCenterInstitutionIds()).not.toContain(5);
    });

    it('drops unknown ids while building the payload', () => {
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(5)] as any);
      component.selectedCenterInstitutionIds.set([404]);
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }]
      });
    });
  });

  describe('saved contributing centers effect', () => {
    it('merges saved ids with the read-only lead center', () => {
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(5), center(7)] as any);
      creation.resultLeadCenterId.set(5);
      fixture.detectChanges();
      creation.resultContributingCenterIds.set([7]);
      fixture.detectChanges();
      expect(component.selectedCenterInstitutionIds().sort()).toEqual([5, 7]);
    });

    it('uses only the saved ids when there is no lead center', () => {
      build();
      fixture.detectChanges();
      component.availableCenters.set([center(7)] as any);
      creation.resultContributingCenterIds.set([7]);
      fixture.detectChanges();
      expect(component.selectedCenterInstitutionIds()).toEqual([7]);
    });
  });

  describe('lead project effect', () => {
    it('marks the lead project as read-only and persists it', () => {
      build();
      fixture.detectChanges();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBe(1);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [{ project_id: 1, is_lead: true }]
      });
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
      build();
      fixture.detectChanges();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      creation.selectedProject.set({ id: 2 });
      fixture.detectChanges();
      expect(component.readonlyLeadProjectId).toBe(2);
      expect(component.selectedProjectIds()).not.toContain(1);
    });

    it('drops unknown project ids while building the payload', () => {
      build();
      fixture.detectChanges();
      component.availableProjects.set([{ id: 1, shortName: 'P1', fullName: 'Project 1' }]);
      component.selectedProjectIds.set([987]);
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [{ project_id: 1, is_lead: true }]
      });
    });
  });

  describe('saved contributing projects effect', () => {
    it('merges saved ids with the read-only lead project', () => {
      build();
      fixture.detectChanges();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 3, shortName: 'P3', fullName: 'Project 3' }
      ]);
      creation.selectedProject.set({ id: 1 });
      fixture.detectChanges();
      creation.resultContributingProjectIds.set([3]);
      fixture.detectChanges();
      expect(component.selectedProjectIds().sort()).toEqual([1, 3]);
    });

    it('uses only the saved ids when there is no lead project', () => {
      build();
      fixture.detectChanges();
      component.availableProjects.set([{ id: 3, shortName: 'P3', fullName: 'Project 3' }]);
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
      component.onCentersChange(null as any);
      expect(component.selectedCenterInstitutionIds()).toEqual([]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({ contributing_center: [] });
    });

    it('skips ids that are not part of the available centers', () => {
      build();
      component.availableCenters.set([center(5)] as any);
      component.onCentersChange([5, 404]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_center: [{ institution_id: 5 }]
      });
    });

    it('re-injects the read-only lead project when it is missing', () => {
      build();
      component.availableProjects.set([
        { id: 1, shortName: 'P1', fullName: 'Project 1' },
        { id: 2, shortName: 'P2', fullName: 'Project 2' }
      ]);
      creation.selectedProject.set({ id: 1 });
      component.readonlyLeadProjectId = 1;
      component.onProjectsChange([2]);
      expect(component.selectedProjectIds()).toEqual([1, 2]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [
          { project_id: 1, is_lead: true },
          { project_id: 2, is_lead: false }
        ]
      });
    });

    it('handles a null id list for projects', () => {
      build();
      component.onProjectsChange(null as any);
      expect(component.selectedProjectIds()).toEqual([]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({ contributing_bilateral_projects: [] });
    });

    it('skips ids that are not part of the available projects', () => {
      build();
      component.availableProjects.set([{ id: 1, shortName: 'P1', fullName: 'Project 1' }]);
      component.onProjectsChange([1, 99]);
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [{ project_id: 1, is_lead: false }]
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
});
