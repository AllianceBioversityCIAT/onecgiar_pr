import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, EventEmitter, signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { SectionContributorsComponent } from './section-contributors.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../shared/services/global/institutions.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { InnovationUseResultsService } from '../../../../shared/services/global/innovation-use-results.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { SectionTocComponent } from '../section-toc/section-toc.component';

/**
 * P2-3520 — read-only must reach the SCREEN, not only the payload.
 *
 * `BilateralAutoSaveService.setReadOnly()` already blocks every write once the result leaves
 * Editing, so nothing a reporter clicked here was ever persisted. The defect QA measured on
 * result #9464 (status 5, Pending Review) was the other half: the four partner pickers still
 * opened and their checkboxes still ticked, so the screen claimed an edit the database refused.
 *
 * Cause: `pr-multi-select` draws its trigger when
 * `(!hideSelect() && !(readOnly() || rolesSE.readOnly)) || isStatic()`
 * (pr-multi-select.component.html:16), and this section passed a hard `[isStatic]="true"`.
 *
 * These specs render the REAL template on purpose — the sibling
 * `section-contributors.component.spec.ts` stubs it with `overrideTemplate`, which is exactly what
 * let the hole through.
 */
describe('SectionContributorsComponent · P2-3520 read-only chrome', () => {
  let fixture: ComponentFixture<SectionContributorsComponent>;
  let component: SectionContributorsComponent;
  let creation: any;
  let editable: ReturnType<typeof signal<boolean>>;

  /** The four pickers the ticket names, in template order. */
  const PARTNER_PICKER_LABELS = [
    'Contributing science programs',
    'Contributing CGIAR centers',
    'Contributing W3/bilateral projects',
    'External partners'
  ];

  const pickerFor = (label: string): HTMLElement => {
    const hosts = Array.from(fixture.nativeElement.querySelectorAll('app-pr-multi-select')) as HTMLElement[];
    const host = hosts.find(h => (h.textContent ?? '').includes(label));
    if (!host) throw new Error(`"${label}" picker is not rendered at all — the fixture is not exercising the case under test`);
    return host;
  };

  /**
   * What a reporter can actually operate inside one picker.
   *
   * `a.field` is the dropdown trigger; everything tickable (search box, "Select all", the option
   * checkboxes) lives inside it, so it is both the thing QA clicked and the thing that must go.
   * The count is deliberately over-broad — any focusable, non-disabled node — so a future markup
   * change cannot reintroduce the defect through a control this spec forgot to name.
   */
  const interactiveControlsIn = (host: HTMLElement) => ({
    trigger: host.querySelector('a.field'),
    focusable: Array.from(
      host.querySelectorAll('input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]')
    ).filter(el => el.getAttribute('tabindex') !== '-1')
  });

  const build = () => {
    fixture = TestBed.createComponent(SectionContributorsComponent);
    component = fixture.componentInstance;
    // Every picker in this section is fed from the component's own signals; filling them here is
    // what makes the read-only assertion meaningful (an empty catalogue renders no checkbox either).
    component.availableCenters.set([
      { institutionId: 11, code: 'C11', name: 'Center 11', acronym: 'A11' },
      { institutionId: 12, code: 'C12', name: 'Center 12', acronym: 'A12' }
    ] as any);
    component.availableProjects.set([
      { id: 501, fullName: 'Project 501' },
      { id: 502, fullName: 'Project 502' }
    ] as any);
    component.noExternalPartners.set(false);
    fixture.detectChanges();
    return component;
  };

  beforeEach(async () => {
    editable = signal(true);

    creation = {
      // P2-3520 gate. `readOnly()` in the component is the negation of this.
      isEditableByCenterUser: () => editable(),
      selectedPrimarySp: signal<any>({ programId: 1, programCode: 'SP01', name: 'Primary', allocation: '50' }),
      selectedProject: signal<any>({
        id: 501,
        leadCenter: { id: 11, acronym: 'A11', name: 'Center 11' },
        sciencePrograms: [
          { programId: 1, programCode: 'SP01', spName: 'Primary', spShortName: 'P' },
          { programId: 2, programCode: 'SP02', spName: 'Secondary', spShortName: 'S' },
          { programId: 3, programCode: 'SP03', spName: 'Third', spShortName: 'T' }
        ]
      }),
      resultLeadCenterId: signal<number | null>(11),
      resultContributingCenterIds: signal<number[]>([]),
      resultContributingProjectIds: signal<number[]>([]),
      resultContributingProjects: signal<any[]>([]),
      selectedSecondarySps: signal<any[]>([]),
      currentResultId: signal<number | null>(9464),
      resultLevelId: signal<number | null>(null),
      // P2-3368: the linked/bundled question is hidden for result types 2 and 7.
      resultTypeId: signal<number | null>(null),
      isLoadingResult: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [SectionContributorsComponent, HttpClientTestingModule],
      providers: [
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralAutoSaveService, useValue: { saveContributors: jest.fn(), fieldStatus: signal<Record<string, string>>({}) } },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        {
          provide: CentersService,
          useValue: { centersList: [] as any[], loadedCenters: new EventEmitter<boolean>(), getData: jest.fn().mockResolvedValue([]) }
        },
        {
          provide: InstitutionsService,
          useValue: {
            institutionsWithoutCentersPartners: signal<any[]>([
              { institutions_id: 100, institutions_acronym: 'FAO', institutions_name: 'Food and Agriculture Organization' },
              { institutions_id: 200, institutions_acronym: '', institutions_name: 'Ministry of Agriculture' }
            ])
          }
        },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] as any[] } },
        {
          provide: ApiService,
          useValue: {
            resultsSE: {
              GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
              GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] }))
            }
          }
        },
        {
          provide: BilateralApiService,
          useValue: {
            GET_BilateralResultDetail: jest.fn().mockReturnValue(of({ response: { commonFields: {}, contributingInstitutions: [] } }))
          }
        }
      ]
    })
      // `app-section-toc` is not under test and drags the whole spartan dialog stack in with it.
      // Everything this spec measures — `app-pr-multi-select` — stays REAL.
      .overrideComponent(SectionContributorsComponent, {
        remove: { imports: [SectionTocComponent] },
        add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] }
      })
      .compileComponents();
  });

  // ── The control case: nothing may change for a result still in Editing ────────────────
  describe('editable result (the control case)', () => {
    beforeEach(() => {
      editable.set(true);
      build();
      // P2-3821: "External partners" moved into Full metadata (BIL-R-1) — expand it so this
      // describe's shared `it.each` over all four pickers can still find the picker by label.
      component.showAllFields.set(true);
      fixture.detectChanges();
    });

    it('exposes readOnly() === false', () => {
      expect(component.readOnly()).toBe(false);
    });

    it.each(PARTNER_PICKER_LABELS)('keeps the "%s" dropdown openable and its options tickable', label => {
      const { trigger, focusable } = interactiveControlsIn(pickerFor(label));

      expect(trigger).toBeTruthy();
      expect(focusable.length).toBeGreaterThan(0);
    });
  });

  // ── The defect: Pending Review must not offer a single operable control ───────────────
  describe('read-only result (status Pending Review)', () => {
    beforeEach(() => {
      editable.set(false);
      build();
      // P2-3821: "External partners" moved into Full metadata (BIL-R-1) — expand it so this
      // describe's shared `it.each` over all four pickers can still find the picker by label.
      component.showAllFields.set(true);
      fixture.detectChanges();
    });

    it('exposes readOnly() === true', () => {
      expect(component.readOnly()).toBe(true);
    });

    it.each(PARTNER_PICKER_LABELS)('offers no interactive control in the "%s" picker', label => {
      const { trigger, focusable } = interactiveControlsIn(pickerFor(label));

      expect(trigger).toBeNull();
      expect(focusable).toEqual([]);
    });

    it('still shows every picker label, so the section reads as a form and not as a blank', () => {
      PARTNER_PICKER_LABELS.forEach(label => expect(pickerFor(label)).toBeTruthy());
    });

    it('leaves zero operable controls across the four pickers taken together', () => {
      const total = PARTNER_PICKER_LABELS.map(label => interactiveControlsIn(pickerFor(label)).focusable.length).reduce(
        (a, b) => a + b,
        0
      );

      expect(total).toBe(0);
    });

    it('keeps the chip "remove" buttons disabled as well (already fixed by P2-3520, guarded here)', () => {
      component.selectedCenterInstitutionIds.set([11, 12]);
      fixture.detectChanges();

      const removeButtons = Array.from(fixture.nativeElement.querySelectorAll('button.sc-chip-remove')) as HTMLButtonElement[];
      expect(removeButtons.length).toBeGreaterThan(0);
      removeButtons.forEach(btn => expect(btn.disabled).toBe(true));
    });
  });

  // ── BIL-T-1: the centers-catalogue-load-failure banner must actually render ───────────
  //
  // The main spec (`section-contributors.component.spec.ts`) stubs the template with
  // `overrideTemplate('<div></div>')`, so it can only assert the `centersLoadFailed()` signal —
  // never that the `@if (centersLoadFailed())` block in the real template actually renders the
  // banner. This harness renders the real template, so it is the only place that can prove the
  // template half of the falsifier: a typo in the binding or a mis-scoped block would leave every
  // signal-only test green while the user still sees nothing.
  describe('centers-catalogue load failure (BIL-T-1)', () => {
    beforeEach(() => {
      editable.set(true);
      build();
    });

    it('renders the centers-load-error banner and Retry button when centersLoadFailed() is true', () => {
      component.centersLoadFailed.set(true);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('[data-testid="centers-load-error"]');
      const retryButton = fixture.nativeElement.querySelector('[data-testid="centers-load-retry"]');
      expect(banner).toBeTruthy();
      expect(retryButton).toBeTruthy();
    });

    it('invokes retryLoadCenters() when the Retry button is clicked', () => {
      component.centersLoadFailed.set(true);
      fixture.detectChanges();

      const retrySpy = jest.spyOn(component, 'retryLoadCenters').mockImplementation(() => {});
      const retryButton = fixture.nativeElement.querySelector('[data-testid="centers-load-retry"]') as HTMLButtonElement;
      retryButton.click();

      expect(retrySpy).toHaveBeenCalledTimes(1);
    });

    it('renders no centers-load-error banner when centersLoadFailed() is false', () => {
      component.centersLoadFailed.set(false);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('[data-testid="centers-load-error"]');
      const retryButton = fixture.nativeElement.querySelector('[data-testid="centers-load-retry"]');
      expect(banner).toBeNull();
      expect(retryButton).toBeNull();
    });

    // BIL-AC-8 / BIL-R-5 / BIL-DD-3 — the centres banner reports a Block 1 failure and must stay
    // visible while Full metadata is collapsed. `build()` leaves `showAllFields` at its default
    // (false); asserting that here on purpose is what BIL-AC-8 requires.
    it('renders the centers-load-error banner while Full metadata is collapsed', () => {
      expect(component.showFullMetadata()).toBe(false);
      component.centersLoadFailed.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="centers-load-error"]')).toBeTruthy();
    });
  });

  // ── P2-3821: External partners moved into Full metadata (BIL-R-1, BIL-AC-3, BIL-AC-4, BIL-AC-9) ──
  //
  // These specs render the REAL template — `overrideTemplate` is not evidence for a placement gate
  // (only a static read of the shipped `.html`, or a rendered measurement like this one, can prove
  // it). Every case here must expand/collapse `showAllFields` through the component's own signal
  // and re-render; `pickerFor` throws "is not rendered at all" only when that IS the assertion.
  describe('External partners lives in Full metadata (P2-3821)', () => {
    const EXTERNAL_PARTNERS_LABEL = 'External partners';

    it('is absent for type 1 (Policy) while Full metadata is collapsed', () => {
      editable.set(true);
      creation.resultTypeId.set(1);
      build();
      component.showAllFields.set(false);
      fixture.detectChanges();

      expect(() => pickerFor(EXTERNAL_PARTNERS_LABEL)).toThrow();
    });

    it('is absent for type 2 (Innovation Use) while Full metadata is collapsed', () => {
      editable.set(true);
      creation.resultTypeId.set(2);
      build();
      component.showAllFields.set(false);
      fixture.detectChanges();

      expect(() => pickerFor(EXTERNAL_PARTNERS_LABEL)).toThrow();
    });

    it('is present for type 1 (Policy) once Full metadata is expanded', () => {
      editable.set(true);
      creation.resultTypeId.set(1);
      build();
      component.showAllFields.set(true);
      fixture.detectChanges();

      expect(pickerFor(EXTERNAL_PARTNERS_LABEL)).toBeTruthy();
    });

    it('is present for type 2 (Innovation Use) once Full metadata is expanded, but the linked question is absent (BIL-AC-4, BIL-R-6)', () => {
      editable.set(true);
      creation.resultTypeId.set(2);
      build();
      component.showAllFields.set(true);
      fixture.detectChanges();

      expect(pickerFor(EXTERNAL_PARTNERS_LABEL)).toBeTruthy();
      expect(fixture.nativeElement.textContent).not.toContain('Is this result linked or bundled');
    });

    it('carries no required marker on the multi-select and shows no red hint (BIL-AC-9, BIL-R-2)', () => {
      editable.set(true);
      build();
      component.showAllFields.set(true);
      component.noExternalPartners.set(false);
      component.selectedPartnerInstitutionIds.set([]);
      fixture.detectChanges();

      const host = pickerFor(EXTERNAL_PARTNERS_LABEL);
      expect(host.querySelector('.fch_required')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Add at least one external partner');
    });
  });

  // ── P2-3368 AC14: the linked-results picker is the FIFTH one, and it used to be exempt ────
  //
  // While the question was `Coming soon` this picker carried a hard `[isStatic]="true"`, so the
  // very defect P2-3520 fixed for the other four survived here untested: on a submitted result the
  // dropdown still opened. Now that the answer persists, AC14 ("read-only view reflects saved
  // values") makes that visible to real users, so it is measured with the same instrument.
  describe('linked/bundled results picker (AC14)', () => {
    const LINKED_PICKER_LABEL = 'Select a result.';

    const buildWithLinkedResults = () => {
      build();
      component.showAllFields.set(true);
      component.hasLinkedResult.set(true);
      component.selectedLinkedResultIds.set([11164]);
      fixture.detectChanges();
    };

    it('stays operable while the result is in Editing (the control case)', () => {
      editable.set(true);
      buildWithLinkedResults();

      const { trigger } = interactiveControlsIn(pickerFor(LINKED_PICKER_LABEL));
      expect(trigger).toBeTruthy();
    });

    it('offers no interactive control once the result is read-only', () => {
      editable.set(false);
      buildWithLinkedResults();

      const { trigger, focusable } = interactiveControlsIn(pickerFor(LINKED_PICKER_LABEL));
      expect(trigger).toBeNull();
      expect(focusable).toEqual([]);
    });

    it('no longer renders the Coming soon tag', () => {
      editable.set(true);
      buildWithLinkedResults();

      expect(fixture.nativeElement.querySelector('[data-testid="linked-result-coming-soon"]')).toBeNull();
    });

    // P2-3823 — a stored link the catalogue cannot name (only QA'd/approved results are listed)
    // used to vanish from the read-only view: the real `pr-multi-select` drops ids it cannot map.
    it('shows a chip for every stored link, including one the catalogue does not list (AC14)', async () => {
      TestBed.inject(InnovationUseResultsService).resultsList = [{ id: 11164, title: 'Listed result' }] as any;
      editable.set(false);
      build();
      component.showAllFields.set(true);
      component.hasLinkedResult.set(true);
      component.selectedLinkedResultIds.set([11164, 777]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const text = pickerFor(LINKED_PICKER_LABEL).textContent ?? '';
      expect(text).toContain('Listed result');
      expect(text).toContain('internal id 777');
    });

    // P2-3823 — a click before the stored answer is on screen would be overwritten by hydration.
    // `[disabled]` next to `[(ngModel)]` is applied by NgModel on a microtask, hence `whenStable`.
    // `pr-radio-button` also disables itself while the global `RolesService.readOnly` is up, and
    // that flag starts TRUE until the role request resolves. Lowered here so ONLY this section's
    // gates decide — otherwise both radio tests would pass on the roles flag and prove nothing.
    const lowerGlobalRoleLock = () => {
      TestBed.inject(RolesService).readOnly = false;
    };

    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('keeps the Yes/No radio locked until the stored answer has been read back', async () => {
      editable.set(true);
      lowerGlobalRoleLock();
      build();
      component.showAllFields.set(true);
      component.linkedHydrated.set(false);
      await settle();
      const radios = () =>
        (Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]).filter(r =>
          (r.closest('app-pr-radio-button')?.textContent ?? '').includes('linked or bundled')
        );
      expect(radios().length).toBe(2);
      expect(radios().every(r => r.disabled)).toBe(true);

      component.linkedHydrated.set(true);
      await settle();
      expect(radios().every(r => !r.disabled)).toBe(true);
    });

    it('keeps the Yes/No radio disabled on a read-only result (AC14)', async () => {
      editable.set(false);
      lowerGlobalRoleLock();
      build();
      component.showAllFields.set(true);
      component.linkedHydrated.set(true);
      await settle();
      const radios = (Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]).filter(r =>
        (r.closest('app-pr-radio-button')?.textContent ?? '').includes('linked or bundled')
      );
      expect(radios.length).toBe(2);
      expect(radios.every(r => r.disabled)).toBe(true);
    });

    it('drops the whole block for an Innovation Use result, which asks the question elsewhere', () => {
      editable.set(true);
      creation.resultTypeId.set(2);
      buildWithLinkedResults();

      expect(fixture.nativeElement.textContent).not.toContain('Is this result linked or bundled');
    });
  });

  // P2-3864 — rendered against the REAL template: the lead Center (11, "A11") is shown once, in
  // "Lead center", and never again as a chip under "Contributing CGIAR centers".
  describe('P2-3864 · lead Center chip', () => {
    it('renders the other Centers as chips but not the lead', () => {
      editable.set(true);
      build();
      component.selectedCenterInstitutionIds.set([11, 12]);
      fixture.detectChanges();

      const chips = Array.from(fixture.nativeElement.querySelectorAll('.sc-block--centers .sc-chip')) as HTMLElement[];
      const labels = chips.map(c => (c.textContent ?? '').replace('×', '').trim());
      expect(labels).toEqual(['A12']);
      expect(fixture.nativeElement.querySelector('.sc-block--centers .sc-chip-readonly')).toBeNull();
    });
  });

  // P2-3865 — the definition note renders in the REAL template, editable and read-only alike.
  describe('P2-3865 · contributor definition note', () => {
    it.each([true, false])('shows the CLARISA definition (editable=%s)', isEditable => {
      editable.set(isEditable);
      build();
      const note = fixture.nativeElement.querySelector('[data-testid="contributor-definition-note"]') as HTMLElement;
      expect(note).toBeTruthy();
      expect(note.textContent).toContain('What is a contributor?');
      expect(note.textContent).toContain('would not have been achieved or reported in its current form without their support');
      expect(note.textContent).toContain('a different CGIAR Center');
      const link = note.querySelector('a') as HTMLAnchorElement;
      expect(link?.getAttribute('href')).toBe('https://clarisa.cgiar.org/landing-page/glossary');
      expect(link?.getAttribute('target')).toBe('_blank');
    });

    const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('sits after the ToC block and right before "Contributing science programs" (QA, Santiago)', () => {
      build();
      const root = fixture.nativeElement as HTMLElement;
      const notes = root.querySelectorAll('[data-testid="contributor-definition-note"]');
      expect(notes.length).toBe(1);
      const note = notes[0];
      const toc = root.querySelector('.sc-block--toc') as Element;
      const programs = root.querySelector('.sc-block--programs') as Element;
      expect(toc).toBeTruthy();
      expect(follows(toc, note)).toBe(true);
      expect(follows(note, programs)).toBe(true);
      expect(note.nextElementSibling).toBe(programs);
      // Not at the very top any more: the MDS alert comes first, then the ToC block.
      expect(follows(note, toc)).toBe(false);
    });

    it('still renders, before "Lead center", when there is no primary SP block', () => {
      creation.selectedPrimarySp.set(null);
      build();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('.sc-block--toc')).toBeNull();
      const notes = root.querySelectorAll('[data-testid="contributor-definition-note"]');
      expect(notes.length).toBe(1);
      const firstField = root.querySelector('app-pr-field-header[label="Lead center"]')?.closest('.sc-block') as Element;
      expect(firstField).toBeTruthy();
      expect(notes[0].nextElementSibling).toBe(firstField);
    });
  });

  // P2-3859 — the Center pills inside the projects picker's panel, in the REAL template (real
  // pr-multi-select, so the `[util]` projection and the event wiring are what ships).
  describe('P2-3859 · projects Center pills', () => {
    const seed = () => {
      // `ngOnInit` reloads the (stubbed, empty) catalogue over what `build()` seeded; seed it again.
      component.availableProjects.set([
        { id: 501, fullName: 'Project 501', ownerCenterInstitutionId: 11 },
        { id: 502, fullName: 'Project 502', ownerCenterInstitutionId: 12 }
      ] as any);
      fixture.detectChanges();
    };
    const pill = (mode: 'center' | 'all') =>
      fixture.nativeElement.querySelector(`[data-testid="projects-center-pill-${mode}"]`) as HTMLButtonElement;
    // The spans are laid out with `gap` (Angular strips the whitespace between them).
    const pillText = (mode: 'center' | 'all') =>
      Array.from(pill(mode).querySelectorAll('span'))
        .map(sp => sp.textContent?.trim())
        .filter(Boolean)
        .join(' ');

    it('renders two pills under the search box of the projects panel, the page Center pressed', () => {
      editable.set(true);
      build();
      seed();
      const host = pickerFor('Contributing W3/bilateral projects');
      const group = host.querySelector('.options .util_container [data-testid="projects-center-pills"]') as HTMLElement;
      expect(group).toBeTruthy();
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Filter projects by Center');
      // Right under the search input, inside the same panel.
      expect(host.querySelector('.options .search_input_container')?.nextElementSibling?.classList.contains('util_container')).toBe(true);
      expect(pillText('center')).toBe('A11 (1)');
      expect(pillText('all')).toBe('All centers (2)');
      expect(pill('center').getAttribute('aria-pressed')).toBe('true');
      expect(pill('all').getAttribute('aria-pressed')).toBe('false');
      expect(pill('center').type).toBe('button');
      // The old strip is gone.
      expect(fixture.nativeElement.querySelector('[data-testid="projects-center-filter"]')).toBeNull();
      // The slot is filled for the projects picker only.
      expect(fixture.nativeElement.querySelectorAll('[data-testid="projects-center-pills"]').length).toBe(1);
    });

    it('a pill click keeps the panel open, toggles no option and saves nothing', () => {
      editable.set(true);
      build();
      seed();
      component.contributorsHydrated.set(true);
      const autoSave = TestBed.inject(BilateralAutoSaveService) as any;
      autoSave.saveContributors.mockClear();
      const host = pickerFor('Contributing W3/bilateral projects');
      const trigger = host.querySelector('a.field') as HTMLElement;
      const search = host.querySelector('.options .search_input_container input') as HTMLInputElement;
      search.focus();
      expect(document.activeElement).toBe(search);

      const triggerClicks = jest.fn();
      trigger.addEventListener('click', triggerClicks);

      // Focus: the mousedown is cancelled, so the browser never moves focus off the search box and
      // `a.field:focus-within` (what keeps the panel open) holds — Safari included.
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      pill('all').dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      pill('all').click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(search);
      expect(trigger.contains(document.activeElement)).toBe(true);
      expect(triggerClicks).not.toHaveBeenCalled();
      expect(pill('all').getAttribute('aria-pressed')).toBe('true');
      expect(pill('center').getAttribute('aria-pressed')).toBe('false');
      expect(component.filteredProjectOptions().map(p => p.id)).toEqual([501, 502]);
      expect(component.selectedProjectIds()).toEqual([]);
      expect(Array.from(host.querySelectorAll('.options input[type="checkbox"]')).some(c => (c as HTMLInputElement).checked)).toBe(false);
      expect(autoSave.saveContributors).not.toHaveBeenCalled();

      pill('center').click();
      fixture.detectChanges();
      expect(component.filteredProjectOptions().map(p => p.id)).toEqual([501]);
      expect(autoSave.saveContributors).not.toHaveBeenCalled();
    });

    it('keeps a saved project from another Center selected while the page Center pill is on', () => {
      editable.set(true);
      build();
      seed();
      component.contributorsHydrated.set(true);
      component.selectedProjectIds.set([502]);
      fixture.detectChanges();
      expect(pill('center').getAttribute('aria-pressed')).toBe('true');
      expect(component.filteredProjectOptions().map(p => p.id)).toEqual([501, 502]);
      expect(component.selectedProjectIds()).toEqual([502]);
    });

    it('is not rendered on a read-only result (the picker cannot open)', () => {
      editable.set(false);
      build();
      seed();
      expect(fixture.nativeElement.querySelector('[data-testid="projects-center-pills"]')).toBeNull();
    });
  });
});
