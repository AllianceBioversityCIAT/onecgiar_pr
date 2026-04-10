import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { GesiInnovationAssessmentComponent } from './gesi-innovation-assessment.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

describe('GesiInnovationAssessmentComponent', () => {
  let component: GesiInnovationAssessmentComponent;
  let fixture: ComponentFixture<GesiInnovationAssessmentComponent>;

  beforeEach(async () => {
    const mockUtils = { mapBoolean: jest.fn() } as any;

    await TestBed.configureTestingModule({
      declarations: [GesiInnovationAssessmentComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(GesiInnovationAssessmentComponent);
    component = fixture.componentInstance;
    (component as any).options = {
      responsible_innovation_and_scaling: {
        q1: {
          question_text: 'q1',
          question_description: 'desc',
          options: [{ result_question_id: '1', question_text: 'Yes', answer_text: null }]
        }
      }
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('q1 getter', () => {
    it('should return q1 from options when options are set', () => {
      expect(component.q1).toBeDefined();
      expect(component.q1.question_text).toBe('q1');
    });

    it('should return undefined when options is null', () => {
      (component as any).options = null;
      expect(component.q1).toBeUndefined();
    });

    it('should return undefined when responsible_innovation_and_scaling is undefined', () => {
      (component as any).options = {};
      expect(component.q1).toBeUndefined();
    });
  });

  describe('selectedOption getter', () => {
    it('should return undefined when radioButtonValue is not set', () => {
      expect(component.selectedOption).toBeUndefined();
    });

    it('should return the matching option when radioButtonValue matches', () => {
      component.q1['radioButtonValue'] = '1';
      const result = component.selectedOption;
      expect(result).toBeDefined();
      expect(result.result_question_id).toBe('1');
    });

    it('should return undefined when radioButtonValue does not match any option', () => {
      component.q1['radioButtonValue'] = '999';
      expect(component.selectedOption).toBeUndefined();
    });

    it('should return undefined when q1 is null', () => {
      (component as any).options = { responsible_innovation_and_scaling: { q1: null } };
      expect(component.selectedOption).toBeUndefined();
    });
  });

  describe('isNoActionsSelected getter', () => {
    it('should return true when selected option text is "No actions taken yet"', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'No actions taken yet', answer_text: null } as any
      ];
      component.q1['radioButtonValue'] = '10';
      expect(component.isNoActionsSelected).toBe(true);
    });

    it('should return false when selected option text is different', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: null } as any
      ];
      component.q1['radioButtonValue'] = '10';
      expect(component.isNoActionsSelected).toBe(false);
    });

    it('should return false when no option is selected', () => {
      expect(component.isNoActionsSelected).toBe(false);
    });
  });

  describe('isComplete getter', () => {
    it('should return false when radioButtonValue is not set', () => {
      expect(component.isComplete).toBe(false);
    });

    it('should return true when radioButtonValue is set and isNoActionsSelected is false', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: null } as any
      ];
      component.q1['radioButtonValue'] = '10';
      expect(component.isComplete).toBe(true);
    });

    it('should return true when isNoActionsSelected is true and answer_text is filled', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'No actions taken yet', answer_text: 'some reason' } as any
      ];
      component.q1['radioButtonValue'] = '10';
      expect(component.isComplete).toBe(true);
    });

    it('should return false when isNoActionsSelected is true and answer_text is empty', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'No actions taken yet', answer_text: '' } as any
      ];
      component.q1['radioButtonValue'] = '10';
      expect(component.isComplete).toBe(false);
    });
  });

  describe('handleSelectionChange()', () => {
    it('should clear answer_text when selected option is NOT "No actions taken yet"', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: 'should be cleared' } as any
      ];
      component.q1['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.q1.options[0].answer_text).toBeNull();
    });

    it('should keep answer_text when selected option IS "No actions taken yet"', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'No actions taken yet', answer_text: 'keep this' } as any
      ];
      component.q1['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.q1.options[0].answer_text).toBe('keep this');
    });

    it('should clear answer_text on non-selected options', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: null } as any,
        { result_question_id: '20', question_text: 'Other', answer_text: 'should be cleared' } as any
      ];
      component.q1['radioButtonValue'] = '10';
      component.handleSelectionChange();
      expect(component.q1.options[1].answer_text).toBeNull();
    });

    it('should clear all options answer_text when no option is selected', () => {
      component.q1.options = [
        { result_question_id: '10', question_text: 'Option A', answer_text: 'text' } as any
      ];
      component.q1['radioButtonValue'] = '999'; // no match
      component.handleSelectionChange();
      expect(component.q1.options[0].answer_text).toBeNull();
    });

    it('should call mapBoolean on the q1 object', () => {
      component.q1['radioButtonValue'] = '1';
      component.handleSelectionChange();
      expect(component.innovationDevInfoUtilsSE.mapBoolean).toHaveBeenCalledWith(component.q1);
    });
  });
});
