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
      declarations: [StepN4Component, LabelNamePipe],
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

  // P2-3426: Step 4 hides "Have any studies been conducted to inform the innovation scaling
  // strategy design (...)" (and its study-links list) once the Core innovation's "Innovation use
  // level evidence-based" (Step 3) reaches 6+, from the 2026 phase onwards only.
  describe('resolveUseLevel', () => {
    it('resolves the catalogue id to its numeric level, never to the array position', () => {
      // Deliberately out of id order, and id != level, to prove it is not reading position/index.
      component.innovationControlListSE.useLevelsList = [
        { id: 3, level: 2 },
        { id: 1, level: 0 },
        { id: 2, level: 1 }
      ];

      expect(component.resolveUseLevel(1)).toBe(0);
      expect(component.resolveUseLevel(3)).toBe(2);
    });

    it('returns null when catalogId is null or undefined', () => {
      component.innovationControlListSE.useLevelsList = [{ id: 1, level: 0 }];

      expect(component.resolveUseLevel(null)).toBeNull();
      expect(component.resolveUseLevel(undefined)).toBeNull();
    });

    it('returns null when the catalogue list is empty', () => {
      component.innovationControlListSE.useLevelsList = [];

      expect(component.resolveUseLevel(1)).toBeNull();
    });

    it('returns null when the id is not found in the catalogue', () => {
      component.innovationControlListSE.useLevelsList = [{ id: 1, level: 0 }];

      expect(component.resolveUseLevel(99)).toBeNull();
    });

    it('returns null when the matched level is not a finite number', () => {
      component.innovationControlListSE.useLevelsList = [{ id: 1, level: 'abc' }];

      expect(component.resolveUseLevel(1)).toBeNull();
    });
  });

  describe('getCoreInnovationUseLevel', () => {
    it('fetches the step-three body and resolves the Core innovation use level from it', () => {
      component.innovationControlListSE.useLevelsList = [
        { id: 7, level: 6 },
        { id: 1, level: 0 }
      ];
      jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayByRiId').mockReturnValue(
        of({ response: { result_ip_result_core: { use_level_evidence_based: 7 } } }) as any
      );

      component.getCoreInnovationUseLevel();

      expect(component.coreInnovationUseLevel).toBe(6);
    });

    it('leaves coreInnovationUseLevel null when no level has been selected in Step 3 yet', () => {
      jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayByRiId').mockReturnValue(
        of({ response: { result_ip_result_core: { use_level_evidence_based: null } } }) as any
      );

      component.getCoreInnovationUseLevel();

      expect(component.coreInnovationUseLevel).toBeNull();
    });
  });

  describe('isScalingStudiesQuestionHiddenByLevel', () => {
    it('keeps the question visible at level 5 in a 2026 phase', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.coreInnovationUseLevel = 5;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(false);
    });

    it.each([6, 7, 8, 9])('hides the question at level %i in a 2026 phase', level => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.coreInnovationUseLevel = level;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(true);
    });

    it('always keeps the question visible in a 2025 phase, even at level 9', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2025 } as any);
      component.coreInnovationUseLevel = 9;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(false);
    });

    it('keeps the question visible (fails open) when no level has been chosen yet, even in a 2026 phase', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.coreInnovationUseLevel = null;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(false);
    });

    it('keeps the question visible (fails open) when phase_year is not available', () => {
      component.api.dataControlSE.currentResultSignal.set({} as any);
      component.api.dataControlSE.reportingCurrentPhase = { ...component.api.dataControlSE.reportingCurrentPhase, phaseYear: null };
      component.coreInnovationUseLevel = 9;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(false);
    });

    it('falls back to reportingCurrentPhase.phaseYear when currentResultSignal has no phase_year', () => {
      component.api.dataControlSE.currentResultSignal.set({} as any);
      component.api.dataControlSE.reportingCurrentPhase = { ...component.api.dataControlSE.reportingCurrentPhase, phaseYear: 2026 };
      component.coreInnovationUseLevel = 7;

      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(true);
    });

    // AC4: the rule reacts to the value stored in Step 3 without an app reload — re-running
    // ngOnInit (what happens when Angular re-creates this component navigating step-3 -> step-4)
    // re-fetches the level, so a later Step 3 save flips the computed visibility.
    it('reacts to a level change on the next ngOnInit (Step 3 -> Step 4 navigation), without a reload', () => {
      component.api.dataControlSE.currentResultSignal.set({ phase_year: 2026 } as any);
      component.innovationControlListSE.useLevelsList = [
        { id: 5, level: 4 },
        { id: 8, level: 7 }
      ];
      const stepThreeSpy = jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayByRiId');

      stepThreeSpy.mockReturnValueOnce(of({ response: { result_ip_result_core: { use_level_evidence_based: 5 } } }) as any);
      component.getCoreInnovationUseLevel();
      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(false);

      stepThreeSpy.mockReturnValueOnce(of({ response: { result_ip_result_core: { use_level_evidence_based: 8 } } }) as any);
      component.getCoreInnovationUseLevel();
      expect(component.isScalingStudiesQuestionHiddenByLevel()).toBe(true);
    });
  });

  describe('ngOnInit', () => {
    it('fetches the Core innovation use level alongside the step-four section', () => {
      jest.spyOn(component, 'getSectionInformation').mockImplementation();
      const getLevelSpy = jest.spyOn(component, 'getCoreInnovationUseLevel').mockImplementation();
      jest.spyOn(component.api.dataControlSE, 'findClassTenSeconds').mockResolvedValue(undefined as any);

      component.ngOnInit();

      expect(getLevelSpy).toHaveBeenCalled();
    });
  });
});
