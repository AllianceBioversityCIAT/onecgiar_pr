import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionZeroDashboardComponent } from './section-zero-dashboard.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';
import { signal } from '@angular/core';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { of } from 'rxjs';

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
      applyPrimaryAssignment: jest.fn(),
      loadResult: jest.fn(),
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
        { provide: BilateralApiService, useValue: { PATCH_primaryAssignment: jest.fn().mockReturnValue(of({})) } },
        { provide: BilateralContextService, useValue: { centerInstitutionId: signal(null) } },
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
  describe('P2-3283 primary assignment editing', () => {
    const openEditableResultOn = (current: BilateralProject) => {
      (creationService.currentResultId as any).set(41);
      (creationService.selectedProject as any).set(current);
      (creationService.selectedPrimarySp as any).set({ programId: 1, programCode: 'SP01', allocation: '100' });
      fixture.detectChanges();
    };

    it('renders the staged project picker while the result is editable', () => {
      const current = project(12, 'OLDPROJ');
      current.sciencePrograms = [{ programId: 1, programCode: 'SP01', allocation: '100', spName: 'Program one', spShortName: 'P1' }];
      openEditableResultOn(current);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).not.toBeNull();
    });

    it('renders a reviewed result as static text', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-bilateral-project-selector')).toBeNull();
      expect(el.querySelector('.bp-meta-field-value--project')?.textContent).toContain('OLDPROJ full name');
    });

    // P2-3759 — QA on prtest v1.3.4: the Lead Center was drawn BELOW the W3/Bilateral Project field
    // and labelled "Center". The story asks for it "Positioned above the W3/Bilateral Project field"
    // and named "Lead Center". These read the rendered DOM because the field order IS the defect.
    describe('P2-3759 Lead Center placement and label', () => {
      const projectFieldLabels = (): string[] =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.bp-project-fields .bp-meta-field-label')).map(
          label => label.textContent?.trim() ?? ''
        );

      it('renders the Lead Center ABOVE the project field, labelled "Lead Center"', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));

        const labels = projectFieldLabels();
        expect(labels).toContain('Lead Center');
        expect(labels).not.toContain('Center');
        expect(labels.indexOf('Lead Center')).toBeGreaterThanOrEqual(0);
        expect(labels.indexOf('Lead Center')).toBeLessThan(labels.indexOf('Project'));
      });

      it('keeps the Lead Center above the project field on a read-only result too', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));
        fixture.componentRef.setInput('readOnly', true);
        fixture.detectChanges();

        const labels = projectFieldLabels();
        // The >= 0 assert is load-bearing: a missing label indexes to -1, which would satisfy
        // "before Project" while the field is not on screen at all.
        expect(labels.indexOf('Lead Center')).toBeGreaterThanOrEqual(0);
        expect(labels.indexOf('Lead Center')).toBeLessThan(labels.indexOf('Project'));
      });

      it('still shows the lead centre acronym and its full name as the title', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));

        const leadCenter = (fixture.nativeElement as HTMLElement).querySelector('.bp-meta-field--lead-center');
        expect(leadCenter?.querySelector('.bp-meta-field-label')?.textContent?.trim()).toBe('Lead Center');
        expect(leadCenter?.querySelector('.bp-meta-field-value')?.textContent?.trim()).toBe('C01');
        expect(leadCenter?.querySelector('.bp-meta-field-value')?.getAttribute('title')).toBe('Center One');
      });
    });

    it('requires a program after selecting a project with multiple allocations', () => {
      openEditableResultOn(project(12, 'OLDPROJ'));
      component.onProjectCandidate({
        ...project(77, 'NEWPROJ'),
        sciencePrograms: [
          { programId: 2, programCode: 'SP02', allocation: '60', spName: 'Program two', spShortName: 'P2' },
          { programId: 3, programCode: 'SP03', allocation: '40', spName: 'Program three', spShortName: 'P3' },
        ],
      });

      expect(component.requiresPrimarySelection()).toBe(true);
    });
  });
});
