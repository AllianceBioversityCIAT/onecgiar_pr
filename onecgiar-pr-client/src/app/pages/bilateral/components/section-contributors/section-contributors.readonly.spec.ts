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
});
