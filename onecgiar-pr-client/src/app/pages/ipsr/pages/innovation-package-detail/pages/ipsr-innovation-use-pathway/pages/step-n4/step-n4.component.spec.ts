import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { StepN4Component } from './step-n4.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { StepN4InitiativeInvestmentTableComponent } from './components/step-n4-initiative-investment-table/step-n4-initiative-investment-table.component';
import { StepN4BilateralInvestmentTableComponent } from './components/step-n4-bilateral-investment-table/step-n4-bilateral-investment-table.component';
import { StepN4PartnerCoInvestmentTableComponent } from './components/step-n4-partner-co-investment-table/step-n4-partner-co-investment-table.component';
import { PrRadioButtonComponent } from '../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { SaveButtonComponent } from '../../../../../../../../custom-fields/save-button/save-button.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { StepN4AddBilateralComponent } from './components/step-n4-bilateral-investment-table/modal/step-n4-add-bilateral/step-n4-add-bilateral.component';
import { StepN4AddPartnerComponent } from './components/step-n4-partner-co-investment-table/modal/step-n4-add-partner/step-n4-add-partner.component';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { TermPipe } from '../../../../../../../../internationalization/term.pipe';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('StepN4Component', () => {
  let component: StepN4Component;
  let fixture: ComponentFixture<StepN4Component>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, TermPipe],
      // PrRadioButtonComponent is declared for real (not stubbed by NO_ERRORS_SCHEMA) because the
      // scaling-studies question binds [(ngModel)] to it: without its ControlValueAccessor, rendering
      // the template throws NG01203 "No value accessor for form control".
      declarations: [StepN4Component, LabelNamePipe, PrRadioButtonComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4Component);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to step-3 when readOnly is true on onSavePrevious', () => {
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationCode = 'TEST-123';
    component.ipsrDataControlSE.resultInnovationPhase = 'Phase1';

    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = component.onSavePrevious('test description');

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/ipsr/detail/TEST-123/ipsr-innovation-use-pathway/step-3'],
      { queryParams: { phase: 'Phase1' } }
    );
    expect(result).toBeTruthy();
  });

  it('should call PATCH and navigate when readOnly is false on onSavePrevious', done => {
    component.api.rolesSE.readOnly = false;
    component.ipsrDataControlSE.resultInnovationCode = 'TEST-456';
    component.ipsrDataControlSE.resultInnovationPhase = 'Phase2';

    const patchSpy = jest.spyOn(component.api.resultsSE, 'PATCHInnovationPathwayStepFourByRiIdPrevious').mockReturnValue(
      of({ response: {} })
    );
    const getSectionSpy = jest.spyOn(component, 'getSectionInformation');
    const navigateSpy = jest.spyOn(router, 'navigate');

    const result = component.onSavePrevious('test description');

    expect(patchSpy).toHaveBeenCalledWith(component.ipsrStep4Body, 'test description');
    expect(getSectionSpy).toHaveBeenCalled();
    expect(result).toBeNull();

    setTimeout(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        ['/ipsr/detail/TEST-456/ipsr-innovation-use-pathway/step-3'],
        { queryParams: { phase: 'Phase2' } }
      );
      done();
    }, 1100);
  });

  // P2-3426: from the 2026 phase onwards the "Have any studies been conducted to inform the
  // innovation scaling strategy design (...)" question is RETIRED — read-only when the package
  // already carries an answer, not rendered at all otherwise. The Core innovation's use level
  // (Step 3) has no influence whatsoever: implementation note 6 of the ticket says that framing is
  // superseded and must NOT be implemented.
  describe('isScalingStudiesRetired', () => {
    it.each([2026, 2027, 2030])('retires the question in a %i phase', year => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: year } as any);

      expect(component.isScalingStudiesRetired()).toBe(true);
    });

    it.each([2022, 2024, 2025])('leaves the question editable in a %i phase', year => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: year } as any);

      expect(component.isScalingStudiesRetired()).toBe(false);
    });

    // 🛑 The phase year of the PACKAGE BEING VIEWED is the only admissible source. Neither the
    // reporting module's open phase nor IPSR's own open phase may stand in for it: a 2025 package
    // opened while 2026 is the open phase would be retired by mistake, breaking the epic's "2025 and
    // earlier look exactly as today" rule.
    it('ignores the reporting module open phase — it is another module, and the OPEN phase, not this package\'s', () => {
      component.api.dataControlSE.currentResultSignal.set({} as any);
      component.api.dataControlSE.reportingCurrentPhase = { ...component.api.dataControlSE.reportingCurrentPhase, phaseYear: 2026 };

      expect(component.isScalingStudiesRetired()).toBe(false);
    });

    it('ignores the IPSR open phase too (open phase !== the viewed package phase)', () => {
      component.api.dataControlSE.currentResultSignal.set({} as any);
      component.api.dataControlSE.IPSRCurrentPhase = { ...component.api.dataControlSE.IPSRCurrentPhase, phaseYear: 2026 };

      expect(component.isScalingStudiesRetired()).toBe(false);
    });

    it('keeps retiring a 2026 package even when the reporting open phase is still 2025', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.api.dataControlSE.reportingCurrentPhase = { ...component.api.dataControlSE.reportingCurrentPhase, phaseYear: 2025 };

      expect(component.isScalingStudiesRetired()).toBe(true);
    });

    it('fails open (stays editable) when no phase year is available at all', () => {
      component.api.dataControlSE.currentResultSignal.set({} as any);

      expect(component.isScalingStudiesRetired()).toBe(false);
    });
  });

  // A stored `true` is the whole criterion: nothing but a person clicking "Yes" writes it, so Case 1
  // of the ticket ("stored answer -> shown read-only") applies unconditionally. Only `false` is
  // ambiguous (the server coerces NULL to false), and only that half is pending the PO's answer.
  describe('hasStoredScalingStudiesAnswer', () => {
    it('treats a stored "Yes" with at least one real link as an answer', () => {
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: ['https://a.org/study'] } as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(true);
    });

    it('does not treat a stored "No" as an answer (the server coerces NULL to false, so it is indistinguishable)', () => {
      component.ipsrStep4Body = { has_scaling_studies: false, scaling_studies_urls: [] } as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(false);
    });

    // 🛑 REGRESSION LOCK. Demanding a non-blank link on top of the `true` hid an answer the ticket
    // orders shown. Never re-add that condition.
    it('treats "Yes" with no links at all as an answer — true is unambiguous', () => {
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: [] } as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(true);
    });

    // Exactly what lands in the database when someone ticks "Yes" and saves without typing the URL:
    // `syncScalingStudyUrls` creates a row for the empty seed string
    // (`ipsr-pathway-step-four.service.ts:194-196`) and the GET returns it verbatim (`:625`).
    it('treats "Yes" whose only stored link is the blank seed as an answer', () => {
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: ['', '   '] } as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(true);
    });

    it('survives a body with no scaling_studies_urls key at all', () => {
      component.ipsrStep4Body = { has_scaling_studies: true } as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(true);
    });

    it('does not treat an absent flag as an answer', () => {
      component.ipsrStep4Body = {} as any;

      expect(component.hasStoredScalingStudiesAnswer()).toBe(false);
    });
  });

  describe('showScalingStudiesReadOnly', () => {
    it('paints the read-only block for a 2026 package that stored a Yes with links', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: ['https://a.org/study'] } as any;

      expect(component.showScalingStudiesReadOnly()).toBe(true);
    });

    it('paints the read-only block for a 2026 package whose stored Yes has only the blank seed link', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: [''] } as any;

      expect(component.showScalingStudiesReadOnly()).toBe(true);
    });

    it('paints nothing for a 2026 package nobody ever answered', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.ipsrStep4Body = { has_scaling_studies: false, scaling_studies_urls: [] } as any;

      expect(component.showScalingStudiesReadOnly()).toBe(false);
    });

    // The epic's governing rule: 2025 and earlier must look EXACTLY as they do today. The block is
    // rendered by the legacy editable branch there, never by the read-only one.
    it('never takes over the 2025 phase, even with a stored Yes and links', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2025 } as any);
      component.ipsrStep4Body = { has_scaling_studies: true, scaling_studies_urls: ['https://a.org/study'] } as any;

      expect(component.showScalingStudiesReadOnly()).toBe(false);
      expect(component.isScalingStudiesRetired()).toBe(false);
    });
  });

  // Renders the real template, so the three cases are asserted on the DOM and not only on the
  // predicates. `app-studies-link` / `app-pr-radio-button` stay unknown elements (NO_ERRORS_SCHEMA),
  // which is enough: what the acceptance criteria turn on is whether the block is in the DOM at all.
  describe('template', () => {
    // `await whenStable()` matters: `[disabled]` on an `[(ngModel)]` input is consumed by NgModel,
    // which disables the control on a microtask, so the DOM `disabled` flag is not set on the first
    // synchronous change-detection pass.
    const render = async (phaseYear: number, body: any) => {
      jest.spyOn(component.api.fieldsManagerSE, 'isP25').mockReturnValue(true);
      // A user with write access — RolesService.readOnly would grey the group out on its own and
      // hide the difference the read-only branch is supposed to make.
      component.api.rolesSE.readOnly = false;
      jest.spyOn(component, 'getSectionInformation').mockImplementation();
      jest.spyOn(component.api.dataControlSE, 'findClassTenSeconds').mockResolvedValue(undefined as any);
      component.api.dataControlSE.currentResultSignal.set({ phase_year: phaseYear } as any);
      component.ipsrStep4Body = body;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    it('2026 with a stored Yes + links: the question and the links list are both rendered', async () => {
      const el = await render(2026, {
        has_scaling_studies: true,
        scaling_studies_urls: ['https://a.org/study'],
        institutions_expected_investment: []
      });

      expect(el.querySelectorAll('app-pr-radio-button').length).toBe(1);
      expect(el.querySelectorAll('app-studies-link').length).toBe(1);
      // The read-only affordance itself: `block-field` is what pr-radio-button paints for a
      // non-editable group, and every native radio comes out disabled.
      expect(el.querySelector('.radioButtonList.block-field')).toBeTruthy();
      const radios = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      expect(radios.length).toBeGreaterThan(0);
      expect(radios.every(radio => radio.disabled)).toBe(true);
    });

    // 🛑 THE CASE THAT WAS BROKEN. `true` + `['']` is what the database holds for anyone who ticked
    // "Yes" and saved without typing the link, and it must be shown read-only like any other stored
    // answer (AC Case 1) — not hidden.
    it('2026 with a stored Yes whose only link is blank: the question and its answer are still rendered read-only', async () => {
      const el = await render(2026, {
        has_scaling_studies: true,
        scaling_studies_urls: [''],
        institutions_expected_investment: []
      });

      expect(el.querySelectorAll('app-pr-radio-button').length).toBe(1);
      expect(el.querySelectorAll('app-studies-link').length).toBe(1);
      expect(el.querySelector('.radioButtonList.block-field')).toBeTruthy();
      const radios = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      expect(radios.length).toBeGreaterThan(0);
      expect(radios.every(radio => radio.disabled)).toBe(true);
    });

    // AC Case 2: "No placeholder, no empty read-only block, no label." The last question of Step 4
    // then becomes the estimated $ investment one.
    it('2026 with no stored answer: nothing at all is rendered', async () => {
      const el = await render(2026, {
        has_scaling_studies: false,
        scaling_studies_urls: [],
        institutions_expected_investment: []
      });

      expect(el.querySelectorAll('app-pr-radio-button').length).toBe(0);
      expect(el.querySelectorAll('app-studies-link').length).toBe(0);
    });

    it('2025 keeps the editable block exactly as today', async () => {
      const el = await render(2025, {
        has_scaling_studies: true,
        scaling_studies_urls: ['https://a.org/study'],
        institutions_expected_investment: []
      });

      expect(el.querySelectorAll('app-pr-radio-button').length).toBe(1);
      expect(el.querySelectorAll('app-studies-link').length).toBe(1);
      expect(el.querySelector('.radioButtonList.block-field')).toBeNull();
      const radios = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
      expect(radios.length).toBeGreaterThan(0);
      expect(radios.some(radio => radio.disabled)).toBe(false);
    });

    it('2025 with a stored No still renders the editable question (unchanged legacy behaviour)', async () => {
      const el = await render(2025, {
        has_scaling_studies: false,
        scaling_studies_urls: [],
        institutions_expected_investment: []
      });

      expect(el.querySelectorAll('app-pr-radio-button').length).toBe(1);
      expect(el.querySelectorAll('app-studies-link').length).toBe(0);
    });
  });

  // 🛑 REGRESSION LOCK — implementation note 3 of P2-3426, "the highest-risk regression in the
  // ticket". `ipsr-pathway-step-four.service.ts:104-109` deactivates EVERY stored study link of the
  // package when `has_scaling_studies` arrives falsy or absent. The read-only block is not an
  // editable field any more, so the temptation is to strip it from the payload — doing so would
  // silently wipe a user's stored studies. The component must keep round-tripping both fields.
  describe('onSaveSection — stored scaling studies must survive a save', () => {
    it('sends has_scaling_studies and scaling_studies_urls back untouched', () => {
      const stored = {
        has_scaling_studies: true,
        scaling_studies_urls: ['https://a.org/study-1', 'https://b.org/study-2'],
        institutions_expected_investment: []
      };
      component.ipsrStep4Body = { ...stored } as any;
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);

      const patchSpy = jest
        .spyOn(component.api.resultsSE, 'PATCHInnovationPathwayStepFourByRiId')
        .mockReturnValue(of({ response: {} }) as any);
      jest.spyOn(component, 'getSectionInformation').mockImplementation();

      component.onSaveSection();

      const sentBody: any = patchSpy.mock.calls[0][0];
      expect(sentBody.has_scaling_studies).toBe(true);
      expect(sentBody.scaling_studies_urls).toEqual(['https://a.org/study-1', 'https://b.org/study-2']);
    });

    it('keeps them on the "Save & go to previous step" path too', () => {
      component.api.rolesSE.readOnly = false;
      component.ipsrStep4Body = {
        has_scaling_studies: true,
        scaling_studies_urls: ['https://a.org/study-1']
      } as any;

      const patchSpy = jest
        .spyOn(component.api.resultsSE, 'PATCHInnovationPathwayStepFourByRiIdPrevious')
        .mockReturnValue(of({ response: {} }) as any);
      jest.spyOn(component, 'getSectionInformation').mockImplementation();
      jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onSavePrevious('previous');

      const sentBody: any = patchSpy.mock.calls[0][0];
      expect(sentBody.has_scaling_studies).toBe(true);
      expect(sentBody.scaling_studies_urls).toEqual(['https://a.org/study-1']);
    });
  });

  describe('ngOnInit', () => {
    // The use-level plumbing this component used to carry is gone (ticket note 6), and with it the
    // extra GETInnovationPathwayByRiId round-trip that ran on every entry into Step 4.
    it('does not fetch the step-three body any more', () => {
      jest.spyOn(component, 'getSectionInformation').mockImplementation();
      const stepThreeSpy = jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayByRiId');
      jest.spyOn(component.api.dataControlSE, 'findClassTenSeconds').mockResolvedValue(undefined as any);

      component.ngOnInit();

      expect(stepThreeSpy).not.toHaveBeenCalled();
    });
  });
});
