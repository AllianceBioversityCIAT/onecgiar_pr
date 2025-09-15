import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { FeedbackValidationDirective } from '../../../../../../shared/directives/feedback-validation.directive';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';

jest.useFakeTimers();

describe('RdTheoryOfChangeComponent', () => {
  let component: RdTheoryOfChangeComponent;
  let fixture: ComponentFixture<RdTheoryOfChangeComponent>;
  let mockApiService: any;
  const mockGET_AllWithoutResultsResponse = [
    {
      id: 1,
      name: 'Initiative 1'
    }
  ];
  const mockGET_tocResponse = {
    contributing_and_primary_initiative: [
      {
        id: 1,
        official_code: 'code',
        short_name: 'name',
        initiative_name: 'initiative'
      }
    ],
    impactsTarge: [
      {
        name: 'name',
        target: 'target'
      }
    ],
    sdgTargets: [
      {
        sdg_target_code: 'code',
        sdg_target: 'target'
      }
    ],
    result_toc_result: {
      initiative_id: 1,
      result_toc_results: [
        {
          planned_result: true
        }
      ],
      planned_result: true
    },
    contributors_result_toc_result: [
      {
        initiative_id: 1,
        result_toc_results: [
          {
            planned_result: true
          }
        ]
      }
    ],
    contributing_center: [{ primary: false }, { primary: false }],
    contributing_initiatives: {
      accepted_contributing_initiatives: [
        {
          id: 1,
          short_name: 'name accepted',
          official_code: 'code-accepted'
        }
      ],
      pending_contributing_initiatives: [
        {
          id: 1,
          short_name: 'name pending',
          official_code: 'code-pending'
        }
      ]
    }
  };
  const mockGET_resultByIdResponse = {
    id: 1,
    portfolio: 'portfolio'
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllWithoutResults: () => of({ response: mockGET_AllWithoutResultsResponse }),
        GET_toc: () => of({ response: mockGET_tocResponse }),
        POST_toc: () => of({}),
        GET_TypeByResultLevel: () => of({ response: [{ id: 3, result_type: [{ id: 3 }] }] }),
        GET_AllCLARISACenters: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GET_resultById: () => of({ response: mockGET_resultByIdResponse })
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      },
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve(document.querySelector('alert-event'));
        }
      },
      rolesSE: {
        readOnly: () => false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdTheoryOfChangeComponent,
        SaveButtonComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        AlertStatusComponent,
        DetailSectionTitleComponent,
        FeedbackValidationDirective
      ],
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule, TermPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdTheoryOfChangeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation(), and GET_AllWithoutResults() on initialization', async () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyGET_AllWithoutResults = jest.spyOn(component, 'GET_AllWithoutResults');

      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div class="alert-event"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      component.ngOnInit();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyGET_AllWithoutResults).toHaveBeenCalled();
    });
  });

  describe('GET_AllWithoutResults()', () => {
    it('should fetch contributing initiatives on initialization', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllWithoutResults');

      component.GET_AllWithoutResults();

      expect(spy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.GET_AllWithoutResults).toHaveBeenCalled();
      expect(component.contributingInitiativesList).toEqual(mockGET_AllWithoutResultsResponse);
    });
  });

  describe('getSectionInformation()', () => {
    it('should update theoryOfChangeBody and related services correctly', async () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_toc');
      const mockSetTimeout = jest.spyOn(window, 'setTimeout');

      component.getSectionInformation(() => {
        expect(component.theoryOfChangeBody).toEqual(mockGET_tocResponse);
        expect(component.theoryOfChangeBody?.contributing_and_primary_initiative[0].full_name).toBe(`code - <strong>name</strong> - initiative`);
        expect(component.theoryOfChangeBody?.impactsTarge[0].full_name).toBe(`<strong>name</strong> - target`);
        expect(component.theoryOfChangeBody?.sdgTargets[0].full_name).toBe(`<strong>code</strong> - target`);
        expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockGET_tocResponse.result_toc_result);
        expect(component.theoryOfChangesServices.result_toc_result.planned_result).toEqual(
          mockGET_tocResponse.result_toc_result?.result_toc_results[0].planned_result
        );
        expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockGET_tocResponse.contributors_result_toc_result);
        expect(component.theoryOfChangesServices.contributors_result_toc_result[0].planned_result).toEqual(
          mockGET_tocResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result
        );
        expect(mockSetTimeout).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should update theoryOfChangeBody and related services correctly when theoryOfChangesServices.result_toc_result.planned_result and tab.result_toc_results[0].planned_result does not exist', async () => {
      mockGET_tocResponse.result_toc_result.result_toc_results[0].planned_result = undefined;
      mockGET_tocResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result = undefined;

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_toc');

      component.getSectionInformation(() => {
        jest.runAllTimers();

        expect(component.theoryOfChangesServices.result_toc_result.planned_result).toBeNull();
        expect(component.theoryOfChangesServices.contributors_result_toc_result[0].planned_result).toBeNull();
        expect(component.theoryOfChangeBody?.contributing_and_primary_initiative[0].full_name).toBe(`code - <strong>name</strong> - initiative`);
        expect(component.theoryOfChangeBody?.impactsTarge[0].full_name).toBe(`<strong>name</strong> - target`);
        expect(component.theoryOfChangeBody?.sdgTargets[0].full_name).toBe(`<strong>code</strong> - target`);
        expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockGET_tocResponse.result_toc_result);
        expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockGET_tocResponse.contributors_result_toc_result);
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should handle errors from GET_toc correctly', async () => {
      const errorMessage = 'error message';
      jest.spyOn(component.api.resultsSE, 'GET_toc').mockReturnValue(throwError(() => errorMessage));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      component.getSectionInformation();

      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage);
      expect(component.getConsumed).toBeTruthy();
    });

    it('should set getConsumed to true', () => {
      jest.useFakeTimers();
      jest.spyOn(component.api.resultsSE, 'GET_toc');

      component.getSectionInformation();

      jest.advanceTimersByTime(100);
      expect(component.getConsumed).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('onSaveSection()', () => {
    beforeEach(async () => {
      component.getSectionInformation();
    });

    it('should call POST_toc when official_code is different from newInitOfficialCode', () => {
      const spyPOST_toc = jest.spyOn(mockApiService.resultsSE, 'POST_toc').mockReturnValue(of({}));
      const spyShowAlert = jest.spyOn(mockApiService.alertsFe, 'show').mockImplementation((config, callback: () => any) => callback());

      component.theoryOfChangeBody.result_toc_result.official_code = 'oldCode';
      component.theoryOfChangeBody.changePrimaryInit = 2;
      component.theoryOfChangeBody.contributing_and_primary_initiative = [{ id: 2, official_code: 'newCode' }];

      component.onSaveSection();

      expect(spyShowAlert).toHaveBeenCalled();
      expect(spyPOST_toc).toHaveBeenCalled();
    });

    it('should call POST_toc when official_code is the same as newInitOfficialCode', () => {
      const spyPOST_toc = jest.spyOn(mockApiService.resultsSE, 'POST_toc').mockReturnValue(of({}));

      component.theoryOfChangeBody.result_toc_result.official_code = 'sameCode';
      component.theoryOfChangeBody.changePrimaryInit = 1;
      component.theoryOfChangeBody.contributing_and_primary_initiative = [{ id: 1, official_code: 'sameCode' }];

      component.onSaveSection();

      expect(spyPOST_toc).toHaveBeenCalled();
    });

    it('should filter out result_toc_results with null toc_result_id when length is greater than 1', () => {
      component.theoryOfChangeBody.result_toc_result.result_toc_results = [
        { toc_result_id: 1 },
        { toc_result_id: null },
        { toc_result_id: 2 }
      ] as any[];

      component.onSaveSection();

      expect(component.theoryOfChangeBody.result_toc_result.result_toc_results).toEqual([{ toc_result_id: 1 }, { toc_result_id: 2 }]);
    });

    it('should reload the page when initiative_id is different from changePrimaryInit', () => {
      const reloadMock = jest.fn();
      delete window.location;
      window.location = { ...window.location, reload: reloadMock } as any;

      component.theoryOfChangeBody.result_toc_result.initiative_id = 1;
      component.theoryOfChangeBody.changePrimaryInit = 2;

      component.onSaveSection();

      expect(reloadMock).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should call getSectionInformation when initiative_id is the same as changePrimaryInit', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.theoryOfChangeBody.result_toc_result.initiative_id = 1;
      component.theoryOfChangeBody.changePrimaryInit = 1;

      component.onSaveSection();

      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('someEditable()', () => {
    it('should return true when .global-editable element is present', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div class="global-editable"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = component.someEditable();

      expect(result).toBeTruthy();
    });

    it('should return false when .global-editable element is not present', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = component.someEditable();

      expect(result).toBeFalsy();
    });
  });

  describe('onSelectContributingInitiative()', () => {
    it('should add contributors to contributors_result_toc_result when not found', async () => {
      component.getSectionInformation(() => {
        component.onSelectContributingInitiative();

        const expectedContributor = [
          {
            index: 0,
            initiative_id: 1,
            planned_result: null,
            result_toc_results: [
              {
                planned_result: undefined
              }
            ],
            showMultipleWPsContent: true
          },
          {
            action_area_outcome_id: null,
            id: null,
            initiative_id: 2,
            official_code: 'code',
            planned_result: null,
            result_toc_result_id: null,
            results_id: null,
            short_name: 'name',
            toc_level_id: null,
            toc_result_id: null
          }
        ];
        expect(component.theoryOfChangeBody.contributors_result_toc_result).toEqual(expectedContributor);
      });
    });
  });

  describe('toggleActiveContributor()', () => {
    it('should toggle the is_active property to true', () => {
      const item = { is_active: false };

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeTruthy();
    });

    it('should toggle the is_active property to false', () => {
      const item = { is_active: true };

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeFalsy();
    });
  });

  describe('onRemoveContributingInitiative()', () => {
    it('should remove the contributor by initiative_id', () => {
      const contributor1 = { initiative_id: 1 };
      const contributor2 = { initiative_id: 2 };
      component.theoryOfChangeBody.contributors_result_toc_result = [contributor1, contributor2];

      component.onRemoveContributingInitiative({ remove: { id: 1 } });

      expect(component.theoryOfChangeBody.contributors_result_toc_result).toEqual([contributor2]);
    });

    it('should remove the contributing initiative and update the arrays', () => {
      component.theoryOfChangeBody = {
        contributors_result_toc_result: [
          { initiative_id: 1, name: 'Initiative 1' },
          { initiative_id: 2, name: 'Initiative 2' }
        ],
        contributing_and_primary_initiative: [
          { id: 1, name: 'Initiative 1' },
          { id: 2, name: 'Initiative 2' }
        ]
      } as any;

      const event = { remove: { id: 1 } };

      component.onRemoveContributingInitiative(event);

      expect(component.theoryOfChangeBody.contributors_result_toc_result.length).toBe(1);
      expect(component.theoryOfChangeBody.contributors_result_toc_result[0].initiative_id).toBe(2);

      expect(component.theoryOfChangeBody.contributing_and_primary_initiative.length).toBe(1);
      expect(component.theoryOfChangeBody.contributing_and_primary_initiative[0].id).toBe(2);
    });
  });

  describe('onRemoveContribuiting()', () => {
    it('should remove the contributing initiative by index', () => {
      component.contributingInitiativeNew = ['initiative1', 'initiative2', 'initiative3'];

      component.onRemoveContribuiting(1, false);

      expect(component.contributingInitiativeNew).toEqual(['initiative1', 'initiative3']);
    });

    it('should remove the contributing initiative by index from accepted_contributing_initiatives', () => {
      component.theoryOfChangeBody.contributing_initiatives.accepted_contributing_initiatives = ['initiative1', 'initiative2', 'initiative3'];

      component.onRemoveContribuiting(1, true);

      expect(component.theoryOfChangeBody.contributing_initiatives.accepted_contributing_initiatives).toEqual(['initiative1', 'initiative3']);
    });
  });
});
