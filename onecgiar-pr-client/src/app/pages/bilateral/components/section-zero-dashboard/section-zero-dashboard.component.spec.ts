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

  it('should show empty project hint when no project selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select a project');
  });

  // The Actions card is gone (feedback 2026-09-04): Submit for review lives in the editor's
  // sections rail, and a column of disabled Coming-soon buttons earned no screen space.
  it('renders NO Actions card — no submit, no Coming-soon buttons, no stale badge', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.bp-dashboard-card--actions')).toBeNull();
    expect(el.querySelectorAll('.bp-action-btn').length).toBe(0);
    expect(el.textContent).not.toContain('Coming soon');
    expect(el.textContent).not.toContain('In progress');
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
  /**
   * 2026-09-05 (Juan David) — the primary W3/Bilateral project is the result's identity and must
   * NOT be changeable from the editor. This REVERSES the P2-3518 inline picker: the field is plain
   * text in every state, editable results included. A draft created against the wrong project is
   * discarded and recreated, not re-pointed. Every assertion reads the RENDERED DOM on purpose:
   * the client runs zoneless, so a spec that asserted a class property would pass with the defect
   * still on screen.
   */
  describe('the primary W3/Bilateral project is never editable', () => {
    const openEditableResultOn = (current: BilateralProject) => {
      (creationService.currentResultId as any).set(41);
      (creationService.selectedProject as any).set(current);
      (creationService.isEditableByCenterUser as any).set(true);
      fixture.detectChanges();
    };

    it('renders the project as plain text even while the result is editable', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).toBeNull();
      expect(el.querySelector('.bp-meta-field-value--project')?.textContent).toContain('OLDPROJ full name');
    });

    it('renders plain text once the result is no longer editable, exactly the same', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));
      (creationService.isEditableByCenterUser as any).set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).toBeNull();
      expect(el.querySelector('.bp-meta-field-value--project')?.textContent).toContain('OLDPROJ full name');
    });

    it('never writes to the contributors endpoint from this card', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));

      expect(autoSave.saveContributors).not.toHaveBeenCalled();
    });
  });
});
