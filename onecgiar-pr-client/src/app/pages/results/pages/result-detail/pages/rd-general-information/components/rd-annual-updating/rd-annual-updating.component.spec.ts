import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { of } from 'rxjs';

const INNOVATION_DEVELOPMENT = 7;
const INNOVATION_USE = 2;

const STATUS_TRIGGER_LABEL = 'Is this innovation active and receiving investment?';
const LEGACY_LABEL = 'Please indicate if the investment for this innovation was continued or discontinued';

describe('RdAnnualUpdatingComponent', () => {
  let component: RdAnnualUpdatingComponent;
  let fixture: ComponentFixture<RdAnnualUpdatingComponent>;
  let dataControlSE: DataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAnnualUpdatingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    dataControlSE = TestBed.inject(DataControlService);

    fixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Builds a fresh component AFTER seeding the phase/result context, because the P2-3292 wording is
   * resolved once at construction (same as `options` always was). `detectChanges()` is deliberately
   * not called: it would fire `ngOnInit` -> `GET_globalNarratives`, which these tests do not exercise.
   */
  const buildFor = (currentResult: any, openPhaseYear: any = null): RdAnnualUpdatingComponent => {
    dataControlSE.currentResult = currentResult;
    dataControlSE.reportingCurrentPhase = { ...dataControlSE.reportingCurrentPhase, phaseYear: openPhaseYear };
    return TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
  };

  /**
   * Same seeding as `buildFor`, but renders the template so the assertions read the text a reporter
   * actually sees — colon included. `app-pr-field-header` appends ':' unless `useColon` is false,
   * so only a DOM read can catch the "...investment?:" defect; asserting on `headerLabel` cannot.
   * `GET_globalNarratives` is stubbed because `detectChanges()` fires `ngOnInit`.
   */
  const renderFor = (currentResult: any): string => {
    // The shared `beforeEach` fixture rendered with no `currentResult`, so its outer *ngIf is false.
    // It stays attached to ApplicationRef, and seeding the result below would flip it to true inside
    // this fixture's own tick -> NG0100. It is unused here, so detach it first.
    fixture.destroy();
    dataControlSE.currentResult = currentResult;
    const renderedFixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    jest.spyOn(renderedFixture.componentInstance.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of({ response: { value: '' } }));
    renderedFixture.detectChanges();
    return renderedFixture.nativeElement.querySelector('.header .pr_label').textContent.trim();
  };

  describe('isDiscontinuedOptionsTrue()', () => {
    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is false', () => {
      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });

    it('should return true for isDiscontinuedOptionsTrue when is_discontinued is true and some discontinued option is true', () => {
      component.generalInfoBody.is_discontinued = true;
      component.generalInfoBody.discontinued_options = [
        {
          value: true
        },
        {
          value: false
        }
      ];

      const result = component.isDiscontinuedOptionsTrue();

      expect(result).toBeTruthy();
    });
  });

  describe('getAlertNarrative()', () => {
    it('should set alertText with the response value from the API', () => {
      const mockResponse = { response: { value: 'Test alert narrative' } };
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of(mockResponse));

      component.getAlertNarrative();

      expect(component.alertText).toBe('Test alert narrative');
    });

    it('should handle empty response from the API', () => {
      const mockResponse = { response: { value: '' } };
      jest.spyOn(component.api.resultsSE, 'GET_globalNarratives').mockReturnValue(of(mockResponse));

      component.getAlertNarrative();

      expect(component.alertText).toBe('');
    });
  });

  /**
   * P2-3292 Step 1 (Status Trigger), epic P2-3243.
   *
   * The gate is the reporting PHASE YEAR, never the portfolio: prtest holds phase-2025 results
   * inside portfolio P25, and `isP25()` would reword the block for those too — breaking the epic's
   * governing rule that earlier phases must render exactly as they do today.
   */
  describe('P2-3292 Step 1 — status trigger wording', () => {
    it('asks the new question for Innovation Development from the 2026 phase on', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(true);
      expect(c.headerLabel).toBe(STATUS_TRIGGER_LABEL);
    });

    it('answers the new question with a plain Yes / No mapped onto the stored is_discontinued flag', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

      expect(c.options).toEqual([
        { name: 'Yes', value: false },
        { name: 'No', value: true }
      ]);
    });

    it('keeps the legacy wording verbatim for an Innovation Development result in the 2025 phase', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2025, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
      expect(c.options).toEqual([
        { name: 'Innovation development is active/investment was continued', value: false },
        { name: 'Innovation development is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('never applies to Innovation Use, not even in the 2026 phase', () => {
      const c = buildFor({ result_type_id: INNOVATION_USE, phase_year: 2026, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
      expect(c.options).toEqual([
        { name: 'Innovation use is active/investment was continued', value: false },
        { name: 'Innovation use is inactive/investment was discontinued, because:', value: true }
      ]);
    });

    it('falls back to the open reporting phase year when the result payload carries none', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, portfolio: 'P25' }, 2026);

      expect(c.usesStatusTriggerWording).toBe(true);
      expect(c.headerLabel).toBe(STATUS_TRIGGER_LABEL);
    });

    it('keeps the legacy wording when the year arrives as a string, so a bad payload cannot flip the form', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: '2026', portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    it('keeps the legacy wording when neither the result nor the open phase carries a year', () => {
      const c = buildFor({ result_type_id: INNOVATION_DEVELOPMENT, portfolio: 'P25' });

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    it('keeps the legacy wording when there is no open result at all', () => {
      const c = buildFor(undefined);

      expect(c.usesStatusTriggerWording).toBe(false);
      expect(c.headerLabel).toBe(LEGACY_LABEL);
    });

    /**
     * Rendered-DOM guard. The class fields above cannot see the trailing ':' that
     * `app-pr-field-header` adds by default, which is exactly how the question shipped reading
     * "Is this innovation active and receiving investment?:".
     */
    describe('as rendered in the DOM', () => {
      it('shows the 2026 question with no trailing colon', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026, portfolio: 'P25' });

        expect(renderedLabel).toBe(STATUS_TRIGGER_LABEL);
        expect(renderedLabel).not.toContain('?:');
        expect(renderedLabel.endsWith(':')).toBe(false);
      });

      it('shows the 2025 legacy label with its colon, exactly as it renders today', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2025, portfolio: 'P25' });

        expect(renderedLabel).toBe(`${LEGACY_LABEL}:`);
      });

      it('shows the legacy label with its colon for Innovation Use in the 2026 phase', () => {
        const renderedLabel = renderFor({ result_type_id: INNOVATION_USE, phase_year: 2026, portfolio: 'P25' });

        expect(renderedLabel).toBe(`${LEGACY_LABEL}:`);
      });
    });
  });
});
