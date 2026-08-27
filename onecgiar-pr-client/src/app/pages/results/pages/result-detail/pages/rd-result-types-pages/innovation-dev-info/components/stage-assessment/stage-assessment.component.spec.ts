import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { StageAssessmentComponent } from './stage-assessment.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

/**
 * P2-3290 / P2-3467 — the two single-choice stage questions of the 2026 Innovation
 * Development form. `q1` is the GESI stage, `q2` the negative impact / risk stage.
 *
 * The acceptance criteria pinned here are the ones a template edit can silently break:
 * five options, the reason revealed only by "Not applicable", the 50-word cap on it,
 * and the completion rule that feeds the green check.
 */
describe('StageAssessmentComponent', () => {
  let component: StageAssessmentComponent;
  let fixture: ComponentFixture<StageAssessmentComponent>;
  let mockUtils: { mapBoolean: jest.Mock };

  const GESI_OPTIONS = [
    'Last-resort: GESI not considered; critical gaps remain',
    'Foundational: GESI awareness exists but no systematic integration',
    'Emerging: specific GESI strategies being tested',
    'Integrated: GESI deeply embedded in innovation design and monitoring',
    'Not applicable'
  ];

  const RISK_OPTIONS = [
    'Last-resort: no risk assessment conducted; known risks unaddressed',
    'Foundational: basic risk identification done',
    'Emerging: active mitigation strategies being tested',
    'Integrated: robust risk monitoring and adaptive management in place',
    'Not applicable'
  ];

  /** Mirrors the payload `responsibleInnovationAndScalingV2` serves from the 2026 phase on. */
  const buildQuestion = (questionText: string, optionTexts: string[], firstId: number) => ({
    question_text: questionText,
    question_description: null,
    options: optionTexts.map((question_text, i) => ({
      result_question_id: firstId + i,
      question_text,
      answer_boolean: null,
      answer_text: null
    }))
  });

  const buildOptions = () => ({
    responsible_innovation_and_scaling: {
      q1: buildQuestion('What is the current stage of GESI consideration for this innovation?', GESI_OPTIONS, 201),
      q2: buildQuestion('What is the current stage of negative impact/risk assessment for this innovation?', RISK_OPTIONS, 301),
      q3: buildQuestion('How have the end users/stakeholders been involved…', ['Yes', 'No'], 136)
    }
  });

  /**
   * Re-renders after a direct mutation. In the running app the radio's own event listener marks the
   * view dirty; a spec that pokes the model has to say so itself or `tick()` skips the view and
   * `checkNoChanges` then trips on the stale binding.
   */
  const render = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  /** Sets the slot the radio would have set and replays the component's own handler. */
  const select = (optionText: string) => {
    const option = component.question.options.find((o: any) => o.question_text === optionText);
    component.question['radioButtonValue'] = option.result_question_id;
    component.handleSelectionChange();
    render();
    return option;
  };

  beforeEach(async () => {
    mockUtils = { mapBoolean: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [StageAssessmentComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StageAssessmentComponent);
    component = fixture.componentInstance;
    component.options = buildOptions() as any;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('question selection by slot', () => {
    it('renders the GESI stage question with its five options on q1 (the default slot)', () => {
      expect(component.questionKey).toBe('q1');
      expect(component.question.question_text).toBe('What is the current stage of GESI consideration for this innovation?');
      expect(component.question.options).toHaveLength(5);
      expect(component.question.options.map((o: any) => o.question_text)).toEqual(GESI_OPTIONS);
    });

    it('renders the risk stage question with its five options when questionKey is q2', () => {
      component.questionKey = 'q2';
      render();

      expect(component.question.question_text).toBe('What is the current stage of negative impact/risk assessment for this innovation?');
      expect(component.question.options).toHaveLength(5);
      expect(component.question.options.map((o: any) => o.question_text)).toEqual(RISK_OPTIONS);
    });

    it('renders the header and the single-choice control', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-pr-field-header')).toBeTruthy();
      expect(el.querySelector('app-pr-radio-button')).toBeTruthy();
    });
  });

  describe('"Not applicable" reveals the reason field', () => {
    it('hides the reason while nothing is selected', () => {
      expect(component.isNotApplicableSelected).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-input')).toBeNull();
    });

    it('hides the reason for any option other than "Not applicable"', () => {
      select('Emerging: specific GESI strategies being tested');

      expect(component.isNotApplicableSelected).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-input')).toBeNull();
    });

    it('shows the reason when "Not applicable" is selected', () => {
      select('Not applicable');

      expect(component.isNotApplicableSelected).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-input')).toBeTruthy();
    });

    it('caps the reason at the 50 words the story asks for', () => {
      expect(component.maxReasonWords).toBe(50);
    });

    it('works the same on q2', () => {
      component.questionKey = 'q2';
      render();
      select('Not applicable');

      expect(component.isNotApplicableSelected).toBe(true);
      expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-input')).toBeTruthy();
    });
  });

  describe('isComplete — what the section feedback reads', () => {
    it('is incomplete while nothing is selected', () => {
      expect(component.isComplete).toBe(false);
    });

    it('is complete once any ordinary option is selected', () => {
      select('Foundational: GESI awareness exists but no systematic integration');
      expect(component.isComplete).toBe(true);
    });

    it('stays incomplete on "Not applicable" until a reason is typed', () => {
      const notApplicable = select('Not applicable');
      expect(component.isComplete).toBe(false);

      notApplicable.answer_text = 'The innovation is a lab protocol with no end users.';
      expect(component.isComplete).toBe(true);
    });
  });

  describe('handleSelectionChange', () => {
    it('delegates the boolean mapping to the shared utils service', () => {
      select('Emerging: specific GESI strategies being tested');
      expect(mockUtils.mapBoolean).toHaveBeenCalledWith(component.question);
    });

    it('drops a reason left behind when the user moves off "Not applicable"', () => {
      const notApplicable = select('Not applicable');
      notApplicable.answer_text = 'no longer true';

      select('Integrated: GESI deeply embedded in innovation design and monitoring');

      expect(notApplicable.answer_text).toBeNull();
      expect(component.question.options.every((o: any) => !o.answer_text)).toBe(true);
    });

    it('never leaves a reason on the option that is now selected', () => {
      const emerging = select('Emerging: specific GESI strategies being tested');
      emerging.answer_text = 'stale';

      component.handleSelectionChange();

      expect(emerging.answer_text).toBeNull();
    });
  });

  /**
   * The server matches these two questions BY TEXT, never by id, and documents that a question it
   * cannot match resolves to `undefined` so the section "renders without it rather than serving the
   * wrong question" (`result-questions.service.ts`, `resolveScalingSlotsForPhase`). An environment
   * where the migration has not run yet — or where the PO reworded a question on one side only — hits
   * exactly that path, so the component has to honour it instead of taking the whole section down.
   */
  describe('missing slot (the server could not match the question)', () => {
    const renderWithoutSlot = () => {
      component.options = { responsible_innovation_and_scaling: { q3: {} } } as any;
      render();
    };

    it('renders nothing instead of throwing', () => {
      expect(() => renderWithoutSlot()).not.toThrow();
      expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-radio-button')).toBeNull();
    });

    it('reports the question as incomplete rather than crashing the feedback directive', () => {
      renderWithoutSlot();
      expect(component.isComplete).toBe(false);
      expect(component.isNotApplicableSelected).toBe(false);
    });

    it('survives a selection change with no question to map', () => {
      renderWithoutSlot();
      expect(() => component.handleSelectionChange()).not.toThrow();
    });
  });
});
