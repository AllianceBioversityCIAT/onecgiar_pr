import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntellectualPropertyRightsComponent } from './intellectual-property-rights.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';


describe('IntellectualPropertyRightsComponent', () => {
  let component: IntellectualPropertyRightsComponent;
  let fixture: ComponentFixture<IntellectualPropertyRightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        IntellectualPropertyRightsComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        FormsModule,
        HttpClientTestingModule
      ],
    })
    .compileComponents();

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
  });
});
