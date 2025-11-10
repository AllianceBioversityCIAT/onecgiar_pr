import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaleImpactAnalysisComponent } from './scale-impact-analysis.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

describe('ScaleImpactAnalysisComponent', () => {
  let component: ScaleImpactAnalysisComponent;
  let fixture: ComponentFixture<ScaleImpactAnalysisComponent>;
  let mockInnovationDevInfoUtilsService: any;

  beforeEach(async () => {
    mockInnovationDevInfoUtilsService = {
      mapBoolean: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        ScaleImpactAnalysisComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        { provide: InnovationDevInfoUtilsService, useValue: mockInnovationDevInfoUtilsService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScaleImpactAnalysisComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('q2 getter', () => {
    it('should return responsible_innovation_and_scaling.q2 when options exist', () => {
      const mockQ2 = { radioButtonValue: 1, options: [] };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      expect(component.q2).toBe(mockQ2);
    });

    it('should return undefined when options is undefined', () => {
      component.options = undefined;
      expect(component.q2).toBeUndefined();
    });

    it('should return undefined when responsible_innovation_and_scaling is undefined', () => {
      component.options = {} as any;
      expect(component.q2).toBeUndefined();
    });
  });

  describe('selectedOption getter', () => {
    it('should return the option matching radioButtonValue', () => {
      const option1 = { result_question_id: 1, question_text: 'Option 1' };
      const option2 = { result_question_id: 2, question_text: 'Option 2' };
      const mockQ2 = {
        radioButtonValue: 2,
        options: [option1, option2]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      expect(component.selectedOption).toBe(option2);
    });

    it('should return undefined when no option matches', () => {
      const option1 = { result_question_id: 1, question_text: 'Option 1' };
      const mockQ2 = {
        radioButtonValue: 999,
        options: [option1]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      expect(component.selectedOption).toBeUndefined();
    });

    it('should return undefined when q2 is undefined', () => {
      component.options = undefined;
      expect(component.selectedOption).toBeUndefined();
    });

    it('should return undefined when radioButtonValue is undefined', () => {
      const mockQ2 = {
        radioButtonValue: undefined,
        options: [{ result_question_id: 1 }]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      expect(component.selectedOption).toBeUndefined();
    });
  });

  describe('showWhyInput computed', () => {
    it('should return true when isNoActionsSelected is true', () => {
      component.isNoActionsSelected.set(true);
      component.isNoNegativeExpected.set(false);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return true when isNoNegativeExpected is true', () => {
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(true);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return true when both are true', () => {
      component.isNoActionsSelected.set(true);
      component.isNoNegativeExpected.set(true);
      expect(component.showWhyInput()).toBe(true);
    });

    it('should return false when both are false', () => {
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(false);
      expect(component.showWhyInput()).toBe(false);
    });
  });

  describe('isComplete getter', () => {
    it('should return false when radioButtonValue is not set', () => {
      component.options = {
        responsible_innovation_and_scaling: {
          q2: { radioButtonValue: null, options: [] }
        }
      } as any;
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(false);

      expect(component.isComplete).toBe(false);
    });

    it('should return false when q2 is undefined', () => {
      component.options = undefined;
      expect(component.isComplete).toBe(false);
    });

    it('should return false when showWhyInput is true and answer_text is empty', () => {
      component.isNoActionsSelected.set(true);
      const option = { result_question_id: 1, answer_text: null };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: {
            radioButtonValue: 1,
            options: [option]
          }
        }
      } as any;

      expect(component.isComplete).toBe(false);
    });

    it('should return true when showWhyInput is true and answer_text is set', () => {
      component.isNoActionsSelected.set(true);
      const option = { result_question_id: 1, answer_text: 'Some answer' };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: {
            radioButtonValue: 1,
            options: [option]
          }
        }
      } as any;

      expect(component.isComplete).toBe(true);
    });

    it('should return true when showWhyInput is false', () => {
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(false);
      component.options = {
        responsible_innovation_and_scaling: {
          q2: {
            radioButtonValue: 1,
            options: [{ result_question_id: 1 }]
          }
        }
      } as any;

      expect(component.isComplete).toBe(true);
    });
  });

  describe('handleSelectionChange', () => {
    it('should call mapBoolean and update signals correctly', () => {
      const option1 = {
        result_question_id: 1,
        question_text: 'No actions taken yet',
        answer_text: null
      };
      const option2 = {
        result_question_id: 2,
        question_text: 'Other option',
        answer_text: null
      };
      const mockQ2 = {
        radioButtonValue: 1,
        options: [option1, option2]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(mockInnovationDevInfoUtilsService.mapBoolean).toHaveBeenCalledWith(mockQ2);
      expect(component.isNoActionsSelected()).toBe(true);
      expect(component.isNoNegativeExpected()).toBe(false);
    });

    it('should set isNoNegativeExpected when label matches', () => {
      const option = {
        result_question_id: 1,
        question_text: 'No negative consequences or impacts expected',
        answer_text: null
      };
      const mockQ2 = {
        radioButtonValue: 1,
        options: [option]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(component.isNoNegativeExpected()).toBe(true);
      expect(component.isNoActionsSelected()).toBe(false);
    });

    it('should clear answer_text when requiresWhy is false', () => {
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(false);
      const option = {
        result_question_id: 1,
        question_text: 'Regular option',
        answer_text: 'Some text'
      };
      const mockQ2 = {
        radioButtonValue: 1,
        options: [option]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(option.answer_text).toBeNull();
    });

    it('should clear answer_text for non-selected options', () => {
      component.isNoActionsSelected.set(false);
      component.isNoNegativeExpected.set(false);
      const option1 = {
        result_question_id: 1,
        question_text: 'Option 1',
        answer_text: 'Text 1'
      };
      const option2 = {
        result_question_id: 2,
        question_text: 'Option 2',
        answer_text: 'Text 2'
      };
      const mockQ2 = {
        radioButtonValue: 1,
        options: [option1, option2]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(option1.answer_text).toBeNull();
      expect(option2.answer_text).toBeNull();
    });

    it('should not clear answer_text for selected option when requiresWhy is true', () => {
      component.isNoActionsSelected.set(true);
      const option = {
        result_question_id: 1,
        question_text: 'No actions taken yet',
        answer_text: 'Some answer'
      };
      const mockQ2 = {
        radioButtonValue: 1,
        options: [option]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(option.answer_text).toBe('Some answer');
    });

    it('should handle when selected is undefined', () => {
      const mockQ2 = {
        radioButtonValue: 999,
        options: [
          { result_question_id: 1, answer_text: 'Text' }
        ]
      };
      component.options = {
        responsible_innovation_and_scaling: {
          q2: mockQ2
        }
      } as any;

      component.handleSelectionChange();

      expect(mockQ2.options[0].answer_text).toBeNull();
    });

    it('should handle when q2 is undefined', () => {
      component.options = undefined;
      
      expect(() => component.handleSelectionChange()).not.toThrow();
    });
  });
});
