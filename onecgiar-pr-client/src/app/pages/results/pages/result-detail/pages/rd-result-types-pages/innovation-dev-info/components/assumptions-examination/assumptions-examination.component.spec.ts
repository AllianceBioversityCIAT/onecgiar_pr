import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AssumptionsExaminationComponent } from './assumptions-examination.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

describe('AssumptionsExaminationComponent', () => {
  let component: AssumptionsExaminationComponent;
  let fixture: ComponentFixture<AssumptionsExaminationComponent>;

  beforeEach(async () => {
    const mockUtils = { mapBoolean: jest.fn() } as any;

    await TestBed.configureTestingModule({
      declarations: [AssumptionsExaminationComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AssumptionsExaminationComponent);
    component = fixture.componentInstance;
    (component as any).options = {
      responsible_innovation_and_scaling: {
        q3: {
          question_text: 'q3',
          question_description: 'desc',
          options: [{ result_question_id: '1', question_text: 'Yes' }]
        }
      }
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('q3 getter', () => {
    it('should return q3 from options when options are set', () => {
      expect(component.q3).toBeDefined();
      expect(component.q3.question_text).toBe('q3');
    });

    it('should return undefined when options is null', () => {
      (component as any).options = null;
      expect(component.q3).toBeUndefined();
    });

    it('should return undefined when responsible_innovation_and_scaling is undefined', () => {
      (component as any).options = {};
      expect(component.q3).toBeUndefined();
    });
  });

  describe('selectedOption getter', () => {
    it('should return undefined when radioButtonValue is not set', () => {
      expect(component.selectedOption).toBeUndefined();
    });

    it('should return the matching option when radioButtonValue matches', () => {
      component.q3['radioButtonValue'] = '1';
      const result = component.selectedOption;
      expect(result).toBeDefined();
      expect(result.result_question_id).toBe('1');
    });

    it('should return undefined when radioButtonValue does not match any option', () => {
      component.q3['radioButtonValue'] = '999';
      const result = component.selectedOption;
      expect(result).toBeUndefined();
    });

    it('should return undefined when q3 is null', () => {
      (component as any).options = { responsible_innovation_and_scaling: { q3: null } };
      expect(component.selectedOption).toBeUndefined();
    });
  });

  describe('showWhyInput computed', () => {
    it('should return true when isYesActions is true', () => {
      component.isYesActions.set(true);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return true when isNoActions is true', () => {
      component.isNoActions.set(true);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return true when isNotNecessary is true', () => {
      component.isNotNecessary.set(true);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return false when all signals are false', () => {
      expect(component.showWhyInput()).toBe(false);
    });
  });

  describe('isComplete getter', () => {
    it('should return false when radioButtonValue is not set', () => {
      expect(component.isComplete).toBe(false);
    });

    it('should return true when radioButtonValue is set and showWhyInput is false', () => {
      component.q3['radioButtonValue'] = '1';
      expect(component.isComplete).toBe(true);
    });

    it('should return true when showWhyInput is true and selectedOption has answer_text', () => {
      component.q3['radioButtonValue'] = '1';
      component.q3.options[0].answer_text = 'some text';
      component.isYesActions.set(true);
      expect(component.isComplete).toBe(true);
    });

    it('should return false when showWhyInput is true and selectedOption has no answer_text', () => {
      component.q3['radioButtonValue'] = '1';
      component.q3.options[0].answer_text = '';
      component.isYesActions.set(true);
      expect(component.isComplete).toBe(false);
    });
  });

  describe('handleSelectionChange()', () => {
    it('should set isYesActions to true when selected option text is "Yes, the following actions have been taken:"', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'Yes, the following actions have been taken:', answer_text: null } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.isYesActions()).toBe(true);
      expect(component.isNoActions()).toBe(false);
      expect(component.isNotNecessary()).toBe(false);
      expect(component.isTooEarly()).toBe(false);
    });

    it('should set isNoActions to true when selected option text is "No actions taken yet"', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'No actions taken yet', answer_text: null } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.isNoActions()).toBe(true);
    });

    it('should set isNotNecessary to true when selected option text is "Not considered necessary for this innovation"', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'Not considered necessary for this innovation', answer_text: null } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.isNotNecessary()).toBe(true);
    });

    it('should set isTooEarly to true when selected option text is "It is too early to determine this"', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'It is too early to determine this', answer_text: 'some text' } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.isTooEarly()).toBe(true);
      // isTooEarly does NOT trigger showWhyInput, so requiresWhy is false
      // selected && !requiresWhy => clear answer_text
      expect(component.q3.options[0].answer_text).toBeNull();
    });

    it('should clear answer_text on non-selected options', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'It is too early to determine this', answer_text: null } as any,
        { result_question_id: '20', question_text: 'Other', answer_text: 'should be cleared' } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.q3.options[1].answer_text).toBeNull();
    });

    it('should NOT clear answer_text on selected option when showWhyInput is true', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'Yes, the following actions have been taken:', answer_text: 'keep this' } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.q3.options[0].answer_text).toBe('keep this');
    });

    it('should handle when no option is selected (selected is undefined)', () => {
      component.q3.options = [
        { result_question_id: '10', question_text: 'Option A', answer_text: 'text' } as any
      ];
      component.q3['radioButtonValue'] = '999'; // no match
      component.handleSelectionChange();
      // !selected => all options get answer_text = null
      expect(component.q3.options[0].answer_text).toBeNull();
    });

    it('should use empty string as label when selected has no question_text', () => {
      component.q3.options = [
        { result_question_id: '10', answer_text: 'text' } as any
      ];
      component.q3['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.isYesActions()).toBe(false);
      expect(component.isNoActions()).toBe(false);
      expect(component.isNotNecessary()).toBe(false);
      expect(component.isTooEarly()).toBe(false);
    });
  });
});


