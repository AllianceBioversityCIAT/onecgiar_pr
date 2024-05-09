import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PolicyChangeInfoComponent } from './policy-change-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrMultiSelectComponent } from '../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrSelectComponent } from '../../../../../../../custom-fields/pr-select/pr-select.component';
import { AlertStatusComponent } from '../../../../../../../custom-fields/alert-status/alert-status.component';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { LabelNamePipe } from '../../../../../../../custom-fields/pr-select/label-name.pipe';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

describe('PolicyChangeInfoComponent', () => {
  let component: PolicyChangeInfoComponent;
  let fixture: ComponentFixture<PolicyChangeInfoComponent>;
  let mockApiService: any;
  const mockPolicyChangeQuestions = {
    optionsWithAnswers: [
      {
        answer_boolean: true,
        result_question_id: 'id'
      },
    ]
  };

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GET_policyChanges: () => of({ response: [] }),
        GET_policyChangesQuestions: () => of({ response: mockPolicyChangeQuestions }),
        PATCH_policyChanges: () => of({ response: [] }),
        GET_clarisaPolicyTypes: () => of({ response: [] }),
        GET_clarisaPolicyStages: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
      },
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve();
        },
        showPartnersRequest: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        PolicyChangeInfoComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        PrSelectComponent,
        AlertStatusComponent,
        SaveButtonComponent,
        DetailSectionTitleComponent,
        LabelNamePipe
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PolicyChangeInfoComponent);
    component = fixture.componentInstance;
  });

  describe('changeAnswerBoolean()', () => {
    it('should set answer_boolean to true for the selected value', () => {
      const valueToSelect = 'someValue';
      component.policyChangeQuestions.optionsWithAnswers = [
          {
            result_question_id: 'someValue',
            answer_boolean: undefined,
            answer_text: '',
            disabled: false,
            parent_question_id: '',
            question_description: null,
            question_level: '',
            question_text: '',
            question_type_id: '',
            result_type_id: 1,
            selected: false
          },
        ];

      component.changeAnswerBoolean(valueToSelect);

      expect(component.policyChangeQuestions.optionsWithAnswers[0].answer_boolean).toBeTruthy();
    });

    it('should set answer_boolean to null for non-selected values', () => {
      const valueToSelect = 'someValue';
      component.policyChangeQuestions.optionsWithAnswers = [
          {
            result_question_id: '',
            answer_boolean: undefined,
            answer_text: '',
            disabled: false,
            parent_question_id: '',
            question_description: null,
            question_level: '',
            question_text: '',
            question_type_id: '',
            result_type_id: 1,
            selected: false
          },
        ];

      component.changeAnswerBoolean(valueToSelect);

      expect(component.policyChangeQuestions.optionsWithAnswers[0].answer_boolean).toBeNull();
    });
  });

  describe('getSectionInformation()', () => {
    it('should get section information successfully', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_policyChanges');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.innovationUseInfoBody).toEqual([]);
    });
  });

  describe('getPolicyChangesQuestions()', () => {
    it('should fetch policy change questions and set relatedTo', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_policyChangesQuestions');

      component.getPolicyChangesQuestions();

      expect(spy).toHaveBeenCalled();
      expect(component.policyChangeQuestions).toEqual(mockPolicyChangeQuestions);
      expect(component.relatedTo).toEqual(mockPolicyChangeQuestions.optionsWithAnswers[0].result_question_id);
    });
  });

  describe('policyTypeDescriptions()', () => {
    it('should return the correct HTML string', () => {
      const expectedHtml = `<strong>Policy type guidance</strong> <ul>
        <li><strong>Policy or strategy:</strong> Policies or strategies include written decisions on, or commitments to, a particular course of action by an institution (policy); or a (government, NGO, private sector) high-level plan outlining how a particular course of action will be carried out (strategy). These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. This could also be observed as information campaigns (e.g., for improved diets). These documents set the goalposts but then require other instruments for implementation.</li>
        <li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
        <li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. National Agricultural Investment Plans is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by public, private and NGO sectors.</li>
      </ul>`;

      const result = component.policyTypeDescriptions();
      const normalizedExpected = expectedHtml.replace(/\s+/g, ' ').trim();
      const normalizedActual = result.replace(/\s+/g, ' ').trim();

      expect(normalizedActual).toEqual(normalizedExpected);
    });
  });

  describe('onSaveSection()', () => {
    it('should save section successfully', () => {
      const spyPATCH_policyChanges = jest.spyOn(mockApiService.resultsSE, 'PATCH_policyChanges');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation')

      component.onSaveSection();

      expect(spyPATCH_policyChanges).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('ngOnInit()', () => {
    it('should get section information on initialization', async () => {
      const spyShowAlerts = jest.spyOn(component, 'showAlerts');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyGetPolicyChangesQuestions = jest.spyOn(component, 'getPolicyChangesQuestions');
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(`
        <div class="alert-event"></div>`,
        'text/html');
      jest.spyOn(document, 'querySelector')
        .mockImplementation((selector) => dom.querySelector(selector));


      await component.ngOnInit();

      const alertDiv = dom.querySelector('.alert-event');
      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyShowAlerts).toHaveBeenCalled();
      expect(spyGetPolicyChangesQuestions).toHaveBeenCalled();
      expect(spyFindClassTenSeconds).toHaveBeenCalled();
    });
  });
});
