import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
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
import { throwError } from 'rxjs';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { TocInitiativeOutComponent } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.component';
import { PrYesOrNotComponent } from '../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { ChangeDetectorRef } from '@angular/core';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { Subject } from 'rxjs';

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
      isContributorsPartners2026: jest.fn().mockReturnValue(false),
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
      runAutoAssignLeads: jest.fn(),
      onLeadByPartnerChange: jest.fn(),
      resetState: jest.fn(),
      autoAddedLeadCenterCode: null,
      loadClarisaProjects: jest.fn(),
      // P2-3838 — project → owner Center API read by the template and the load flow.
      syncProjectDerivedCenters: jest.fn(),
      // Live production bugfix (external-partners-duplication follow-up) — IPSR's P25 load path now calls this.
      reclassifyPartnersFromToc: jest.fn(),
      isProjectDerivedCenter: jest.fn(() => false),
      isDerivedCenterEntering: jest.fn(() => false),
      isDerivedCenterLeaving: jest.fn(() => false),
      projectDerivedCenterTooltip: jest.fn(() => ''),
      centersLockedInDropdown: [],
      projectDerivedCentersTick: jest.fn(() => 0)
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
      // id 1 is the fixture's own programme (mockRdPartnersSE.result_toc_result.initiative_id), and
      // P2-3746 now keeps the owner out of the dropdown — so this fetch assertion uses a different id.
      const mockInitiatives = [{ id: 99, name: 'Init 1' }];
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

  describe('getMessageLead / getMessageLeadCenter', () => {
    it('the partner note keeps the "already added" restriction', () => {
      const msg = component.getMessageLead();
      expect(msg).toContain('partner');
      expect(msg).toContain('already added in this section');
    });

    // P2-3427: the Lead center offers the full catalogue (LC-DD-1), so its note carries no restriction.
    it('the Lead center note has no "already added" restriction', () => {
      const msg = component.getMessageLeadCenter();
      expect(msg).toContain('CG Center');
      expect(msg).not.toContain('already added');
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
      expect(mockRdPartnersSE.setPossibleLeadPartners).toHaveBeenCalledWith(true, false);
      expect(mockRdPartnersSE.setLeadPartnerOnLoad).toHaveBeenCalledWith(true);
      // P2-3427: auto-assign is OFF here and runs last, in runAutoAssignLeads().
      expect(mockRdPartnersSE.setPossibleLeadCenters).toHaveBeenCalledWith(true, false);
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
      // P2-3427: the Lead center is stamped whatever the partner toggle says (decoupled, as W1/W2).
      expect(mockRdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
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

  // Night sweep 2026-09-23, IPSR-8 (prtest 11172 / 12037): GET 500 → Save stripped the owner SP.
  // Control negative: with the gate line removed from `onSaveSection()` the no-PATCH test fails.
  describe('IPSR-8 — refuses to save after a failed section load', () => {
    it('marks the section as not loaded and does not PATCH', () => {
      const patch = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      mockApiService.resultsSE.GETContributorsByIpsrResultId = () => throwError(() => ({ status: 500 }));
      component.loaded.set(null);
      component.getSectionInformation();

      component.onSaveSection();

      expect(component.loaded()).toBe(false);
      expect(patch).not.toHaveBeenCalled();
    });

    it('does not PATCH while the first GET is still in flight', () => {
      const patch = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      component.loaded.set(null);
      component.onSaveSection();
      expect(patch).not.toHaveBeenCalled();
    });

    it('the template shows the error note and disables Save until loaded', () => {
      const { readFileSync } = require('fs');
      const { join } = require('path');
      const html = readFileSync(join(__dirname, 'ipsr-contributors.component.html'), 'utf8');
      expect(html).toContain('@if (loaded() === false) {');
      expect(html).toContain('[disabled]="loaded() !== true"');
    });
  });

  describe('onSaveSection', () => {
    beforeEach(() => component.loaded.set(true));
    // Night sweep 2026-09-23, IPSR-7. Control negative: without the two deletes this test fails.
    it('IPSR-7: does not echo has_innovation_link / linked_results from the GET body', () => {
      const patch = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      (component.contributorsBody as any).has_innovation_link = false;
      (component.contributorsBody as any).linked_results = [11866];
      component.onSaveSection();
      const [sent] = patch.mock.calls.at(-1) as any[];
      expect('has_innovation_link' in sent).toBe(false);
      expect('linked_results' in sent).toBe(false);
    });

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

    it('should preserve result_toc_results when planned_result is falsy in P25 mode', () => {
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
      expect(sentData.result_toc_result.result_toc_results).toEqual([{ planned_result: true }]);
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
    /**
     * P2-3673: `findClassTenSeconds` RESOLVES WITH `false` when the element never appears (it gives
     * up after ten one-second polls, it does not reject). The old body ignored what it resolved with
     * and re-queried the DOM itself, so on any section without these alerts it threw
     * `Cannot read properties of null (reading 'addEventListener')` into a swallowed `console.error`
     * — the very error QA pasted into the ticket.
     */
    const resolveWith = (byClass: Record<string, unknown>) =>
      jest
        .spyOn(mockApiService.dataControlSE, 'findClassTenSeconds')
        .mockImplementation((className: string) => Promise.resolve(byClass[className] ?? false));

    it('binds the click to the element it was handed, without querying the DOM again', async () => {
      const alert = document.createElement('div');
      const spy = resolveWith({ 'alert-event': alert });
      const querySelector = jest.spyOn(document, 'querySelector');

      await component.requestEvent();

      alert.dispatchEvent(new MouseEvent('click'));
      expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      expect(spy).toHaveBeenCalledTimes(2);
      // The first search already found it; a second lookup could answer something else by now.
      expect(querySelector).not.toHaveBeenCalledWith('.alert-event');
    });

    it('binds both alerts', async () => {
      const alert = document.createElement('div');
      const alert2 = document.createElement('div');
      resolveWith({ 'alert-event': alert, 'alert-event-2': alert2 });

      await component.requestEvent();

      for (const el of [alert, alert2]) {
        component.api.dataControlSE.showPartnersRequest = false;
        el.dispatchEvent(new MouseEvent('click'));
        expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      }
    });

    it('stays silent when the alerts never render — the P2-3673 error', async () => {
      resolveWith({}); // both give up, i.e. resolve `false`
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => component.requestEvent()).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('survives a give-up on ONE of the two without losing the other', async () => {
      const alert2 = document.createElement('div');
      resolveWith({ 'alert-event-2': alert2 });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await component.requestEvent();

      alert2.dispatchEvent(new MouseEvent('click'));
      expect(component.api.dataControlSE.showPartnersRequest).toBeTruthy();
      expect(consoleSpy).not.toHaveBeenCalled();
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

  // LC-T-3 (docs/specs/bugfix/lead-center-full-catalog): IPSR injects the SAME
  // RdContributorsAndPartnersService singleton as Result Detail. Per LC-DD-1 (fixed in LC-T-1),
  // `setPossibleLeadCenters()` unconditionally sources the full mapped CLARISA centers catalog,
  // independent of Contributing CGIAR Centers. This describe block deliberately does NOT mock
  // RdContributorsAndPartnersService itself (the disqualifying-mock clause in LC-T-3) — it provides
  // the REAL service with only its own dependencies (ApiService/InstitutionsService/CentersService)
  // stubbed, so the assertion actually exercises the shared-service fix rather than a local double.
  describe('LC-T-3: Lead Center full catalog inherited from the shared service', () => {
    let ipsrComponent: IpsrContributorsComponent;
    let ipsrFixture: ComponentFixture<IpsrContributorsComponent>;
    let realRdPartnersSE: RdContributorsAndPartnersService;
    let mockCentersSE: { centersList: { code: string; full_name: string }[]; loadedCenters: Subject<boolean> };

    beforeEach(async () => {
      const mockApiForRealService: any = {
        resultsSE: {
          GET_ContributorsPartners: jest.fn(),
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
          ipsrDataControlSE: { inContributos: false },
          get_vesrsionDashboard: () => of({ response: [] })
        },
        dataControlSE: {
          findClassTenSeconds: () => Promise.resolve(),
          detailSectionTitle: jest.fn(),
          currentResult: { portfolio: 'test' }
        },
        rolesSE: { platformIsClosed: false, readOnly: false }
      };
      const mockInstitutionsSE: any = {
        institutionsList: [],
        institutionsWithoutCentersList: [],
        loadedInstitutions: new Subject<boolean>()
      };
      // LC-T-1's anti-gaming clause: 3+ centers so a full-catalog length and a Contributing-Centers-union
      // length remain distinguishable — see rd-contributors-and-partners.service.spec.ts for the rationale.
      mockCentersSE = {
        centersList: [
          { code: 'C1', full_name: 'Center One' },
          { code: 'C2', full_name: 'Center Two' },
          { code: 'C3', full_name: 'Center Three' }
        ],
        loadedCenters: new Subject<boolean>()
      };

      TestBed.resetTestingModule();
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
          RdContributorsAndPartnersService, // real service — no useValue mock (LC-T-3 disqualifying-mock clause)
          { provide: ApiService, useValue: mockApiForRealService },
          {
            provide: FieldsManagerService,
            useValue: {
              isP25: jest.fn().mockReturnValue(true),
              isP22: jest.fn().mockReturnValue(false),
              isContributorsPartners2026: jest.fn().mockReturnValue(false),
              fields: jest.fn().mockReturnValue({})
            }
          },
          { provide: InstitutionsService, useValue: mockInstitutionsSE },
          { provide: CentersService, useValue: mockCentersSE },
          { provide: IpsrCompletenessStatusService, useValue: { updateGreenChecks: jest.fn() } }
        ]
      }).compileComponents();

      ipsrFixture = TestBed.createComponent(IpsrContributorsComponent);
      ipsrComponent = ipsrFixture.componentInstance;
      realRdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    });

    it('LC-TEST-8: possibleLeadCenters is populated with the full catalog when 0 Contributing CGIAR Centers are selected', () => {
      // Arrange: 0 Contributing Centers (ToC-less/fresh result), going through setPossibleLeadCenters
      // via the component's own getTocLogicp25 flow — not a hand-set fixture bypassing the service.
      realRdPartnersSE.partnersBody.contributing_center = [];
      realRdPartnersSE.otherCentersSelected = [];
      realRdPartnersSE.partnersBody.contributing_and_primary_initiative = [];
      realRdPartnersSE.partnersBody.impactsTarge = [];
      realRdPartnersSE.partnersBody.sdgTargets = [];
      realRdPartnersSE.partnersBody.contributing_initiatives = {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: []
      };
      realRdPartnersSE.partnersBody.result_toc_result = { initiative_id: 1, result_toc_results: null };
      realRdPartnersSE.partnersBody.contributors_result_toc_result = null;
      ipsrComponent.contributorsBody.bilateral_projects = [];

      const response = {
        linked_results: [],
        result_toc_result: { initiative_id: 1, result_toc_results: null },
        contributors_result_toc_result: null,
        contributing_and_primary_initiative: [],
        impactsTarge: null,
        sdgTargets: null,
        contributing_initiatives: { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] },
        bilateral_projects: []
      };

      // Act: exercise the REAL shared service through the component's normal P25 load path
      // (getTocLogicp25 calls rdPartnersSE.setPossibleLeadCenters(true) — service.ts:178).
      ipsrComponent.getTocLogicp25(response);

      // Assert (LC-AC-1, IPSR surface): the Lead Center dropdown source is non-empty and equals the
      // full mapped CLARISA catalog, not a subset filtered by (empty) Contributing Centers.
      expect(realRdPartnersSE.possibleLeadCenters.length).toBeGreaterThan(0);
      expect(realRdPartnersSE.possibleLeadCenters.map(c => c.code).sort()).toEqual(mockCentersSE.centersList.map(c => c.code).sort());
    });

    /**
     * Live production bugfix (docs/specs/bugfix/external-partners-duplication follow-up, confirmed live on
     * prtest result 12125 / IPSR 9657): IPSR's own P25 load path (`getTocLogicp25`) never reclassified
     * `partnersBody.institutions` by `from_toc`, nor reset `otherPartnersSelected` from the fresh GET — the
     * same institution could render in BOTH buckets at once after a save+reload (a stale, never-cleared
     * `otherPartnersSelected` from in-session "Other(s)" picks, PLUS the raw unclassified GET response in
     * `institutions`). Falsifier: without `reclassifyPartnersFromToc()` wired in, `otherPartnersSelected`
     * would stay at its STALE pre-load value (asserted below to be exactly the fresh response's "Other"
     * partners, not the stale ones seeded before the call) and/or an institution would appear in both
     * buckets. Uses the REAL shared service (LC-T-3's disqualifying-mock clause) — the bug is entirely in
     * what the two buckets end up holding, not in a mocked call being made.
     */
    it('reclassifies partnersBody.institutions by from_toc and resets the STALE otherPartnersSelected on load — no overlap, count matches distinct institutions', () => {
      // reclassifyPartnersFromToc() (and applyTocMappingOnLoad()) are gated on the 2026 phase — this
      // describe's default mock leaves it false (irrelevant to the Lead Center tests above).
      (TestBed.inject(FieldsManagerService).isContributorsPartners2026 as jest.Mock).mockReturnValue(true);

      const response: any = {
        linked_results: [],
        result_toc_result: { initiative_id: 1, result_toc_results: null },
        contributors_result_toc_result: null,
        contributing_and_primary_initiative: [],
        impactsTarge: null,
        sdgTargets: null,
        contributing_initiatives: { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] },
        bilateral_projects: [],
        mqap_institutions: [],
        is_lead_by_partner: false,
        // Mixed from_toc, same shape as the live repro: 2 ToC partners, 2 "Other" partners.
        institutions: [
          { institutions_id: 10, from_toc: true, full_name: 'ToC Partner 10' },
          { institutions_id: 20, from_toc: true, full_name: 'ToC Partner 20' },
          { institutions_id: 30, from_toc: false, full_name: 'Other Partner 30' },
          { institutions_id: 40, from_toc: false, full_name: 'Other Partner 40' }
        ]
      };

      realRdPartnersSE.partnersBody.contributing_and_primary_initiative = [];
      realRdPartnersSE.partnersBody.impactsTarge = [];
      realRdPartnersSE.partnersBody.sdgTargets = [];
      realRdPartnersSE.partnersBody.contributing_initiatives = { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] };
      realRdPartnersSE.partnersBody.result_toc_result = { initiative_id: 1, result_toc_results: null };
      realRdPartnersSE.partnersBody.contributors_result_toc_result = null;
      realRdPartnersSE.partnersBody.institutions = response.institutions;
      realRdPartnersSE.partnersBody.mqap_institutions = [];
      realRdPartnersSE.partnersBody.is_lead_by_partner = false;
      ipsrComponent.contributorsBody.bilateral_projects = [];

      // Stale, pre-existing value from a prior in-session "Other(s)" pick — one id (30) also present in
      // the fresh GET's "Other" bucket, one id (99) that no longer exists in the fresh response at all.
      realRdPartnersSE.otherPartnersSelected = [
        { institutions_id: 30, full_name: 'STALE Other Partner 30' },
        { institutions_id: 99, full_name: 'STALE Other Partner 99 (gone from the fresh GET)' }
      ];

      ipsrComponent.getTocLogicp25(response);

      const tocIds = realRdPartnersSE.partnersBody.institutions
        .filter((i: any) => i.institutions_id !== realRdPartnersSE.OTHER_PARTNERS_CODE)
        .map((i: any) => i.institutions_id);
      const otherIds = realRdPartnersSE.otherPartnersSelected.map((i: any) => i.institutions_id);

      // otherPartnersSelected is RECONCILED from the fresh GET, not left stale.
      expect(otherIds.sort()).toEqual([30, 40]);
      expect(otherIds).not.toContain(99);
      // ToC bucket holds exactly the ToC-flagged partners.
      expect(tocIds.sort()).toEqual([10, 20]);
      // No institution renders in both buckets at once.
      const intersection = tocIds.filter((id: number) => otherIds.includes(id));
      expect(intersection).toEqual([]);
      // Combined count matches the number of DISTINCT institutions in the response (4), not a doubled count.
      expect(tocIds.length + otherIds.length).toBe(4);
    });
  });
  /**
   * P2-3746 — the package's own Science Program must never reach the dropdown.
   *
   * The server drops it silently (`results-toc-results.service.ts:1596` filters the owner out of
   * `pendingIds`; `share-result-request.service.ts:183` refuses to share a result with its owner),
   * so offering it means a `201`, a success toast and an empty field on reload. Reproduced on
   * result 9409 / SP01: the PATCH carried `pending=[50, 51]` and only 51 came back.
   */
  describe('P2-3746 — owner Science Program is not offered as a contributing one', () => {
    const CATALOG = [
      { id: 50, official_code: 'SP01', full_name: 'SP01 - Breeding for Tomorrow' },
      { id: 51, official_code: 'SP02', full_name: 'SP02 - Sustainable Farming' },
      { id: 52, official_code: 'SP03', full_name: 'SP03 - Sustainable Animal and Aquatic Foods' }
    ];

    const sectionResponse = (owner: any) => ({
      ...mockResponse,
      owner_initiative: owner,
      contributing_initiatives: { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] }
    });

    beforeEach(() => {
      mockApiService.resultsSE.GET_AllWithoutResults = () => of({ response: CATALOG });
    });

    it('drops the owner when the catalog lands AFTER the section (owner already known)', () => {
      mockApiService.resultsSE.GETContributorsByIpsrResultId = () => of({ response: sectionResponse({ id: 50, official_code: 'SP01' }) });

      component.getSectionInformation();
      component.GET_AllWithoutResults();

      expect(component.contributingInitiativesList.map(i => i.id)).toEqual([51, 52]);
    });

    it('drops the owner when the catalog lands BEFORE the section (the real load order)', () => {
      mockApiService.resultsSE.GETContributorsByIpsrResultId = () => of({ response: sectionResponse({ id: 50, official_code: 'SP01' }) });

      // ngOnInit fires getSectionInformation first, but the catalog request usually answers first;
      // without the second pass in getSectionInformation the owner would stay selectable.
      component.GET_AllWithoutResults();
      expect(component.contributingInitiativesList.map(i => i.id)).toEqual([50, 51, 52]);

      component.getSectionInformation();
      expect(component.contributingInitiativesList.map(i => i.id)).toEqual([51, 52]);
    });

    it('falls back to result_toc_result.initiative_id when the payload carries no owner_initiative', () => {
      const legacy = sectionResponse(undefined);
      legacy.result_toc_result = { ...mockResponse.result_toc_result, initiative_id: 52 } as any;
      mockApiService.resultsSE.GETContributorsByIpsrResultId = () => of({ response: legacy });

      component.GET_AllWithoutResults();
      component.getSectionInformation();

      expect(component.contributingInitiativesList.map(i => i.id)).toEqual([50, 51]);
    });

    it('hides nothing while the owner is still unknown (negative control)', () => {
      component.GET_AllWithoutResults();

      expect(component.contributingInitiativesList.map(i => i.id)).toEqual([50, 51, 52]);
    });

    it('keeps the array reference stable between loads — a new array each pass is an NG0103 condition', () => {
      mockApiService.resultsSE.GETContributorsByIpsrResultId = () => of({ response: sectionResponse({ id: 50, official_code: 'SP01' }) });

      component.GET_AllWithoutResults();
      component.getSectionInformation();
      const first = component.contributingInitiativesList;

      expect(component.contributingInitiativesList).toBe(first);
    });
  });

  // P2-3427 (Ángel, 25-Sep-2026 review of the IPSR flow) — Lead center placement and sync, ToC question wording.
  describe('P2-3427 — Lead center like W1/W2', () => {
    const html = readFileSync(join(__dirname, 'ipsr-contributors.component.html'), 'utf8');

    it('loads the saved lead FIRST and runs the auto-assign LAST (the old order lost the single-center lead)', () => {
      const order: string[] = [];
      mockRdPartnersSE.setPossibleLeadCenters.mockImplementation((...args: any[]) => order.push('setPossibleLeadCenters:' + JSON.stringify(args)));
      mockRdPartnersSE.setLeadCenterOnLoad.mockImplementation(() => order.push('setLeadCenterOnLoad'));
      mockRdPartnersSE.runAutoAssignLeads.mockImplementation(() => order.push('runAutoAssignLeads'));
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockRdPartnersSE.partnersBody.contributing_and_primary_initiative = [];
      component.contributorsBody = { ...mockResponse, bilateral_projects: [] } as any;

      component.getTocLogicp25({ ...mockResponse, linked_results: [] });

      expect(order).toEqual(['setPossibleLeadCenters:[true,false]', 'setLeadCenterOnLoad', 'runAutoAssignLeads']);
    });

    it('resets the shared service state before loading (root singleton leaks W1/W2 selections otherwise)', () => {
      jest.spyOn(component, 'getSectionInformation').mockImplementation();
      component.ngOnInit();
      expect(mockRdPartnersSE.resetState).toHaveBeenCalled();
    });

    it('adds a lead that is not a contributor yet to contributing_center and remembers it as auto-added', () => {
      component.centersSE.centersList = [{ code: 'C9', name: 'Center 9', full_name: 'C9 - Center 9' }] as any;
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1', name: 'Center 1' }];

      component.onLeadCenterSelected('C9');

      expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1', 'C9']);
      expect(mockRdPartnersSE.autoAddedLeadCenterCode).toBe('C9');
      expect(mockRdPartnersSE.setPossibleLeadCenters).toHaveBeenCalledWith(true);
    });

    it('swapping the lead strips only the center the previous pick auto-added', () => {
      component.centersSE.centersList = [
        { code: 'C8', name: 'Center 8' },
        { code: 'C9', name: 'Center 9' }
      ] as any;
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1', name: 'Center 1' }, { code: 'C9', name: 'Center 9' }];
      mockRdPartnersSE.autoAddedLeadCenterCode = 'C9';

      component.onLeadCenterSelected('C8');

      expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1', 'C8']);
      expect(mockRdPartnersSE.autoAddedLeadCenterCode).toBe('C8');
    });

    it('does nothing when the pick is already a contributor (negative control)', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1', name: 'Center 1' }];
      mockRdPartnersSE.setPossibleLeadCenters.mockClear();

      component.onLeadCenterSelected('C1');

      expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
      expect(mockRdPartnersSE.setPossibleLeadCenters).not.toHaveBeenCalled();
    });

    it('forgets the auto-added code when that center is removed by hand', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C9' }];
      mockRdPartnersSE.autoAddedLeadCenterCode = 'C9';
      mockRdPartnersSE.leadCenterCode = 'C9';

      component.deleteContributingCenter(1);

      expect(mockRdPartnersSE.autoAddedLeadCenterCode).toBeNull();
      expect(mockRdPartnersSE.leadCenterCode).toBeNull();
    });

    it('markup: the Lead center sits right under the centers chips, before the W3/bilateral projects, and always shows', () => {
      const lead = html.indexOf('data-testid="ipsr-field-contributing_center~lead"');
      const chips = html.indexOf('class="centers chips_container"');
      const projects = html.indexOf('label="Contributing W3 and/or bilateral projects"');
      expect(lead).toBeGreaterThan(chips);
      expect(lead).toBeLessThan(projects);
      expect(html).not.toContain('#selectLeadCenter');
      // P2-3838: a Lead swap re-syncs the project-derived Centers right after its own bookkeeping.
      expect(html).toMatch(/\(selectOptionEvent\)="onLeadCenterSelected\(\$event\?\.code \?\? null\); this\.rdPartnersSE\.syncProjectDerivedCenters\(\)"/);
      expect(html).toMatch(/\(selectOptionEvent\)="this\.rdPartnersSE\.onLeadByPartnerChange\(\$event\)"/);
    });
  });

  // P2-3427 (package 9638): no ToC row saved → "Yes" showed only "+", "No" had no row for the financial answer.
  describe('P2-3427 — a package without ToC rows gets one so the Level and the financial answer have a home', () => {
    it('ensureTocRow adds exactly one default row when the list is empty and leaves an existing list alone', () => {
      const item: any = { initiative_id: 7, official_code: 'SP13', short_name: 'Genebank', planned_result: true, result_toc_results: [] };
      component.ensureTocRow(item);
      expect(item.result_toc_results).toHaveLength(1);
      expect(item.result_toc_results[0]).toMatchObject({ initiative_id: 7, official_code: 'SP13', planned_result: true, toc_level_id: null, toc_result_id: null });
      component.ensureTocRow(item);
      expect(item.result_toc_results).toHaveLength(1);
    });

    it('onPlannedResultChange keeps one row and creates it when there was none', () => {
      const item: any = { initiative_id: 7, result_toc_results: [] };
      component.onPlannedResultChange(item);
      expect(item.result_toc_results).toHaveLength(1);
    });

    it('load path (getTocLogicp25) also guarantees the row', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockRdPartnersSE.partnersBody.result_toc_result = { initiative_id: 7, official_code: 'SP13', result_toc_results: [] };
      mockRdPartnersSE.partnersBody.contributing_and_primary_initiative = [];
      component.contributorsBody = { ...mockResponse, bilateral_projects: [] } as any;
      component.getTocLogicp25({ ...mockResponse, linked_results: [] });
      expect(mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results).toHaveLength(1);
    });
  });

  describe('P2-3427 — ToC question reads like W1/W2', () => {
    const html = readFileSync(join(__dirname, 'ipsr-contributors.component.html'), 'utf8');

    it('2026 phase: KPI label, 2026 note, financial-resources question on No, 50-word justification', () => {
      mockFieldsManagerService.isContributorsPartners2026.mockReturnValue(true);
      expect(component.tocQuestionLabel()).toBe('Can this result be mapped to a ToC KPI?');
      expect(component.tocQuestionInfoNote()).toContain('2026 ToC KPI');
      expect(html).toContain('[label]="tocQuestionLabel()"');
      expect(html).toContain('[tooltip]="tocQuestionInfoNote()"');
      expect(html).toMatch(/@if \(isCP2026\(\) && !this\.rdPartnersSE\.partnersBody\.result_toc_result\.planned_result\) \{\s*<app-pr-yes-or-not\s*label="Did the Program invest financial resources/);
      expect(html).toContain('[maxWords]="isCP2026() ? 50 : 30"');
    });

    it('2025 phase keeps the 2025 wording and its alert (phase gate, not portfolio)', () => {
      mockFieldsManagerService.isContributorsPartners2026.mockReturnValue(false);
      expect(component.tocQuestionLabel()).toBe("Does this result align with the Program's planned TOC indicators?");
      expect(component.tocQuestionInfoNote()).toContain('2025 ToC');
      expect(html).toMatch(/@if \(!isCP2026\(\)\) \{[\s\S]*?<app-alert-status[\s\S]*?\[collapsible\]="false"/);
    });

    it('the financial-resources radio reads the first ToC row and writes every row', () => {
      mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results = [{ planned_result: false }, { planned_result: false }];
      expect(component.programInvestedFinancialResources).toBeNull();
      component.programInvestedFinancialResources = true;
      expect(mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results.map((r: any) => r.program_invested_financial_resources)).toEqual([true, true]);
      expect(component.programInvestedFinancialResources).toBe(true);
    });
  });

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — `CanComponentDeactivate` wiring. The mocks are synchronous
   * (`of(...)`), which matches the component: once the GET resolves nothing in its load flow is async.
   */
  describe('CanComponentDeactivate (P2-3427)', () => {
    // Local literal, never the file-level `mockResponse`: `onSectionInformation()` assigns the response BY
    // REFERENCE and earlier tests mutate the shared one in place.
    const freshResponse = () => ({
      result_toc_result: {
        initiative_id: 1,
        planned_result: true,
        result_toc_results: [
          { planned_result: true, toc_progressive_narrative: null, indicators: [{ related_node_id: null, toc_results_indicator_id: 42, targets: [] }] }
        ]
      },
      contributors_result_toc_result: [],
      contributing_initiatives: { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] },
      contributing_center: [{ code: 'C1', name: 'Center 1', is_leading_result: true }],
      bilateral_projects: [],
      institutions: [{ institutions_id: 7, institutions_type_name: '', institutions_name: 'Partner 7' }],
      mqap_institutions: [],
      is_lead_by_partner: false,
      linked_results: []
    });
    const anotherPartner = (id: number) => ({ institutions_id: id, institutions_type_name: '', institutions_name: `Partner ${id}` }) as any;

    beforeEach(() => {
      mockApiService.resultsSE.GETContributorsByIpsrResultId = jest.fn(() => of({ response: freshResponse() }));
      mockApiService.resultsSE.PATCHContributorsByIpsrResultId = jest.fn(() => of({ response: [] }));
      component.ngOnInit();
    });

    it('is false right after the load flow completes (untouched)', () => {
      expect(component.loaded()).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('stays false when the shared ToC children stamp their client-only fields onto the rows after the load', () => {
      const row = component.contributorsBody.result_toc_result.result_toc_results[0] as any;
      // exactly what `CPMultipleWPsComponent.ngOnChanges()` and `multiple-wps-content.getIndicatorsList()` write
      row.uniqueId = '0';
      row.indicators[0].related_node_id = row.indicators[0].toc_results_indicator_id;
      row.toc_progressive_narrative = '';

      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('is true after editing a bound field of the body', () => {
      component.contributorsBody.institutions.push(anotherPartner(8));

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('is true after changing ONLY the Lead center, which lives on the shared service and not on the body', () => {
      mockRdPartnersSE.leadCenterCode = `${mockRdPartnersSE.leadCenterCode}-changed`;

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('is false right when saveSection() emits true, even when the follow-up reload fails', () => {
      component.contributorsBody.institutions.push(anotherPartner(8));
      expect(component.hasUnsavedChanges()).toBe(true);
      mockApiService.resultsSE.GETContributorsByIpsrResultId = jest.fn(() => throwError(() => new Error('reload failed')));
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      let sawTrue = false;
      component.saveSection().subscribe(result => {
        sawTrue = result === true;
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      expect(sawTrue).toBe(true);
      expect(patchSpy).toHaveBeenCalledTimes(1);
      // the failed RE-load keeps the section usable (IPSR-8) and the baseline the save set
      expect(component.loaded()).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('saveSection() resolves false (not throws) when the PATCH fails, without reloading', () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.PATCHContributorsByIpsrResultId = jest.fn(() => throwError(() => new Error('save failed')));
      const reloadSpy = jest.spyOn(component, 'getSectionInformation');

      let result: boolean | undefined;
      let errored = false;
      component.saveSection().subscribe({ next: value => (result = value), error: () => (errored = true) });

      expect(errored).toBe(false);
      expect(result).toBe(false);
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('saveSection() resolves false without calling the PATCH when the section was never loaded (IPSR-8)', () => {
      component.loaded.set(null);
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      let result: boolean | undefined;
      component.saveSection().subscribe(value => (result = value));

      expect(result).toBe(false);
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('moves the baseline when a late catalogue re-assigns ONLY the lead, and keeps a real edit dirty', () => {
      // late `loadedCenters` emission: the service recomputed the Lead center and calls us back
      mockRdPartnersSE.leadCenterCode = 'C1-from-late-catalogue';
      mockRdPartnersSE.onCatalogueDrivenLeadUpdate('centers');
      expect(component.hasUnsavedChanges()).toBe(false);

      // the same emission while the reporter already edited the body: the edit must survive as dirty
      component.contributorsBody.institutions.push(anotherPartner(9));
      mockRdPartnersSE.leadCenterCode = 'C1-again';
      mockRdPartnersSE.onCatalogueDrivenLeadUpdate('centers');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    // P2-3838 — a late catalogue that derives a Center from a saved project is not a user edit.
    describe('P2-3838 — project-derived Centers that land after the load snapshot', () => {
      const deriveCenter = () =>
        mockRdPartnersSE.syncProjectDerivedCenters.mockImplementation(() => {
          mockRdPartnersSE.partnersBody.contributing_center = [
            ...(mockRdPartnersSE.partnersBody.contributing_center || []),
            { code: 'C7', name: 'Center 7 (owner of a saved project)' }
          ];
        });
      // The P25 load walks `contributing_and_primary_initiative`; the block's `freshResponse()` is the non-P25 shape.
      beforeEach(() => {
        mockApiService.resultsSE.GETContributorsByIpsrResultId = jest.fn(() =>
          of({ response: { ...freshResponse(), contributing_and_primary_initiative: [] } })
        );
      });

      const projectsCatalogueCallback = () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        mockRdPartnersSE.loadClarisaProjects.mockClear();
        component.ngOnInit();
        return mockRdPartnersSE.loadClarisaProjects.mock.calls.at(-1)[0] as () => void;
      };

      it('runs the derivation at the end of the P25 load, before the clean snapshot', () => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        mockRdPartnersSE.syncProjectDerivedCenters.mockClear();
        deriveCenter();
        component.ngOnInit();

        expect(mockRdPartnersSE.syncProjectDerivedCenters).toHaveBeenCalledWith({ animate: false });
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      it('late PROJECTS catalogue adds a Center to an untouched section: it stays clean', () => {
        const onLoaded = projectsCatalogueCallback();
        expect(component.hasUnsavedChanges()).toBe(false);
        deriveCenter();

        onLoaded();

        expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toContain('C7');
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      it('late CENTERS catalogue adds a Center to an untouched section: it stays clean', () => {
        deriveCenter();

        mockRdPartnersSE.onCatalogueDrivenLeadUpdate('centers');

        expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toContain('C7');
        expect(component.hasUnsavedChanges()).toBe(false);
      });

      it('a section the reporter already edited stays dirty — the late derivation never swallows the edit', () => {
        const onLoaded = projectsCatalogueCallback();
        component.contributorsBody.institutions.push(anotherPartner(11));
        deriveCenter();

        onLoaded();

        expect(component.hasUnsavedChanges()).toBe(true);
      });
    });

    it('detaches its catalogue callback from the shared service on destroy', () => {
      expect(typeof mockRdPartnersSE.onCatalogueDrivenLeadUpdate).toBe('function');

      component.ngOnDestroy();

      expect(mockRdPartnersSE.onCatalogueDrivenLeadUpdate).toBeUndefined();
    });
  });

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review, reproduced in prtest) — saving Contributors with the "Other(s) External
   * Partners" option open posted the selector's sentinel row (`institutions_id = -999999`) and MySQL refused it
   * (FK `results_by_institution.institutions_id -> clarisa_institutions.id`); the partners picked under Other(s)
   * never reached the payload. Same contract as W1/W2 (`rd-contributors-and-partners.component.ts:1142-1151`).
   */
  describe('P2-3427 — External Partners "Other(s)" never reach the PATCH as the sentinel (P25)', () => {
    const OTHER_PARTNERS_CODE = -999999; // `RdContributorsAndPartnersService.OTHER_PARTNERS_CODE`
    const tocPartner = { institutions_id: 11, institutions_name: 'ToC partner 11', institutions_type_name: '' };
    const sentinel = { institutions_id: OTHER_PARTNERS_CODE, full_name: '<strong>Other(s) External Partners</strong>' };
    const otherPartner = { institutions_id: 22, institutions_name: 'Other partner 22', institutions_type_name: '' };

    const lastSent = (patchSpy: jest.SpyInstance) => patchSpy.mock.calls.at(-1)[0];

    beforeEach(() => {
      component.loaded.set(true);
      mockFieldsManagerService.isP25.mockReturnValue(true);
      mockFieldsManagerService.isContributorsPartners2026.mockReturnValue(true);
      mockRdPartnersSE.OTHER_PARTNERS_CODE = OTHER_PARTNERS_CODE;
      mockRdPartnersSE.partnersBody.institutions = [{ ...tocPartner }, { ...sentinel }];
      mockRdPartnersSE.partnersBody.mqap_institutions = [{ institutions_id: 33 }];
      mockRdPartnersSE.otherPartnersSelected = [{ ...otherPartner }];
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      mockRdPartnersSE.leadPartnerId = null;
      component.contributorsBody.contributing_initiatives = { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] };
      component.contributorsBody.contributingInitiativeNew = [];
      // These tests are about the PATCH payload only: the follow-up reload would swap `partnersBody` for the GET
      // response and hide what was sent.
      jest.spyOn(component, 'getSectionInformation').mockImplementation(() => undefined);
    });

    it('(a) strips the sentinel: no institutions_id === -999999 travels, the ToC partner stays with from_toc: true', () => {
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      const sent = lastSent(patchSpy);
      expect(sent.institutions.some((p: any) => p.institutions_id === OTHER_PARTNERS_CODE)).toBe(false);
      expect(sent.institutions).toEqual(expect.arrayContaining([expect.objectContaining({ institutions_id: 11, from_toc: true })]));
    });

    it('(b) sends the partners picked under Other(s) with from_toc: false', () => {
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      const sent = lastSent(patchSpy);
      expect(sent.institutions).toEqual(expect.arrayContaining([expect.objectContaining({ institutions_id: 22, from_toc: false })]));
      expect(sent.institutions).toHaveLength(2);
    });

    it('(c) the lead partner chosen under Other(s) goes out with is_leading_result: true, the rest false', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      mockRdPartnersSE.leadPartnerId = 22;
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      const sent = lastSent(patchSpy);
      expect(sent.institutions.find((p: any) => p.institutions_id === 22).is_leading_result).toBe(true);
      expect(sent.institutions.find((p: any) => p.institutions_id === 11).is_leading_result).toBe(false);
    });

    it('(c-control) with the lead NOT by partner nobody is lead, whatever leadPartnerId says', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      mockRdPartnersSE.leadPartnerId = 22;
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      expect(lastSent(patchSpy).institutions.every((p: any) => p.is_leading_result === false)).toBe(true);
    });

    it('leaves mqap_institutions and the rest of the payload as they were', () => {
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');
      const mqapBefore = mockRdPartnersSE.partnersBody.mqap_institutions;
      const tocBefore = mockRdPartnersSE.partnersBody.result_toc_result;

      component.onSaveSection();

      const sent = lastSent(patchSpy);
      expect(sent.mqap_institutions).toBe(mqapBefore);
      expect(sent.is_lead_by_partner).toBe(false);
      expect(sent.result_toc_result).toBe(tocBefore);
    });

    it('outside the 2026 phase (no Other(s) selector) the P25 payload is untouched: institutions travel as the body holds them', () => {
      mockFieldsManagerService.isContributorsPartners2026.mockReturnValue(false);
      mockRdPartnersSE.partnersBody.institutions = [{ ...tocPartner }];
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      const sent = lastSent(patchSpy);
      expect(sent.institutions).toBe(mockRdPartnersSE.partnersBody.institutions);
      expect(sent.institutions[0]).not.toHaveProperty('from_toc');
    });

    it('does not touch the non-P25 payload (institutions travel as the body holds them)', () => {
      mockFieldsManagerService.isP25.mockReturnValue(false);
      component.contributorsBody.institutions = [{ ...tocPartner }] as any;
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCHContributorsByIpsrResultId');

      component.onSaveSection();

      expect(lastSent(patchSpy).institutions).toEqual([{ ...tocPartner }]);
    });
  });
});
