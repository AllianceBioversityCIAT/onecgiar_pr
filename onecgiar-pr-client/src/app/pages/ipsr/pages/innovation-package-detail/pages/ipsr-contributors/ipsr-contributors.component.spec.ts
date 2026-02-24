import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IpsrContributorsComponent } from './ipsr-contributors.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { IpsrContributorsCentersComponent } from './components/ipsr-contributors-centers/ipsr-contributors-centers.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { IpsrContributorsNonCgiarPartnersComponent } from './components/ipsr-contributors-non-cgiar-partners/ipsr-contributors-non-cgiar-partners.component';
import { IpsrNonPooledProjectsComponent } from './components/ipsr-non-pooled-projects/ipsr-non-pooled-projects.component';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';
import { IpsrContributorsTocComponent } from './components/ipsr-contributors-toc/ipsr-contributors-toc.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { TocInitiativeOutComponent } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.component';
import { PrYesOrNotComponent } from '../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { ChangeDetectorRef } from '@angular/core';

describe('IpsrContributorsComponent', () => {
  let component: IpsrContributorsComponent;
  let fixture: ComponentFixture<IpsrContributorsComponent>;
  let mockApiService: any;
  let mockFieldsManagerService: any;
  let mockRdPartnersSE: any;
  let mockIpsrCompletenessStatusSE: any;
  const mockResponse = {
    result_toc_result: {
      result_toc_results: [{ planned_result: true }, { planned_result: null }]
    },
    contributors_result_toc_result: [
      {
        result_toc_results: [
          {
            planned_result: false
          }
        ]
      }
    ],
    institutions: [
      {
        institutions_type_name: '',
        institutions_name: ''
      }
    ]
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GETContributorsByIpsrResultId: () => of({ response: mockResponse }),
        GET_AllCLARISACenters: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        PATCHContributorsByIpsrResultId: () => of({ response: [] }),
        GET_AllWithoutResults: () => of({ response: [] }),
        GET_TypeByResultLevel: () => of({ response: [] }),
        GET_ClarisaProjects: () => of({ response: [] }),
        GET_innovationUseResults: () => of({ response: [] }),
        ipsrDataControlSE: {
          inContributos: false
        },
        get_vesrsionDashboard: () => of({ response: [] })
      },
      dataControlSE: {
        findClassTenSeconds: () => {
          return Promise.resolve();
        },
        detailSectionTitle: jest.fn(),
        currentResult: {
          portfolio: 'test'
        }
      },
      rolesSE: {
        platformIsClosed: false,
        readOnly: false
      }
    };

    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false),
      isP22: jest.fn().mockReturnValue(true),
      fields: jest.fn().mockReturnValue({})
    };

    mockRdPartnersSE = {
      partnersBody: {
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        contributing_center: [
          { code: 'C1', name: 'Center 1', is_leading_result: false },
          { code: 'C2', name: 'Center 2', is_leading_result: false }
        ],
        bilateral_projects: [],
        result_toc_result: { initiative_id: 1, result_toc_results: [{ planned_result: true }], planned_result: true },
        contributors_result_toc_result: [],
        contributing_and_primary_initiative: [],
        impactsTarge: [],
        sdgTargets: [],
        is_lead_by_partner: false,
        changePrimaryInit: null,
        mqap_institutions: [],
        institutions: [],
        linked_results: []
      },
      contributingInitiativeNew: [],
      leadCenterCode: 'C1',
      leadPartnerId: null,
      updatingLeadData: false,
      setPossibleLeadPartners: jest.fn(),
      setLeadPartnerOnLoad: jest.fn(),
      setPossibleLeadCenters: jest.fn(),
      setLeadCenterOnLoad: jest.fn(),
      loadClarisaProjects: jest.fn()
    };

    mockIpsrCompletenessStatusSE = {
      updateGreenChecks: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        IpsrContributorsComponent,
        SaveButtonComponent,
        IpsrContributorsCentersComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        IpsrContributorsNonCgiarPartnersComponent,
        IpsrNonPooledProjectsComponent,
        NoDataTextComponent,
        IpsrContributorsTocComponent,
        TocInitiativeOutComponent,
        PrYesOrNotComponent
      ],
      imports: [HttpClientTestingModule, FormsModule, TermPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: FieldsManagerService,
          useValue: mockFieldsManagerService
        },
        {
          provide: RdContributorsAndPartnersService,
          useValue: mockRdPartnersSE
        },
        {
          provide: IpsrCompletenessStatusService,
          useValue: mockIpsrCompletenessStatusSE
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit', () => {
    it('should call getSectionInformation on ngOnInit', () => {
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.ngOnInit();

      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should call GET_AllWithoutResults and loadClarisaProjects when isP25 is true', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const getAllSpy = jest.spyOn(component, 'GET_AllWithoutResults');

      component.ngOnInit();

      expect(getAllSpy).toHaveBeenCalled();
      expect(mockRdPartnersSE.loadClarisaProjects).toHaveBeenCalled();
    });

    it('should NOT call GET_AllWithoutResults when isP25 is false', () => {
      mockFieldsManagerService.isP25.mockReturnValue(false);
      const getAllSpy = jest.spyOn(component, 'GET_AllWithoutResults');

      component.ngOnInit();

      expect(getAllSpy).not.toHaveBeenCalled();
    });
  });

  describe('GET_AllWithoutResults', () => {
    it('should fetch contributing initiatives list', () => {
      const mockInitiatives = [{ id: 1, name: 'Init 1' }];
      jest.spyOn(mockApiService.resultsSE, 'GET_AllWithoutResults').mockReturnValue(of({ response: mockInitiatives }));

      component.GET_AllWithoutResults();

      expect(component.contributingInitiativesList).toEqual(mockInitiatives);
    });
  });

  describe('toggleActiveContributor', () => {
    it('should toggle is_active from false to true', () => {
      const item = { is_active: false };
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(true);
    });

    it('should toggle is_active from true to false', () => {
      const item = { is_active: true };
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(false);
    });
  });

  describe('onRemoveContribuiting', () => {
    it('should splice from accepted_contributing_initiatives when isAcceptedArray is true', () => {
      mockRdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives = ['a', 'b', 'c'];
      component.onRemoveContribuiting(1, true);
      expect(mockRdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives).toEqual(['a', 'c']);
    });

    it('should splice from contributingInitiativeNew when isAcceptedArray is false', () => {
      mockRdPartnersSE.contributingInitiativeNew = ['x', 'y', 'z'];
      component.onRemoveContribuiting(0, false);
      expect(mockRdPartnersSE.contributingInitiativeNew).toEqual(['y', 'z']);
    });
  });

  describe('deleteContributingCenter', () => {
    it('should remove center at index and clear leadCenterCode when it matches the deleted center', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];
      mockRdPartnersSE.leadCenterCode = 'C1';

      component.deleteContributingCenter(0);

      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([{ code: 'C2' }]);
      expect(mockRdPartnersSE.leadCenterCode).toBeNull();
    });

    it('should not clear leadCenterCode when deleted center code does not match', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];
      mockRdPartnersSE.leadCenterCode = 'C1';

      component.deleteContributingCenter(1);

      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([{ code: 'C1' }]);
      expect(mockRdPartnersSE.leadCenterCode).toBe('C1');
    });

    it('should set updatingLeadData when updateComponent is true', fakeAsync(() => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      mockRdPartnersSE.leadCenterCode = 'C1';

      component.deleteContributingCenter(0, true);

      expect(mockRdPartnersSE.updatingLeadData).toBe(true);

      tick(50);

      expect(mockRdPartnersSE.updatingLeadData).toBe(false);
    }));

    it('should not set updatingLeadData when updateComponent is false (default)', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      mockRdPartnersSE.leadCenterCode = 'C1';

      component.deleteContributingCenter(0, false);

      expect(mockRdPartnersSE.updatingLeadData).toBe(false);
    });
  });

  describe('getMessageLead', () => {
    it('should return message for partner when is_lead_by_partner is true', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      const msg = component.getMessageLead();
      expect(msg).toContain('partner');
    });

    it('should return message for CG Center when is_lead_by_partner is false', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      const msg = component.getMessageLead();
      expect(msg).toContain('CG Center');
    });
  });

  describe('formatResultLabel', () => {
    it('should return formatted label with result_code, name, acronym, and phase_year', () => {
      const option = { result_code: 'RC1', name: 'Test', acronym: 'TST', phase_year: 2024, result_type_name: 'Type1', title: 'Title1' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TST - 2024) RC1 - Test (Type1) - Title1');
    });

    it('should return formatted label with only acronym (no phase_year)', () => {
      const option = { result_code: 'RC1', name: 'Test', acronym: 'TST', result_type_name: 'Type1' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TST) RC1 - Test (Type1)');
    });

    it('should return formatted label with only phase_year (no acronym)', () => {
      const option = { result_code: 'RC1', name: 'Test', phase_year: 2024 };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(2024) RC1 - Test');
    });

    it('should return formatted label without phaseInfo when no acronym and no phase_year', () => {
      const option = { result_code: 'RC1', name: 'Test' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('RC1 - Test');
    });

    it('should use resultTypeName fallback', () => {
      const option = { result_code: 'RC1', name: 'Test', resultTypeName: 'TypeB' };
      const result = component.formatResultLabel(option);
      expect(result).toContain('(TypeB)');
    });

    it('should use type_name fallback', () => {
      const option = { result_code: 'RC1', name: 'Test', type_name: 'TypeC' };
      const result = component.formatResultLabel(option);
      expect(result).toContain('(TypeC)');
    });

    it('should return title when no result_code', () => {
      const option = { title: 'Just a title' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Just a title');
    });

    it('should return name when no result_code and no title', () => {
      const option = { name: 'Just a name' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Just a name');
    });

    it('should return empty string when option has no relevant fields', () => {
      const result = component.formatResultLabel({});
      expect(result).toBe('');
    });

    it('should return empty string for null/undefined option', () => {
      expect(component.formatResultLabel(null)).toBe('');
      expect(component.formatResultLabel(undefined)).toBe('');
    });

    it('should include title in the formatted label when present', () => {
      const option = { result_code: 'RC1', name: 'Test', title: 'My Title' };
      const result = component.formatResultLabel(option);
      expect(result).toContain('- My Title');
    });

    it('should not include title segment when title is missing', () => {
      const option = { result_code: 'RC1', name: 'Test' };
      const result = component.formatResultLabel(option);
      expect(result).toBe('RC1 - Test');
    });
  });

  describe('getSectionInformation', () => {
    it('should call getSectionInformation and set data on getSectionInformation', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.contributorsBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockResponse.result_toc_result);
      expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockResponse.contributors_result_toc_result);
    });

    it('should call getSectionInformation and set data on getSectionInformation when this.contributorsBody?.result_toc_result?.result_toc_results[0].planned_result is null', () => {
      mockResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result = null;
      mockResponse.result_toc_result.result_toc_results[0].planned_result = null;

      const spy = jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.contributorsBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(mockResponse);
      expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockResponse.result_toc_result);
      expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockResponse.contributors_result_toc_result);
      expect(component.theoryOfChangesServices.result_toc_result.planned_result).toBeNull();
      expect(component.theoryOfChangesServices.contributors_result_toc_result[0].result_toc_results[0].planned_result).toBeNull();
    });

    it('should handle when result_toc_result.result_toc_results is null', () => {
      const nullResponse = {
        ...mockResponse,
        result_toc_result: {
          result_toc_results: null
        },
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        institutions: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId').mockReturnValue(of({ response: nullResponse }));

      component.getSectionInformation();

      expect(component.contributorsBody).toEqual(nullResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(nullResponse);
    });

    it('should handle when contributors_result_toc_result is null', () => {
      const nullContributorsResponse = {
        ...mockResponse,
        contributors_result_toc_result: null,
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        institutions: []
      };

      jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId').mockReturnValue(of({ response: nullContributorsResponse }));

      component.getSectionInformation();

      expect(component.contributorsBody).toEqual(nullContributorsResponse);
      expect(component.theoryOfChangesServices.theoryOfChangeBody).toEqual(nullContributorsResponse);
    });

    it('should call getTocLogicp25 when isP25 is true', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const p25Response = {
        result_toc_result: {
          initiative_id: 1,
          result_toc_results: [{ planned_result: true }]
        },
        contributors_result_toc_result: [
          { result_toc_results: [{ planned_result: false }] }
        ],
        institutions: [{ institutions_type_name: '', institutions_name: '' }],
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        contributing_and_primary_initiative: [
          { id: 1, official_code: 'OC1', short_name: 'SN1', initiative_name: 'Init1' }
        ],
        impactsTarge: [{ name: 'Impact1', target: 'Target1' }],
        sdgTargets: [{ sdg_target_code: 'SDG1', sdg_target: 'SDG Target 1' }],
        bilateral_projects: [{ obj_clarisa_project: { fullName: 'Project1' } }],
        linked_results: [{ id: 1 }],
        changePrimaryInit: null,
        contributingInitiativeNew: []
      };
      jest.spyOn(mockApiService.resultsSE, 'GETContributorsByIpsrResultId').mockReturnValue(of({ response: p25Response }));

      component.getSectionInformation();

      expect(mockRdPartnersSE.setPossibleLeadPartners).toHaveBeenCalled();
    });
  });

  describe('getTocLogicp25', () => {
    it('should process response correctly when result_toc_results is not null', () => {
      const response = {
        linked_results: [{ id: 1 }],
        result_toc_result: {
          initiative_id: 1,
          result_toc_results: [{ planned_result: true }]
        },
        contributors_result_toc_result: [
          { result_toc_results: [{ planned_result: false }] }
        ],
        contributing_and_primary_initiative: [
          { id: 1, official_code: 'OC1', short_name: 'SN1', initiative_name: 'Init1' }
        ],
        impactsTarge: [{ name: 'Impact1', target: 'Target1' }],
        sdgTargets: [{ sdg_target_code: 'SDG1', sdg_target: 'SDG Target 1' }],
        contributing_initiatives: {
          accepted_contributing_initiatives: [{ id: 10 }],
          pending_contributing_initiatives: [{ id: 20 }]
        },
        bilateral_projects: [{ obj_clarisa_project: { fullName: 'Project1' } }]
      };

      mockRdPartnersSE.partnersBody = {
        ...response,
        changePrimaryInit: null
      };
      component.contributorsBody = { ...response, contributingInitiativeNew: [] } as any;

      component.getTocLogicp25(response);

      expect(mockRdPartnersSE.partnersBody.linked_results).toEqual([{ id: 1 }]);
      expect(component.result_toc_result).not.toBeNull();
      expect(component.result_toc_result.showMultipleWPsContent).toBe(true);
      expect(component.contributors_result_toc_result).not.toBeNull();
      expect(component.disabledOptions.length).toBe(2);
      expect(component.getConsumed()).toBe(true);
      expect(mockRdPartnersSE.setPossibleLeadPartners).toHaveBeenCalledWith(true);
      expect(mockRdPartnersSE.setLeadPartnerOnLoad).toHaveBeenCalledWith(true);
      expect(mockRdPartnersSE.setPossibleLeadCenters).toHaveBeenCalledWith(true);
      expect(mockRdPartnersSE.setLeadCenterOnLoad).toHaveBeenCalledWith(true);
    });

    it('should handle null result_toc_results in result_toc_result', () => {
      const response = {
        linked_results: [],
        result_toc_result: {
          initiative_id: 1,
          result_toc_results: null
        },
        contributors_result_toc_result: null,
        contributing_and_primary_initiative: [],
        impactsTarge: null,
        sdgTargets: null,
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        bilateral_projects: []
      };

      mockRdPartnersSE.partnersBody = {
        ...response,
        changePrimaryInit: null
      };
      component.contributorsBody = { ...response, contributingInitiativeNew: [] } as any;

      component.getTocLogicp25(response);

      expect(component.result_toc_result).toBeNull();
      expect(component.contributors_result_toc_result).toBeNull();
    });

    it('should set submitter from matching initiative', () => {
      const response = {
        linked_results: [],
        result_toc_result: {
          initiative_id: 5,
          result_toc_results: null
        },
        contributors_result_toc_result: null,
        contributing_and_primary_initiative: [
          { id: 5, official_code: 'OC5', short_name: 'SN5', initiative_name: 'Init5' }
        ],
        impactsTarge: null,
        sdgTargets: null,
        contributing_initiatives: {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: []
        },
        bilateral_projects: []
      };

      mockRdPartnersSE.partnersBody = {
        ...response,
        changePrimaryInit: null
      };
      component.contributorsBody = { ...response, contributingInitiativeNew: [] } as any;

      component.getTocLogicp25(response);

      expect(component.submitter).toBeDefined();
    });
  });

  describe('onPlannedResultChange', () => {
    it('should clear indicators and toc fields on result_toc_results', () => {
      const cdrSpy = jest.spyOn(component['cdr'], 'detectChanges').mockImplementation();

      const item = {
        result_toc_results: [
          {
            indicators: [
              {
                related_node_id: 10,
                toc_results_indicator_id: 20,
                targets: [{ contributing_indicator: 'x' }]
              }
            ],
            toc_progressive_narrative: 'narrative',
            toc_result_id: 99,
            toc_level_id: 88
          }
        ]
      };

      component.onPlannedResultChange(item);

      expect(item.result_toc_results[0].indicators[0].related_node_id).toBeNull();
      expect(item.result_toc_results[0].indicators[0].toc_results_indicator_id).toBeNull();
      expect(item.result_toc_results[0].indicators[0].targets[0].contributing_indicator).toBeNull();
      expect(item.result_toc_results[0].toc_progressive_narrative).toBeNull();
      expect(item.result_toc_results[0].toc_result_id).toBeNull();
      expect(item.result_toc_results[0].toc_level_id).toBeNull();
      expect(component.tocConsumed).toBe(false);
    });

    it('should handle items without indicators', () => {
      jest.spyOn(component['cdr'], 'detectChanges').mockImplementation();

      const item = {
        result_toc_results: [
          {
            toc_progressive_narrative: 'test',
            toc_result_id: 1,
            toc_level_id: 2
          }
        ]
      };

      component.onPlannedResultChange(item);

      expect(item.result_toc_results[0].toc_progressive_narrative).toBeNull();
      expect(item.result_toc_results[0].toc_result_id).toBeNull();
    });

    it('should handle indicator without targets', () => {
      jest.spyOn(component['cdr'], 'detectChanges').mockImplementation();

      const item = {
        result_toc_results: [
          {
            indicators: [{ related_node_id: 10, toc_results_indicator_id: 20 }],
            toc_progressive_narrative: 'test',
            toc_result_id: 1,
            toc_level_id: 2
          }
        ]
      };

      component.onPlannedResultChange(item);

      expect(item.result_toc_results[0].indicators[0].related_node_id).toBeNull();
    });

    it('should handle null/undefined item', () => {
      jest.spyOn(component['cdr'], 'detectChanges').mockImplementation();

      component.onPlannedResultChange(null);
      expect(component.tocConsumed).toBe(false);
    });
  });

  describe('saveTocLogic', () => {
    it('should copy toc data from theoryOfChangesServices', () => {
      component.theoryOfChangesServices.theoryOfChangeBody = {
        result_toc_result: { initiative_id: 1 }
      };
      component.theoryOfChangesServices.contributors_result_toc_result = [{ index: 0 }];

      component.saveTocLogic();

      expect(component.contributorsBody.result_toc_result).toEqual({ initiative_id: 1 });
      expect(component.contributorsBody.contributors_result_toc_result).toEqual([{ index: 0 }]);
    });
  });

  describe('saveTocLogicp25', () => {
    it('should map is_leading_result for partners when is_lead_by_partner is true', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      mockRdPartnersSE.leadPartnerId = 100;
      mockRdPartnersSE.partnersBody.mqap_institutions = [
        { institutions_id: 100, is_leading_result: false },
        { institutions_id: 200, is_leading_result: false }
      ];
      mockRdPartnersSE.partnersBody.institutions = [
        { institutions_id: 100, is_leading_result: false },
        { institutions_id: 300, is_leading_result: false }
      ];
      mockRdPartnersSE.partnersBody.contributing_center = [
        { code: 'C1', is_leading_result: true }
      ];

      component.saveTocLogicp25();

      expect(mockRdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.mqap_institutions[1].is_leading_result).toBe(false);
      expect(mockRdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.institutions[1].is_leading_result).toBe(false);
      expect(mockRdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(false);
    });

    it('should map is_leading_result for centers when is_lead_by_partner is false', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      mockRdPartnersSE.leadCenterCode = 'C1';
      mockRdPartnersSE.partnersBody.contributing_center = [
        { code: 'C1', is_leading_result: false },
        { code: 'C2', is_leading_result: false }
      ];
      mockRdPartnersSE.partnersBody.mqap_institutions = [
        { institutions_id: 100, is_leading_result: true }
      ];
      mockRdPartnersSE.partnersBody.institutions = [
        { institutions_id: 100, is_leading_result: true }
      ];

      component.saveTocLogicp25();

      expect(mockRdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.contributing_center[1].is_leading_result).toBe(false);
      expect(mockRdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(false);
      expect(mockRdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(false);
    });
  });

  describe('onSaveSection', () => {
    it('should call PATCHContributorsByIpsrResultId and getSectionInformation on onSaveSection', () => {
      const patchContributorsSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(patchContributorsSpy).toHaveBeenCalled();
      expect(getSectionInformationSpy).toHaveBeenCalled();
    });

    it('should call saveTocLogicp25 and include P25-specific data when isP25 is true', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const saveTocLogicp25Spy = jest.spyOn(component, 'saveTocLogicp25');
      mockRdPartnersSE.partnersBody.result_toc_result = {
        initiative_id: 1,
        planned_result: true,
        result_toc_results: [{ planned_result: true }]
      };
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      mockRdPartnersSE.partnersBody.institutions = [];
      mockRdPartnersSE.partnersBody.mqap_institutions = [];
      mockRdPartnersSE.contributingInitiativeNew = [{ id: 99 }];

      component.contributorsBody.contributing_initiatives = {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: [{ id: 1 }]
      };
      component.contributorsBody.contributingInitiativeNew = [];

      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      expect(saveTocLogicp25Spy).toHaveBeenCalled();
      expect(patchSpy).toHaveBeenCalled();
      const sentData = patchSpy.mock.calls[0][0];
      expect(sentData.result_toc_result).toBeDefined();
      expect(sentData.is_lead_by_partner).toBe(false);
    });

    it('should set result_toc_results to null when planned_result is falsy in P25 mode', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockRdPartnersSE.partnersBody.result_toc_result = {
        initiative_id: 1,
        planned_result: false,
        result_toc_results: [{ planned_result: true }]
      };
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      mockRdPartnersSE.partnersBody.institutions = [];
      mockRdPartnersSE.partnersBody.mqap_institutions = [];
      mockRdPartnersSE.contributingInitiativeNew = [];

      component.contributorsBody.contributing_initiatives = {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: []
      };
      component.contributorsBody.contributingInitiativeNew = [];

      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      const sentData = patchSpy.mock.calls[0][0];
      expect(sentData.result_toc_result.result_toc_results).toBeNull();
    });

    it('should call updateGreenChecks after save', () => {
      component.contributorsBody.contributing_initiatives = {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: []
      };
      component.contributorsBody.contributingInitiativeNew = [];

      component.onSaveSection();

      expect(mockIpsrCompletenessStatusSE.updateGreenChecks).toHaveBeenCalled();
    });
  });

  describe('requestEvent', () => {
    it('should show partners request on click of alert-event', async () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>
        `,
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
      expect(spyFindClassTenSeconds).toHaveBeenCalledTimes(2);
    });

    it('should show partners request on click of alert-event and alert-event-2', async () => {
      const spyFindClassTenSeconds = jest.spyOn(mockApiService.dataControlSE, 'findClassTenSeconds');
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>
        <div class="alert-event-2"></div>
        `,
        'text/html'
      );
      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      await component.requestEvent();

      const alertDiv = dom.querySelector('.alert-event');
      const alertDiv2 = dom.querySelector('.alert-event-2');

      if (alertDiv) {
        const clickEvent = new MouseEvent('click');
        alertDiv.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }

      if (alertDiv2) {
        const clickEvent = new MouseEvent('click');
        alertDiv2.dispatchEvent(clickEvent);
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }

      expect(spyFindClassTenSeconds).toHaveBeenCalledTimes(2);
    });

    it('should handle error when querySelector fails', async () => {
      jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('Element not found');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.requestEvent();

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('getContributorDescription', () => {
    it('should return pending confirmation text when result_toc_results is empty', () => {
      const contributor = { official_code: 'OC1', short_name: 'SN1', result_toc_results: [] };
      const result = component.getContributorDescription(contributor);
      expect(result).toContain('Pending confirmation');
    });

    it('should return pending confirmation text when result_toc_results is null/undefined', () => {
      const contributor = { official_code: 'OC1', short_name: 'SN1' };
      const result = component.getContributorDescription(contributor);
      expect(result).toContain('Pending confirmation');
    });

    it('should return alignment text when result_toc_results has items', () => {
      const contributor = { official_code: 'OC1', short_name: 'SN1', result_toc_results: [{ planned_result: true }] };
      const result = component.getContributorDescription(contributor);
      expect(result).toContain('Does this result align');
    });
  });
});
