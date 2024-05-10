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
    contributing_initiatives: [
      {
        id: 1,
        short_name: 'name',
        official_code: 'code'
      }
    ]
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
        GET_allChildlessInstitutionTypes: () => of({ response: [] })
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
      imports: [HttpClientTestingModule, FormsModule],
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
    it('should call requestEvent(), getSectionInformation(), GET_AllWithoutResults() and getContributingCenterOptions() on initialization', () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyRequestEvent = jest.spyOn(component, 'requestEvent');
      const spyGET_AllWithoutResults = jest.spyOn(component, 'GET_AllWithoutResults');
      const spyGetContributingCenterOptions = jest.spyOn(component, 'getContributingCenterOptions');

      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div class="alert-event"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      component.ngOnInit();
      expect(spyRequestEvent).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyFindClassTenSeconds).toHaveBeenCalled();
      expect(spyGET_AllWithoutResults).toHaveBeenCalled();
      expect(spyGetContributingCenterOptions).toHaveBeenCalled();
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

  describe('disabledCenters()', () => {
    it('should update cgspaceDisabledList based on contributing_center', () => {
      component.theoryOfChangeBody.contributing_center = [
        {
          from_cgspace: true,
          code: 'code',
          name: 'name'
        },
        {
          from_cgspace: false,
          code: 'code',
          name: 'name'
        }
      ];
      component.disabledCenters();

      expect(component.cgspaceDisabledList).toEqual([
        {
          from_cgspace: true,
          code: 'code',
          name: 'name'
        }
      ]);
    });
  });

  describe('getContributingCenterOptions()', () => {
    it('should set contributingCenterOptions with data from the service', async () => {
      const mockGetData = jest.fn(() => Promise.resolve(['option1', 'option2']));
      jest.spyOn(component.centersSE, 'getData').mockImplementation(mockGetData);

      await component.getContributingCenterOptions();

      expect(component.contributingCenterOptions).toEqual(['option1', 'option2']);
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
      jest.spyOn(component.api.resultsSE, 'GET_toc').mockReturnValue(throwError(errorMessage));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await component.getSectionInformation();

      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage);
      expect(component.getConsumed).toBeTruthy();
    });
  });

  describe('validateGranTitle()', () => {
    it('should return false when no duplicate grant titles', () => {
      component.theoryOfChangeBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeFalsy();
    });
    it('should return true when there are duplicate grant titles', () => {
      component.theoryOfChangeBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant A',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeTruthy();
    });
  });

  describe('onSaveSection()', () => {
    it('should call POST_toc when official_code is different to newInitOfficialCode', async () => {
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      await component.getSectionInformation();
      component.onSaveSection();

      expect(component.getConsumed).toBeFalsy();
      expect(component.contributingInitiativeNew).toEqual([]);
      expect(spy).toHaveBeenCalled();
    });
    it('should call POST_toc when official_code is the same to newInitOfficialCode', async () => {
      mockGET_tocResponse.contributing_and_primary_initiative[0].id = 2;
      const spy = jest.spyOn(component, 'getSectionInformation');

      await component.getSectionInformation();
      component.onSaveSection();

      expect(component.getConsumed).toBeFalsy();
      expect(component.contributingInitiativeNew).toEqual([]);
      expect(spy).toHaveBeenCalled();
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
      await component.getSectionInformation();
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
  });

  describe('onRemoveContribuiting()', () => {
    it('should remove the contributing initiative by index', () => {
      component.contributingInitiativeNew = ['initiative1', 'initiative2', 'initiative3'];

      component.onRemoveContribuiting(1);

      expect(component.contributingInitiativeNew).toEqual(['initiative1', 'initiative3']);
    });
  });

  describe('addBilateralContribution()', () => {
    it('should add a new donor interface to contributing_np_projects', () => {
      const initialLength = component.theoryOfChangeBody.contributing_np_projects.length;

      component.addBilateralContribution();

      expect(component.theoryOfChangeBody.contributing_np_projects.length).toBe(initialLength + 1);
    });
  });

  describe('requestEvent()', () => {
    it('should handle the click event on alert-event', async () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      await component.requestEvent();
      const alertDiv = dom.querySelector('.alert-event');
      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }
    });
  });

  describe('addPrimary()', () => {
    it('should set primary to true for the specified center', async () => {
      await component.getSectionInformation();
      component.addPrimary(component.theoryOfChangeBody.contributing_center[1]);

      expect(component.theoryOfChangeBody.contributing_center[1].primary).toBeTruthy();
      expect(component.theoryOfChangeBody.contributing_center[0].primary).toBeFalsy();
    });
  });

  describe('deletContributingCenter()', () => {
    it('should delete the contributing center at the specified index', async () => {
      await component.getSectionInformation();
      component.deletContributingCenter(1);

      expect(component.theoryOfChangeBody.contributing_center.length).toBe(1);
    });
  });

  describe('deleteEvidence()', () => {
    it('should delete the evidence at the specified index', () => {
      component.theoryOfChangeBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: {
            institutions_id: 1
          },
          center_grant_id: '',
          lead_center: ''
        }
      ];
      component.deleteEvidence(0);

      expect(component.theoryOfChangeBody.contributing_np_projects.length).toBe(1);
    });
  });

  describe('validatePrimarySelection()', () => {
    it('should set the primary flag if there is only one contributing center', async () => {
      await component.getSectionInformation();

      component.validatePrimarySelection();

      expect(component.theoryOfChangeBody.contributing_center[0].primary).toBeTruthy();
    });
  });
});
