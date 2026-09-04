import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ReportResultFormComponent } from './report-result-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { TerminologyService } from '../../../../../../internationalization/terminology.service';
import { EntityAowService } from '../../../../../result-framework-reporting/pages/entity-aow/services/entity-aow.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { ResultLevelCardsComponent } from '../result-level-cards/result-level-cards.component';
import { ResultBody } from '../../../../../../shared/interfaces/result.interface';
import { INNOVATION_LINK_QUESTION } from '../../../../../../shared/services/global/qa-innovation-development-results.service';

/**
 * P2-3569 — the question RENDERS, not just "the getter returns true".
 *
 * The sibling `innovation-link-surfaces.spec.ts` guards the other half: that every host of this
 * form passes `[showInnovationLinkQuestion]`. Neither guard replaces the other, and the bug QA
 * found needed both — the flag was wired only on a retired, unrouted page, and no test rendered
 * the block, so the whole feature shipped invisible while every existing assertion stayed green.
 *
 * 🛑 That is why these assertions go through the DOM. `report-result-form.component.spec.ts`
 * already covers `showsInnovationLink` / `innovationLinkIncomplete` by setting fields on the
 * instance — and every one of those would still pass with the `@if` block deleted from the
 * template. This file is the one that would not.
 */
describe('ReportResultFormComponent — the innovation-link question renders (P2-3569)', () => {
  let component: ReportResultFormComponent;
  let fixture: ComponentFixture<ReportResultFormComponent>;
  let resultLevelSE: any;
  /** What the user has already chosen; re-applied whenever `ngOnInit` swaps in a fresh body. */
  let pinnedChoices: { result_level_id?: number; result_type_id?: number } = {};

  const INNOVATION_USE = 2;
  const INNOVATION_DEVELOPMENT = 7;

  beforeEach(async () => {
    const apiService: any = {
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        reportingPhaseVersion: signal(0),
        reportingCurrentPhase: { portfolioAcronym: 'P25', phaseYear: 2026 },
        previousReportingPhase: { phaseYear: 2025 },
        myInitiativesListReportingByPortfolio: [{ id: 1, initiative_id: 1, full_name: 'SP01', typeCode: 'SP' }],
        myInitiativesList: [],
        validateBody: jest.fn(),
        someMandatoryFieldIncompleteResultDetail: jest.fn(),
        fieldFeedbackList: jest.fn(() => [])
      },
      rolesSE: { validateReadOnly: jest.fn(() => Promise.resolve()), isAdmin: true },
      alertsFe: { show: jest.fn() },
      resultsSE: {
        GET_AllInitiatives: jest.fn(() => of({ response: [] })),
        GET_cgiarEntityTypes: jest.fn(() => of({ response: [] })),
        GET_depthSearch: jest.fn(() => of([])),
        GET_checkTitleUniqueness: jest.fn(() => of({ response: { isUnique: true, existing: null } })),
        GET_qaInnovationDevelopmentResults: jest.fn(() =>
          of({ response: [{ id: 501, result_code: 5501, title: 'Drought-tolerant bean variety', status_id: 2, phase_year: 2025, acronym: 'P25' }] })
        )
      },
      updateUserData: jest.fn(callback => callback())
    };

    pinnedChoices = {};
    let body: any = Object.assign(new ResultBody(), pinnedChoices);

    resultLevelSE = {
      currentResultTypeList: [{ id: INNOVATION_USE, name: 'Innovation use' }],
      resultLevelList: [{ id: 3, selected: false, name: 'Outcome' }],
      resultLevelListSig: signal([{ id: 3, selected: false, name: 'Outcome' }]),
      cleanData: jest.fn(),
      resetSelection: jest.fn(),
      consumePendingResultType: jest.fn(() => null),
      preselectResultType: jest.fn(),
      outputOutcomeLevelsSig: signal([])
    };

    Object.defineProperty(resultLevelSE, 'resultBody', {
      get: () => body,
      set: (fresh: any) => {
        body = Object.assign(fresh, pinnedChoices);
      },
      configurable: true
    });

    await TestBed.configureTestingModule({
      declarations: [ReportResultFormComponent, ResultLevelCardsComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, CustomFieldsModule, TermPipe],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ResultLevelService, useValue: resultLevelSE },
        { provide: PhasesService, useValue: { phases: { reporting: [], ipsr: [] }, currentlyActivePhaseOnReporting: { cgspace_year: 2026 } } },
        { provide: TerminologyService, useValue: { t: jest.fn((k: string, p?: string) => p || k) } },
        { provide: EntityAowService, useValue: { canReportResults: () => true } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportResultFormComponent);
    component = fixture.componentInstance;
  });

  /**
   * Renders the component as the live emergent modal has it once the user has picked a level and a
   * category: opt-in flag on, Innovation use, 2026 phase.
   *
   * ⚠️ Two traps live here, and both are about `ngOnInit` (`report-result-form.component.ts:117`),
   * which does `this.resultLevelSE.resultBody = new ResultBody()`:
   * 1. anything set on `resultBody` BEFORE the first change detection is thrown away by that line;
   * 2. setting it AFTER, between two `detectChanges()` calls, raises NG0100 — the level cards read
   *    `result_level_id` and it changed after they were checked.
   *
   * So the mock pins the user's choices through the reassignment instead. One change-detection
   * pass, values already in place, which is what the component sees in the real modal by the time
   * the question can appear.
   */
  const renderAsLiveEmergentModal = (resultTypeId: number = INNOVATION_USE) => {
    pinnedChoices = { result_level_id: 3, result_type_id: resultTypeId };
    component.showInnovationLinkQuestion = true;
    fixture.detectChanges();
  };

  const block = (): HTMLElement | null => fixture.nativeElement.querySelector('.innovation-link-block');

  it('paints the question in the DOM, with its exact wording', () => {
    renderAsLiveEmergentModal();

    expect(block()).not.toBeNull();
    expect(block().textContent).toContain(INNOVATION_LINK_QUESTION);
  });

  it('offers Yes and No, and starts answered as No', () => {
    renderAsLiveEmergentModal();

    expect(block().textContent).toContain('Yes');
    expect(block().textContent).toContain('No');
    // The story calls the field mandatory; "No" pre-selected is what makes it answered on arrival.
    expect(component.hasInnovationLink).toBe(false);
    expect(block().querySelector('app-pr-select')).toBeNull();
  });

  /**
   * `detectChanges(false)` skips Angular's dev-mode check-no-changes pass. It is needed — and only
   * here — because answering the question after the first render legitimately flips the Save
   * button's `[disabled]` binding (`innovationLinkIncomplete`) inside the same tick, which the
   * check reports as NG0100. Nothing about the assertion is weakened: the DOM is still rendered
   * and still queried.
   */
  const answer = (yes: boolean) => {
    component.hasInnovationLink = yes;
    component.onInnovationLinkChange();
    // Zoneless change detection: writing a plain field marks nothing dirty, so the view would not
    // be re-rendered and the assertion below would read a stale DOM. In the app the radio's
    // `[(ngModel)]` is what triggers this; here it has to be explicit.
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
  };

  it('reveals the innovation picker only after answering Yes', () => {
    renderAsLiveEmergentModal();
    expect(block().querySelector('app-pr-select')).toBeNull();

    answer(true);

    expect(block().querySelector('app-pr-select')).not.toBeNull();
  });

  it('hides the picker again — and drops the choice — when the answer goes back to No', () => {
    renderAsLiveEmergentModal();
    answer(true);
    component.linkedResultId = 501;
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    expect(block().querySelector('app-pr-select')).not.toBeNull();

    answer(false);

    expect(block().querySelector('app-pr-select')).toBeNull();
    expect(component.linkedResultId).toBeNull();
  });

  it('paints nothing at all on a category that is not Innovation use', () => {
    renderAsLiveEmergentModal(INNOVATION_DEVELOPMENT);

    expect(block()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(INNOVATION_LINK_QUESTION);
  });

  it('paints nothing on a phase before 2026, whatever the category', () => {
    (TestBed.inject(ApiService) as any).dataControlSE.reportingCurrentPhase = { portfolioAcronym: 'P25', phaseYear: 2025 };
    renderAsLiveEmergentModal();

    expect(block()).toBeNull();
  });

  it('paints nothing when the host does not opt in — the exact defect QA reported', () => {
    // Same result, same phase; only the host's `[showInnovationLinkQuestion]` is missing.
    pinnedChoices = { result_level_id: 3, result_type_id: INNOVATION_USE };
    component.showInnovationLinkQuestion = false;
    fixture.detectChanges();

    expect(block()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(INNOVATION_LINK_QUESTION);
  });
});
