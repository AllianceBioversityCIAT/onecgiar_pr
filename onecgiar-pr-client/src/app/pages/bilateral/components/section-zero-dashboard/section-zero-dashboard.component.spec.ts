import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionZeroDashboardComponent } from './section-zero-dashboard.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { signal } from '@angular/core';

const project = (id: number, shortName: string): BilateralProject => ({
  id,
  shortName,
  fullName: `${shortName} full name`,
  summary: null,
  description: null,
  leadCenter: { id: 49, name: 'Center One', acronym: 'C01' },
  sciencePrograms: []
});

describe('SectionZeroDashboardComponent', () => {
  let component: SectionZeroDashboardComponent;
  let fixture: ComponentFixture<SectionZeroDashboardComponent>;
  let creationService: jest.Mocked<Partial<BilateralCreationService>>;
  let mdsTracker: Partial<BilateralMdsTrackerService>;
  let autoSave: { saveContributors: jest.Mock };

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null) as any,
      selectedPrimarySp: signal(null) as any,
      selectedSecondarySps: signal([]) as any,
      isAiGenerated: signal(false) as any,
      isLoadingResult: signal(false) as any,
      currentResultId: signal(null) as any,
      resultCode: signal(null) as any,
      isW3Bilateral: signal(false) as any,
      resultTypeName: signal(null) as any,
      reportingYear: signal(null) as any,
      // P2-3518 — the Section 0 project field is editable, so the mock now has to answer the same
      // questions the picker and the read-only gate ask of the real service.
      resultStatusId: signal(null) as any,
      isEditableByCenterUser: signal(true) as any,
      projects: signal([]) as any,
      isLoadingProjects: signal(false) as any,
      resultContributingProjectIds: signal([]) as any,
      getProjects: jest.fn(),
      selectProject: jest.fn(),
      setLeadProject: jest.fn(),
      leadProjectSyncPayload: jest.fn().mockReturnValue([]),
    };

    mdsTracker = {
      overallStatus: signal('empty'),
    } as any;

    autoSave = { saveContributors: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SectionZeroDashboardComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionZeroDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitRequested on submit', () => {
    const emitSpy = jest.spyOn(component.submitRequested, 'emit');
    component.onSubmit();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should show empty project hint when no project selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select a project');
  });

  it('should label unavailable actions and keep submit status visible', () => {
    const el = fixture.nativeElement as HTMLElement;
    const statuses = Array.from(el.querySelectorAll('.bp-action-status'))
      .map(status => status.textContent?.trim());

    expect(statuses).toEqual(['Coming soon', 'Coming soon', 'Coming soon', 'In progress']);
  });

  it('should show the AI Result badge when the result was generated with AI', () => {
    (creationService.isAiGenerated as any).set(true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AI Result');
  });

  it('should show the result code, type, reporting year, and W3/Bilateral fields as labeled metadata', () => {
    (creationService.resultCode as any).set('BEANS4WOMEN-001');
    (creationService.resultTypeName as any).set('Knowledge product');
    (creationService.reportingYear as any).set(2025);
    (creationService.isW3Bilateral as any).set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.bp-meta-field-label')).map(l => l.textContent?.trim());
    expect(labels).toEqual(['Result code', 'Result type', 'Reporting phase', 'Funding source']);
    expect(el.querySelector('.bp-meta-field-value--code')?.textContent).toContain('BEANS4WOMEN-001');
    expect(el.querySelectorAll('.bp-meta-field-value')[1]?.textContent).toContain('Knowledge product');
    expect(el.querySelectorAll('.bp-meta-field-value')[2]?.textContent).toContain('2025');
    expect(el.querySelector('.bp-meta-field-value--w3')?.textContent).toContain('W3 / Bilateral');
  });

  it('should not show the result meta row when none of its fields are set', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.bp-result-meta')).toBeNull();
  });
  /**
   * P2-3518 — the W3/Bilateral project of an existing result was painted as static text, so a draft
   * created against the wrong project could never be corrected from the UI.
   *
   * Every assertion below reads the RENDERED DOM on purpose: the client runs zoneless, so a spec
   * that asserted a class property would pass with the defect still on screen.
   */
  describe('changing the lead W3/Bilateral project (P2-3518)', () => {
    const openEditableResultOn = (current: BilateralProject) => {
      (creationService.currentResultId as any).set(41);
      (creationService.selectedProject as any).set(current);
      (creationService.isEditableByCenterUser as any).set(true);
      fixture.detectChanges();
    };

    it('renders the project picker inside the Project field while the result is editable', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.bp-meta-field--project app-bilateral-project-selector')).not.toBeNull();
    });

    // ⚠️ Regression lock (a). A result that already left Editing is the Science Program's, not the
    // centre's: the field must fall back to plain text with no way to open a dropdown.
    it('keeps the project as plain text, with no picker, once the result is no longer editable', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));
      (creationService.isEditableByCenterUser as any).set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).toBeNull();
      expect(el.querySelector('.bp-meta-field-value--project')?.textContent).toContain('OLDPROJ full name');
    });

    it('keeps the project as plain text when the editor passes readOnly', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).toBeNull();
      expect(el.querySelector('.bp-meta-field-value--project')?.textContent).toContain('OLDPROJ full name');
    });

    it('never offers the picker on the create wizard, where no result exists yet', () => {
      (creationService.currentResultId as any).set(null);
      (creationService.selectedProject as any).set(project(12, 'OLDPROJ'));
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('app-bilateral-project-selector')).toBeNull();
    });

    // ⚠️ Regression lock (b). The save goes through the contributors endpoint that already exists,
    // and its `contributing_bilateral_projects` array is a SYNC-REPLACE that also carries `is_lead`
    // — so the whole list has to travel, with the new project flagged as the lead.
    it('saves the picked project as the new lead through the existing contributors endpoint', () => {
      const next = project(77, 'NEWPROJ');
      (creationService.projects as any).set([project(12, 'OLDPROJ'), next]);
      (creationService.leadProjectSyncPayload as jest.Mock).mockReturnValue([
        { project_id: 77, is_lead: true },
        { project_id: 30, is_lead: false }
      ]);
      openEditableResultOn(project(12, 'OLDPROJ'));

      const el = fixture.nativeElement as HTMLElement;
      (el.querySelector('app-bilateral-project-selector .bps-field') as HTMLElement).click();
      fixture.detectChanges();

      const option = Array.from(el.querySelectorAll('app-bilateral-project-selector .bps-option')).find(o =>
        o.textContent?.includes('NEWPROJ')
      ) as HTMLElement;
      option.click();
      fixture.detectChanges();

      // The picker re-points the lead WITHOUT clearing the Science Program: `selectProject` (the
      // wizard's entry point) wipes it, and what a project change should do to the Science Program
      // is still an open requirement question.
      expect(creationService.setLeadProject).toHaveBeenCalledWith(next);
      expect(creationService.selectProject).not.toHaveBeenCalled();
      expect(autoSave.saveContributors).toHaveBeenCalledWith({
        contributing_bilateral_projects: [
          { project_id: 77, is_lead: true },
          { project_id: 30, is_lead: false }
        ]
      });
    });

    it('does not write anything when the picker somehow fires on a read-only result', () => {
      const next = project(77, 'NEWPROJ');
      (creationService.projects as any).set([next]);
      openEditableResultOn(project(12, 'OLDPROJ'));
      (creationService.isEditableByCenterUser as any).set(false);
      fixture.detectChanges();

      component.onProjectChanged();

      expect(autoSave.saveContributors).not.toHaveBeenCalled();
    });
  });
});
