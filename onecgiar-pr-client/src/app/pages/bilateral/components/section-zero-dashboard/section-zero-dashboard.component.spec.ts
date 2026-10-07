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

const primaryRequestResponse = (
  state: 'none' | 'pending' | 'sent_back' | 'accepted',
  programCode: string | null = null,
  declinedByCodes: string[] = [],
) =>
  of({
    response: {
      initiativeId: null,
      officialCode: null,
      initiativeName: null,
      primary_request: { state, program_code: programCode, declined_by_codes: declinedByCodes },
    },
  });

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
      // P2-3760 — Contribution % stored on the lead project row; null = never answered.
      resultContributionPercentage: signal(null) as any,
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
        {
          provide: BilateralApiService,
          useValue: {
            PATCH_primaryAssignment: jest.fn().mockReturnValue(of({})),
            GET_resultInitiativeId: jest.fn().mockReturnValue(primaryRequestResponse('none')),
          },
        },
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

    // P2-3760 — the Contribution % field (P2-3352 § 6) was missing from the form entirely.
    // Every assert reads the RENDERED DOM: the client runs zoneless, so asserting a class
    // property passes with the defect still on screen.
    describe('P2-3760 — Contribution percentage', () => {
      const contributionField = () =>
        (fixture.nativeElement as HTMLElement).querySelector(
          '.bp-meta-field--contribution',
        );

      it('renders the field labelled "Contribution" with its % unit', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));

        const field = contributionField();
        expect(field).not.toBeNull();
        expect(field?.querySelector('.bp-meta-field-label')?.textContent?.trim()).toBe(
          'Contribution',
        );
        expect(field?.textContent).toContain('%');
      });

      it('defaults to 100 when nothing was ever stored', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));

        expect(component.contributionValue()).toBe(100);
      });

      it('shows the stored percentage instead of the default once one exists', () => {
        (creationService.resultContributionPercentage as any).set(42.5);
        openEditableResultOn(project(12, 'OLDPROJ'));

        expect(component.contributionValue()).toBe(42.5);
      });

      it('is read-only text, with no input, once the result left Editing', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));
        fixture.componentRef.setInput('readOnly', true);
        fixture.detectChanges();

        const field = contributionField();
        expect(field?.querySelector('app-pr-input')).toBeNull();
        expect(field?.querySelector('.bp-meta-field-value')?.textContent?.trim()).toBe('100%');
      });

      it('clamps what the reporter types into 0-100', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));

        component.onContributionInput('250');
        expect(component.contributionValue()).toBe(100);

        component.onContributionInput('-8');
        expect(component.contributionValue()).toBe(0);

        component.onContributionInput('33.333');
        expect(component.contributionValue()).toBe(33.33);
      });

      it('treats an emptied box as "keep the stored value", not as zero', () => {
        (creationService.resultContributionPercentage as any).set(60);
        openEditableResultOn(project(12, 'OLDPROJ'));

        component.onContributionInput('');

        expect(component.contributionValue()).toBe(60);
        expect(component.hasContributionChange()).toBe(false);
      });

      it('offers the save button when ONLY the percentage changed, and names what it saves', () => {
        openEditableResultOn(project(12, 'OLDPROJ'));
        component.onContributionInput('80');
        fixture.detectChanges();

        expect(component.hasAssignmentChange()).toBe(true);
        expect(component.saveButtonLabel()).toBe('Save contribution');
        expect(
          (fixture.nativeElement as HTMLElement).querySelector('.bp-assignment-save')
            ?.textContent?.trim(),
        ).toBe('Save contribution');
      });

      it('sends contribution_percentage only when it actually changed', () => {
        const api = TestBed.inject(BilateralApiService) as any;
        openEditableResultOn(project(12, 'OLDPROJ'));

        component.saveAssignment();
        expect(api.PATCH_primaryAssignment.mock.calls[0][1]).not.toHaveProperty(
          'contribution_percentage',
        );

        component.onContributionInput('80');
        component.saveAssignment();
        expect(api.PATCH_primaryAssignment.mock.calls[1][1]).toMatchObject({
          contribution_percentage: 80,
        });
      });

      // P2-3807 — prtest #9553: the stored primary carries the CLARISA initiative id (52) while
      // the catalogue keys SP03 by its mapping id (269); sending 52 got a 400 "not allocated".
      it('sends the catalogue programId of the stored primary, matched by program code', () => {
        const api = TestBed.inject(BilateralApiService) as any;
        const current = project(1676, 'L-ACI032');
        current.sciencePrograms = [
          { programId: 269, programCode: 'SP03', allocation: '100.00', spName: 'Program three', spShortName: 'P3' },
        ];
        (creationService.currentResultId as any).set(12021);
        (creationService.selectedProject as any).set(current);
        (creationService.selectedPrimarySp as any).set({ programId: 52, programCode: 'SP03', allocation: '100' });
        fixture.detectChanges();

        component.onContributionInput('42');
        component.saveAssignment();

        expect(api.PATCH_primaryAssignment.mock.calls[0][1]).toEqual({
          project_id: 1676,
          primary_science_program_id: 269,
          contribution_percentage: 42,
        });
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

  // PSR-T-10 (notifications/bilateral-primary-sp-request) — on-hold / sent-back banner, picker
  // gating, declined-SP marking, and the submit-blocked reason, all driven by `primary_request`
  // from `GET_resultInitiativeId` (replaces the old `tocCleared` boolean on the PATCH response).
  describe('PSR-T-10 — primary request state (on hold / sent back)', () => {
    const setPrimaryRequest = (
      state: 'none' | 'pending' | 'sent_back' | 'accepted',
      programCode: string | null = null,
      declinedByCodes: string[] = [],
    ) => {
      const api = TestBed.inject(BilateralApiService) as any;
      api.GET_resultInitiativeId.mockReturnValue(
        primaryRequestResponse(state, programCode, declinedByCodes),
      );
    };

    const openResultWithProgramOptions = (resultId: number) => {
      const current = project(12, 'OLDPROJ');
      current.sciencePrograms = [
        { programId: 1, programCode: 'SP09', allocation: '70', spName: 'Program nine', spShortName: 'SP09' },
        { programId: 2, programCode: 'SP12', allocation: '30', spName: 'Program twelve', spShortName: 'SP12' },
      ];
      (creationService.selectedProject as any).set(current);
      (creationService.selectedPrimarySp as any).set({ programId: 1, programCode: 'SP09', allocation: '70' });
      (creationService.currentResultId as any).set(resultId);
      fixture.detectChanges();
    };

    it('Falsifier: state "pending" keeps the primary-program picker disabled', () => {
      setPrimaryRequest('pending', 'SP09');
      openResultWithProgramOptions(21);

      const el = fixture.nativeElement as HTMLElement;
      const toggle = el.querySelector('.bp-primary-selector') as HTMLButtonElement;
      expect(toggle.disabled).toBe(true);

      toggle.click();
      fixture.detectChanges();
      expect(el.querySelector('.bp-primary-options')).toBeNull();
      expect(component.showPrimaryOptions()).toBe(false);
    });

    it('shows the "Awaiting acceptance" banner while pending', () => {
      setPrimaryRequest('pending', 'SP09');
      openResultWithProgramOptions(21);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Awaiting SP09 acceptance as primary Science Program');
      expect(el.textContent).toContain(
        'Submit for review is unavailable until a primary Science Program accepts.',
      );
    });

    it('Falsifier: state "sent_back" keeps the picker enabled and marks the declined SP', () => {
      // Server shape (primary-program-request.service.ts L346-350): sent_back never carries
      // program_code — only declined_by_codes.
      setPrimaryRequest('sent_back', null, ['SP09']);
      openResultWithProgramOptions(22);

      const el = fixture.nativeElement as HTMLElement;
      const toggle = el.querySelector('.bp-primary-selector') as HTMLButtonElement;
      expect(toggle.disabled).toBe(false);

      toggle.click();
      fixture.detectChanges();
      expect(el.querySelector('.bp-primary-options')).not.toBeNull();

      const options = Array.from(el.querySelectorAll('.bp-primary-options button'));
      const declinedOption = options.find((btn) => btn.textContent?.includes('SP09'));
      expect(declinedOption?.textContent).toContain('(declined)');
      const otherOption = options.find((btn) => btn.textContent?.includes('SP12'));
      expect(otherOption?.textContent).not.toContain('(declined)');

      // DD-8: a declined SP stays selectable — re-picking it starts a new round.
      expect(declinedOption?.hasAttribute('disabled')).toBe(false);
    });

    it('shows the "Declined by" banner while sent back, built from declined_by_codes (not program_code)', () => {
      setPrimaryRequest('sent_back', null, ['SP09']);
      openResultWithProgramOptions(22);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Declined by SP09. Pick another primary Science Program');
    });

    it('joins both codes when a two-alignment project has had both SPs decline', () => {
      setPrimaryRequest('sent_back', null, ['SP09', 'SP12']);
      openResultWithProgramOptions(22);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain(
        'Declined by SP09, SP12. Pick another primary Science Program',
      );
    });

    it('Falsifier: state "none" with no owner is pickable — a warning banner with no codes, enabled picker, submit-blocked reason', () => {
      setPrimaryRequest('none');
      openResultWithProgramOptions(23);

      const el = fixture.nativeElement as HTMLElement;
      const toggle = el.querySelector('.bp-primary-selector') as HTMLButtonElement;
      expect(toggle.disabled).toBe(false);
      expect(el.textContent).toContain('Pick a primary Science Program');
      expect(el.textContent).not.toContain('Awaiting');
      expect(el.textContent).not.toContain('Declined by');
      expect(el.textContent).toContain(
        'Submit for review is unavailable until a primary Science Program accepts.',
      );
    });

    it('renders no banner once accepted', () => {
      setPrimaryRequest('accepted', 'SP09');
      openResultWithProgramOptions(24);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Awaiting');
      expect(el.textContent).not.toContain('Declined by');
      expect(el.textContent).not.toContain('Submit for review is unavailable');
    });

    it('updates the banner from the primary-assignment PATCH response, without waiting on a GET', () => {
      setPrimaryRequest('none');
      openResultWithProgramOptions(25);

      const api = TestBed.inject(BilateralApiService) as any;
      api.PATCH_primaryAssignment.mockReturnValue(
        of({ response: { primary_request: { state: 'pending', program_code: 'SP12', declined_by_codes: [] } } }),
      );

      component.onProjectCandidate({
        ...project(12, 'OLDPROJ'),
        sciencePrograms: [{ programId: 2, programCode: 'SP12', allocation: '100', spName: 'Program twelve', spShortName: 'SP12' }],
      });
      component.saveAssignment();
      fixture.detectChanges();

      expect(component.primaryRequest()?.state).toBe('pending');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Awaiting SP12 acceptance as primary Science Program',
      );
    });
  });

  // PDR-T-5 (notifications/primary-decline-rejects-result) — PDR-R-9 / PDR-DD-8: once the result
  // is read-only, a "sent_back" primaryRequest means Rejected (final), not an awaiting-re-pick
  // round. Old sent-back results (not read-only) must keep today's banner and picker untouched.
  describe('PDR-T-5 — rejected banner (sent_back + readOnly)', () => {
    const setPrimaryRequest = (
      state: 'none' | 'pending' | 'sent_back' | 'accepted',
      programCode: string | null = null,
      declinedByCodes: string[] = [],
    ) => {
      const api = TestBed.inject(BilateralApiService) as any;
      api.GET_resultInitiativeId.mockReturnValue(
        primaryRequestResponse(state, programCode, declinedByCodes),
      );
    };

    const openResult = (resultId: number) => {
      (creationService.selectedProject as any).set(project(12, 'OLDPROJ'));
      (creationService.currentResultId as any).set(resultId);
      fixture.detectChanges();
    };

    it('Falsifier: sent_back + readOnly shows the rejected banner, danger tone, with no "Pick another" text', () => {
      setPrimaryRequest('sent_back', null, ['SP09']);
      openResult(31);
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain(
        'Declined by SP09 as primary Science Program. The result was rejected.',
      );
      expect(el.textContent).not.toContain('Pick another');
      // app-alert-status has no 'danger' status; 'error' is its most severe equivalent.
      expect(component.primaryAssignmentBanner()?.tone).toBe('error');
    });

    it('Falsifier: sent_back + NOT readOnly keeps the old "Pick another" banner (old sent-back results)', () => {
      setPrimaryRequest('sent_back', null, ['SP09']);
      openResult(32);
      fixture.componentRef.setInput('readOnly', false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Declined by SP09. Pick another primary Science Program');
      expect(el.textContent).not.toContain('The result was rejected.');
      expect(component.primaryAssignmentBanner()?.tone).toBe('warning');
    });

    it('Falsifier: pending + readOnly does NOT show the rejected text', () => {
      setPrimaryRequest('pending', 'SP09');
      openResult(33);
      fixture.componentRef.setInput('readOnly', true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('The result was rejected.');
    });
  });

  // PNS-T-3 (notifications/primary-notify-on-submit) — PNS-R-5: a saved-but-not-yet-sent primary
  // choice shows an info banner, keeps the picker enabled, and does NOT block Submit. Falls through
  // to the `none` branch (today's `noneUnpicked` warning) if `'draft'` is missing from the switch —
  // that is the defect this task guards against.
  describe('PNS-T-3 — draft state banner and Submit not blocked', () => {
    const setPrimaryRequest = (
      state: 'none' | 'pending' | 'sent_back' | 'accepted' | 'draft',
      programCode: string | null = null,
      declinedByCodes: string[] = [],
    ) => {
      const api = TestBed.inject(BilateralApiService) as any;
      api.GET_resultInitiativeId.mockReturnValue(
        primaryRequestResponse(state as any, programCode, declinedByCodes),
      );
    };

    const openResult = (resultId: number) => {
      (creationService.selectedProject as any).set(project(12, 'OLDPROJ'));
      (creationService.currentResultId as any).set(resultId);
      fixture.detectChanges();
    };

    it('Falsifier: state "draft" shows the info banner "SP09 will be asked to be the primary Science Program when you submit for review"', () => {
      setPrimaryRequest('draft', 'SP09');
      openResult(41);

      expect(component.primaryAssignmentBanner()?.tone).toBe('info');
      expect(component.primaryAssignmentBanner()?.message).toBe(
        'SP09 will be asked to be the primary Science Program when you submit for review',
      );
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain(
        'SP09 will be asked to be the primary Science Program when you submit for review',
      );
    });

    it('Falsifier: state "draft" does not block Submit and keeps the picker enabled', () => {
      setPrimaryRequest('draft', 'SP09');
      openResult(42);

      expect(component.submitBlockedReason()).toBeNull();
      expect(component.primaryPickerDisabled()).toBe(false);
    });

    it('Regression: state "pending" still shows "Awaiting SP09 acceptance..." and blocks Submit', () => {
      setPrimaryRequest('pending', 'SP09');
      openResult(43);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Awaiting SP09 acceptance as primary Science Program');
      expect(component.submitBlockedReason()).not.toBeNull();
      expect(component.primaryPickerDisabled()).toBe(true);
    });
  });
  // RRC-T-7 (bilateral/rejected-result-correction) — RRC-R-11 + T-1 forward pointer: at Rejected (7)
  // the owner shown comes from the role-1 initiative, not from the (deactivated -> "none") request.
  describe('RRC-T-7 — Rejected (7): owner chip and single-allocation note', () => {
    const SP = (programId: number, programCode: string) => ({
      programId,
      programCode,
      allocation: '100',
      spName: `Program ${programCode}`,
      spShortName: programCode,
    });

    const openRejected = (programs: any[], status: number | null = 7, requestState: any = 'none') => {
      const api = TestBed.inject(BilateralApiService) as any;
      api.GET_resultInitiativeId.mockReturnValue(primaryRequestResponse(requestState, null, []));
      const current = project(12, 'OLDPROJ');
      current.sciencePrograms = programs;
      (creationService.selectedProject as any).set(current);
      (creationService.selectedPrimarySp as any).set({ programId: 1, programCode: 'SP09', allocation: '100' });
      (creationService.resultStatusId as any).set(status);
      (creationService.currentResultId as any).set(60);
      fixture.detectChanges();
    };

    it('one allocated SP at 7: read-only chip with the owner + the note, and no empty dropdown', () => {
      openRejected([SP(1, 'SP09')]);

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="bp-single-allocation-chip"]')?.textContent).toContain('SP09');
      expect(el.querySelector('[data-testid="bp-single-allocation-note"]')?.textContent?.trim()).toBe(
        'This project is allocated to a single Science Program, so there is no alternative to choose.',
      );
      expect(el.querySelector('.bp-primary-selector')).toBeNull();
    });

    it('T-1 pointer: request state "none" at 7 with an owner still shows the owner, no "pick" banner, Submit not blocked', () => {
      openRejected([SP(1, 'SP09')], 7, 'none');

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('SP09');
      expect(el.textContent).not.toContain('Pick a primary Science Program');
      expect(component.primaryAssignmentBanner()).toBeNull();
      expect(component.submitBlockedReason()).toBeNull();
    });

    it('two allocated SPs at 7: the picker is interactive and there is no single-allocation note', () => {
      openRejected([SP(1, 'SP09'), SP(2, 'SP12')]);

      const el = fixture.nativeElement as HTMLElement;
      const toggle = el.querySelector('.bp-primary-selector') as HTMLButtonElement;
      expect(toggle).not.toBeNull();
      expect(toggle.disabled).toBe(false);
      expect(el.querySelector('[data-testid="bp-single-allocation-note"]')).toBeNull();
    });

    it('falsifier: one allocated SP in Editing (1) keeps the picker, no note', () => {
      openRejected([SP(1, 'SP09')], 1, 'accepted');

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="bp-single-allocation-note"]')).toBeNull();
      expect(el.querySelector('.bp-primary-selector')).not.toBeNull();
    });

    it('sent_back at 7 (editable, not readOnly) shows the rejected banner, not "Pick another"', () => {
      openRejected([SP(1, 'SP09'), SP(2, 'SP12')], 7, 'sent_back');

      expect(component.primaryAssignmentBanner()?.tone).toBe('error');
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Pick another');
    });
  });
});
