import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IntellectualPropertyRightsComponent } from './intellectual-property-rights.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';


describe('IntellectualPropertyRightsComponent', () => {
  let component: IntellectualPropertyRightsComponent;
  let fixture: ComponentFixture<IntellectualPropertyRightsComponent>;
  let mockUtils: any;

  beforeEach(async () => {
    mockUtils = { mapBoolean: jest.fn() } as any;

    await TestBed.configureTestingModule({
      declarations: [IntellectualPropertyRightsComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(IntellectualPropertyRightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should initialize q1, q2, and q3 to null in ngOnInit', () => {
      component.ngOnInit();

      expect(component.options.intellectual_property_rights.q1['value']).toBeNull();
      expect(component.options.intellectual_property_rights.q2['value']).toBeNull();
      expect(component.options.intellectual_property_rights.q3['value']).toBeNull();
    });
  });

  describe('clearIntellectualPropertyRights()', () => {
    it('should clear q2 and q3 when q1 is "32"', () => {
      component.options.intellectual_property_rights.q1['radioButtonValue'] = '32';
      component.options.intellectual_property_rights.q2['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q3['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q2.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ];
      component.options.intellectual_property_rights.q3.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ];

      component.clearIntellectualPropertyRights();

      expect(component.options.intellectual_property_rights.q2['radioButtonValue']).toBeNull();
      expect(component.options.intellectual_property_rights.q3['radioButtonValue']).toBeNull();
    });

    it('should clear q2 and q3 when q1 is "32" and options has saved property', () => {
      component.options.intellectual_property_rights.q1['radioButtonValue'] = '32';
      component.options.intellectual_property_rights.q2['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q3['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q2.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: [],
        }
      ];
      component.options.intellectual_property_rights.q2.options[0]['saved'] = true;
      component.options.intellectual_property_rights.q3.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ];
      component.options.intellectual_property_rights.q3.options[0]['saved'] = true;

      component.clearIntellectualPropertyRights();

      expect(component.options.intellectual_property_rights.q2['radioButtonValue']).toBeNull();
      expect(component.options.intellectual_property_rights.q3['radioButtonValue']).toBeNull();
    });
    it('should clear q3 when q2 is "35"', () => {
      component.options.intellectual_property_rights.q2['radioButtonValue'] = '35';
      component.options.intellectual_property_rights.q3['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q3.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ];

      component.clearIntellectualPropertyRights();

      expect(component.options.intellectual_property_rights.q3['radioButtonValue']).toBeNull();
    });
    it('should clear q3 when q2 is "35" and options has saved property', () => {
      component.options.intellectual_property_rights.q2['radioButtonValue'] = '35';
      component.options.intellectual_property_rights.q3['radioButtonValue'] = 'someValue';
      component.options.intellectual_property_rights.q3.options = [
        {
          answer_boolean: true,
          result_question_id: '1',
          question_text: '',
          result_type_id: 1,
          parent_question_id: '1',
          question_type_id: '1',
          question_level: '',
          subOptions: []
        }
      ];
      component.options.intellectual_property_rights.q3.options[0]['saved'] = true;

      component.clearIntellectualPropertyRights();

      expect(component.options.intellectual_property_rights.q3['radioButtonValue']).toBeNull();
    });

    it('should not clear anything when q1 is not "32" and q2 is not "35"', () => {
      component.options.intellectual_property_rights.q1['radioButtonValue'] = '99';
      component.options.intellectual_property_rights.q2['radioButtonValue'] = '99';
      component.options.intellectual_property_rights.q3['radioButtonValue'] = 'someValue';

      component.clearIntellectualPropertyRights();

      expect(component.options.intellectual_property_rights.q3['radioButtonValue']).toBe('someValue');
    });
  });

  describe('handleSelectionChangeQ4()', () => {
    it('should call mapBoolean on q4', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: 'text' } as any
      ];
      component.options.intellectual_property_rights.q4['radioButtonValue'] = '10';
      component.handleSelectionChangeQ4();
      expect(mockUtils.mapBoolean).toHaveBeenCalled();
    });

    it('should clear answer_text when selected option is NOT "No"', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: 'should be cleared' } as any
      ];
      component.options.intellectual_property_rights.q4['radioButtonValue'] = '10';
      component.handleSelectionChangeQ4();
      expect(component.options.intellectual_property_rights.q4.options[0].answer_text).toBeNull();
    });

    it('should keep answer_text when selected option IS "No"', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'No', answer_text: 'keep this' } as any
      ];
      component.options.intellectual_property_rights.q4['radioButtonValue'] = '10';
      component.handleSelectionChangeQ4();
      expect(component.options.intellectual_property_rights.q4.options[0].answer_text).toBe('keep this');
    });

    it('should clear answer_text on non-selected options', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'No', answer_text: 'keep' } as any,
        { result_question_id: '20', question_text: 'Other', answer_text: 'should be cleared' } as any
      ];
      component.options.intellectual_property_rights.q4['radioButtonValue'] = '10';
      component.handleSelectionChangeQ4();
      expect(component.options.intellectual_property_rights.q4.options[1].answer_text).toBeNull();
    });

    it('should clear all options answer_text when no option is selected (no match)', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'Option A', answer_text: 'text' } as any
      ];
      component.options.intellectual_property_rights.q4['radioButtonValue'] = '999';
      component.handleSelectionChangeQ4();
      expect(component.options.intellectual_property_rights.q4.options[0].answer_text).toBeNull();
    });

    it('should handle when q4 has no radioButtonValue set', () => {
      component.options.intellectual_property_rights.q4.options = [
        { result_question_id: '10', question_text: 'Yes', answer_text: 'text' } as any
      ];
      // No radioButtonValue set => selectedOptionQ4 is undefined
      component.handleSelectionChangeQ4();
      // !selected => all options get answer_text = null
      expect(component.options.intellectual_property_rights.q4.options[0].answer_text).toBeNull();
    });
  });
});
