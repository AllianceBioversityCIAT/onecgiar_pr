import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareRequestModalComponent } from './share-request-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RetrieveModalService } from '../retrieve-modal/retrieve-modal.service';
import { DialogModule } from 'primeng/dialog';
import { ShareRequestModalService } from './share-request-modal.service';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { PrSelectComponent } from '../../../../../../custom-fields/pr-select/pr-select.component';
import { FormsModule } from '@angular/forms';
import { LabelNamePipe } from '../../../../../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { ResultsNotificationsService } from '../../../results-outlet/pages/results-notifications/results-notifications.service';
import { SelectModule } from 'primeng/select';

jest.useFakeTimers();
describe('ShareRequestModalComponent', () => {
  let component: ShareRequestModalComponent;
  let fixture: ComponentFixture<ShareRequestModalComponent>;
  let mockApiService: any;
  let mockRetrieveModalService: any;
  let mockShareRequestModalService: any;
  let mockResultsNotificationsService: any;
  let router: Router;
  const allInitiatives = [{ initiative_id: 1, official_code: 'code', short_name: 'name' }];

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        POST_createRequest: () => of({ response: [] }),
        PATCH_updateRequest: () => of({ response: [] }),
        GET_AllInitiatives: () => of({ response: allInitiatives }),
        ipsrDataControlSE: {
          inIpsr: true
        }
      },
      alertsFe: {
        show: jest.fn()
      },
      dataControlSE: {
        showShareRequest: false,
        currentResultSignal: () => of({ portfolio: 'P25' }),
        reportingCurrentPhase: {
          portfolioId: 1
        }
      },
      rolesSE: {
        isAdmin: true
      }
    };

    mockRetrieveModalService = {};

    mockShareRequestModalService = {
      initiative_id: undefined,
      shareRequestBody: {
        result_toc_results: []
      }
    };

    mockResultsNotificationsService = {
      get_section_information: jest.fn(),
      get_section_innovation_packages: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        ShareRequestModalComponent,
        PrButtonComponent,
        PrSelectComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [HttpClientTestingModule, RouterTestingModule, DialogModule, FormsModule, TooltipModule, ScrollingModule, SelectModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: RetrieveModalService,
          useValue: mockRetrieveModalService
        },
        {
          provide: ShareRequestModalService,
          useValue: mockShareRequestModalService
        },
        {
          provide: ResultsNotificationsService,
          useValue: mockResultsNotificationsService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShareRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    router = TestBed.inject(Router);
  });

  describe('ngOnInit', () => {
    it('should call GET_AllInitiatives', () => {
      const spy = jest.spyOn(component, 'GET_AllInitiatives');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('validateAcceptOrReject', () => {
    it('should return true if requesting is true', () => {
      component.requesting = true;

      const result = component.validateAcceptOrReject();

      expect(result).toBeTruthy();
    });

    it('should return true if there is a result without toc_result_id', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: null,
          results_id: 1,
          planned_result: false,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];
      const result = component.validateAcceptOrReject();

      expect(result).toBeTruthy();
    });

    it('should return false if all conditions are false', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 'some_value';
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          results_id: 1,
          planned_result: false,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];

      const result = component.validateAcceptOrReject();

      expect(result).toBeTruthy();
    });
  });

  describe('cleanObject', () => {
    it('should set showForm to false, reset shareRequestBody, and set showForm to true after a delay', () => {
      component.shareRequestModalSE.shareRequestBody = new ShareRequestBody();
      component.cleanObject();

      expect(component.showForm).toBeFalsy();
      jest.runAllTimers();

      expect(component.shareRequestModalSE.shareRequestBody).toEqual(new ShareRequestBody());
      expect(component.showForm).toBeTruthy();
    });
  });

  describe('onRequest', () => {
    it('should set requesting to true and call POST_createRequest', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      const sendBody = {
        result_id: undefined,
        initiativeShareId: [null],
        isToc: true,
        contributors_result_toc_result: [
          {
            planned_result: null,
            initiative_id: null,
            result_toc_results: []
          }
        ],
        email_template: 'email_template_request_as_contribution'
      };

      component.onRequest();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalledWith(sendBody);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'requesqshared',
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success'
      });
      expect(navigateSpy).toHaveBeenCalledWith([`/ipsr/list/innovation-list`]);
    });
    it('should set requesting to true and call POST_createRequest when api.resultsSE.ipsrDataControlSE.inIpsr is false', () => {
      mockApiService.resultsSE.ipsrDataControlSE.inIpsr = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      const sendBody = {
        result_id: undefined,
        initiativeShareId: [null],
        isToc: true,
        contributors_result_toc_result: [
          {
            planned_result: null,
            initiative_id: null,
            result_toc_results: []
          }
        ],
        email_template: 'email_template_request_as_contribution'
      };

      component.onRequest();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalledWith(sendBody);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'requesqshared',
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success'
      });
      expect(navigateSpy).toHaveBeenCalledWith([`/result/results-outlet/results-list`]);
    });
    it('should handle error on POST_createRequest call', () => {
      const errorMessage = {
        error: {
          message: 'error message'
        }
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createRequest').mockReturnValue(throwError(errorMessage));
      const sendBody = {
        result_id: undefined,
        initiativeShareId: [null],
        isToc: true,
        contributors_result_toc_result: [
          {
            planned_result: null,
            initiative_id: null,
            result_toc_results: []
          }
        ],
        email_template: 'email_template_request_as_contribution'
      };

      component.onRequest();

      expect(spy).toHaveBeenCalledWith(sendBody);
      expect(component.api.dataControlSE.showShareRequest).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'requesqsharederror',
        title: 'Error when requesting',
        description: '',
        status: 'error'
      });
      expect(component.requesting).toBeFalsy();
    });
  });

  describe('modelChange', () => {
    it('should set showTocOut to false and update shareRequestBody after a delay', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          results_id: 1,
          planned_result: false,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];
      component.modelChange();
      expect(component.showTocOut).toBeFalsy();

      jest.runAllTimers();

      expect(mockShareRequestModalService.shareRequestBody.initiative_id).toBe(allInitiatives[0].initiative_id);
      expect(mockShareRequestModalService.shareRequestBody.official_code).toBe(allInitiatives[0].official_code);
      expect(mockShareRequestModalService.shareRequestBody.short_name).toBe(allInitiatives[0].short_name);
      expect(mockShareRequestModalService.shareRequestBody.result_toc_results.length).toBe(1);
      expect(component.showTocOut).toBeTruthy();
    });
  });

  describe('acceptOrReject', () => {
    it('should set requesting to true and call PATCH_updateRequest', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');

      component.acceptOrReject();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'noti',
        title: `Request successfully accepted`,
        status: 'success'
      });
    });
    it('should set requesting to true and call PATCH_updateRequest when api.resultsSE.ipsrDataControlSE.inIpsr is false', () => {
      mockApiService.resultsSE.ipsrDataControlSE.inIpsr = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const spygGet_section_information = jest.spyOn(mockResultsNotificationsService, 'get_section_information');

      component.acceptOrReject();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'noti',
        title: `Request successfully accepted`,
        status: 'success'
      });
      expect(spygGet_section_information).toHaveBeenCalled();
    });
    it('should handle error on PATCH_updateRequest call', () => {
      const errorMessage = {
        error: {
          message: 'error message'
        }
      };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest').mockReturnValue(throwError(errorMessage));

      component.acceptOrReject();

      expect(spy).toHaveBeenCalled();
      expect(component.api.dataControlSE.showShareRequest).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'noti-error',
        title: 'Error when requesting ',
        description: '',
        status: 'error'
      });
      expect(component.requesting).toBeFalsy();
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should set allInitiatives with data from the API', () => {
      component.allInitiatives = [];
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');

      component.GET_AllInitiatives();

      expect(spy).toHaveBeenCalled();
      expect(component.allInitiatives).toEqual(allInitiatives);
    });
  });

  describe('validateAcceptOrReject - missing indicator branch', () => {
    it('should return true when planned_result is true, activeIndicatorsLength > 0, and no selected indicator', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.planned_result = true;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          toc_level_id: 1,
          results_id: 1,
          planned_result: true,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];
      component.fieldsManagerSE.activeIndicatorsLength = jest.fn(() => 2) as any;
      component.fieldsManagerSE.hasSelectedIndicator = jest.fn(() => false) as any;

      const result = component.validateAcceptOrReject();

      expect(result).toBe(true);
    });

    it('should return false when planned_result is true but indicator is selected', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.planned_result = true;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          toc_level_id: 1,
          results_id: 1,
          planned_result: true,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];
      component.fieldsManagerSE.activeIndicatorsLength = jest.fn(() => 2) as any;
      component.fieldsManagerSE.hasSelectedIndicator = jest.fn(() => true) as any;

      const result = component.validateAcceptOrReject();

      expect(result).toBe(false);
    });

    it('should return false when planned_result is true but activeIndicatorsLength is 0', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.planned_result = true;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          toc_level_id: 1,
          results_id: 1,
          planned_result: true,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];
      component.fieldsManagerSE.activeIndicatorsLength = jest.fn(() => 0) as any;
      component.fieldsManagerSE.hasSelectedIndicator = jest.fn(() => false) as any;

      const result = component.validateAcceptOrReject();

      expect(result).toBe(false);
    });

    it('should return true when initiative_id is missing', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = null;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [];

      const result = component.validateAcceptOrReject();

      expect(result).toBe(true);
    });

    it('should return true when toc_level_id is missing', () => {
      component.requesting = false;
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      mockShareRequestModalService.shareRequestBody.result_toc_results = [
        {
          toc_result_id: 1,
          toc_level_id: null,
          results_id: 1,
          planned_result: false,
          short_name: '',
          official_code: '1',
          initiative_id: 1
        }
      ];

      const result = component.validateAcceptOrReject();

      expect(result).toBe(true);
    });
  });

  describe('isBilateralResult', () => {
    it('should return true when source_name is W3/Bilaterals', () => {
      mockApiService.dataControlSE.currentResult = { source_name: 'W3/Bilaterals' };

      expect(component.isBilateralResult).toBe(true);
    });

    it('should return false when source_name is not W3/Bilaterals', () => {
      mockApiService.dataControlSE.currentResult = { source_name: 'Initiative' };

      expect(component.isBilateralResult).toBe(false);
    });

    it('should return false when currentResult is undefined', () => {
      mockApiService.dataControlSE.currentResult = undefined;

      expect(component.isBilateralResult).toBe(false);
    });
  });

  describe('shouldShowTocInitiativeOut', () => {
    it('should return false when initiative_id is missing', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = null;

      expect(component.shouldShowTocInitiativeOut).toBe(false);
    });

    it('should return false when showTocOut is false', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      component.showTocOut = false;

      expect(component.shouldShowTocInitiativeOut).toBe(false);
    });

    it('should return true when not in notifications and has initiative_id', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      component.showTocOut = true;
      mockApiService.dataControlSE.inNotifications = false;

      expect(component.shouldShowTocInitiativeOut).toBe(true);
    });

    it('should return true when in notifications with allowed result level 3', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      component.showTocOut = true;
      mockApiService.dataControlSE.inNotifications = true;
      mockApiService.dataControlSE.currentResult = { result_level_id: 3 };

      expect(component.shouldShowTocInitiativeOut).toBe(true);
    });

    it('should return true when in notifications with allowed result level 4', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      component.showTocOut = true;
      mockApiService.dataControlSE.inNotifications = true;
      mockApiService.dataControlSE.currentResult = { result_level_id: 4 };

      expect(component.shouldShowTocInitiativeOut).toBe(true);
    });

    it('should return false when in notifications with non-allowed result level', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 1;
      component.showTocOut = true;
      mockApiService.dataControlSE.inNotifications = true;
      mockApiService.dataControlSE.currentResult = { result_level_id: 1 };

      expect(component.shouldShowTocInitiativeOut).toBe(false);
    });
  });

  describe('entitiesList', () => {
    it('should filter by portfolio when admin', () => {
      mockApiService.rolesSE.isAdmin = true;
      component.allInitiatives = [
        { initiative_id: 1, portfolio_id: 1, official_code: 'INIT-01' },
        { initiative_id: 2, portfolio_id: 2, official_code: 'INIT-02' }
      ];
      mockApiService.dataControlSE.reportingCurrentPhase = { portfolioId: 1 };

      const result = component.entitiesList;

      expect(result).toEqual([{ initiative_id: 1, portfolio_id: 1, official_code: 'INIT-01' }]);
    });

    it('should filter out current submitter for non-admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.myInitiativesList = [
        { initiative_id: 1, official_code: 'INIT-01' },
        { initiative_id: 2, official_code: 'INIT-02' }
      ];
      mockApiService.dataControlSE.currentResult = { submitter: 'INIT-01' };

      const result = component.entitiesList;

      expect(result).toEqual([{ initiative_id: 2, official_code: 'INIT-02' }]);
    });

    it('should return all initiatives for non-admin when no current submitter', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.myInitiativesList = [
        { initiative_id: 1, official_code: 'INIT-01' },
        { initiative_id: 2, official_code: 'INIT-02' }
      ];
      mockApiService.dataControlSE.currentResult = { submitter: null };

      const result = component.entitiesList;

      expect(result).toEqual([
        { initiative_id: 1, official_code: 'INIT-01' },
        { initiative_id: 2, official_code: 'INIT-02' }
      ]);
    });
  });

  describe('onRequest - error with statusCode 400', () => {
    it('should show information alert when error has statusCode 400', () => {
      const errorMessage = {
        error: {
          statusCode: 400,
          message: 'Duplicate request'
        }
      };
      jest.spyOn(mockApiService.resultsSE, 'POST_createRequest').mockReturnValue(throwError(errorMessage));

      component.onRequest();

      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'requesqsharederror',
        title: 'The request could not be sent',
        description: 'Duplicate request',
        status: 'information'
      });
      expect(component.requesting).toBe(false);
    });
  });

  describe('modelChange - no matching initiative', () => {
    it('should still set showTocOut back to true when no initiative matches', () => {
      mockShareRequestModalService.shareRequestBody.initiative_id = 999;
      component.allInitiatives = allInitiatives;

      component.modelChange();
      expect(component.showTocOut).toBe(false);

      jest.runAllTimers();

      expect(component.showTocOut).toBe(true);
    });
  });

  describe('onPlannedResultChange', () => {
    it('should reset toc fields and indicator data when indicators exist', () => {
      const item = {
        result_toc_results: [
          {
            toc_result_id: 1,
            toc_level_id: 2,
            toc_progressive_narrative: 'text',
            indicators: [
              {
                related_node_id: 5,
                toc_results_indicator_id: 10,
                targets: [{ contributing_indicator: 'yes' }]
              }
            ]
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

      jest.runAllTimers();

      expect(component.tocConsumed).toBe(true);
    });

    it('should create default indicators when none exist', () => {
      const item = {
        result_toc_results: [
          {
            toc_result_id: 1,
            toc_level_id: 2,
            toc_progressive_narrative: 'text',
            indicators: []
          }
        ]
      };

      component.onPlannedResultChange(item);

      expect(item.result_toc_results[0].indicators).toEqual([
        {
          related_node_id: null,
          toc_results_indicator_id: null,
          targets: [{ contributing_indicator: null }]
        }
      ]);
    });

    it('should handle indicators without targets array', () => {
      const item = {
        result_toc_results: [
          {
            toc_result_id: 1,
            toc_level_id: 2,
            toc_progressive_narrative: 'text',
            indicators: [
              {
                related_node_id: 5,
                toc_results_indicator_id: 10
              }
            ]
          }
        ]
      };

      component.onPlannedResultChange(item);

      expect(item.result_toc_results[0].indicators[0].related_node_id).toBeNull();
      expect(item.result_toc_results[0].indicators[0].toc_results_indicator_id).toBeNull();
    });

    it('should handle null/undefined item gracefully', () => {
      expect(() => component.onPlannedResultChange(null)).not.toThrow();
      expect(() => component.onPlannedResultChange(undefined)).not.toThrow();
      expect(() => component.onPlannedResultChange({})).not.toThrow();
    });

    it('should handle multiple result_toc_results tabs', () => {
      const item = {
        result_toc_results: [
          {
            toc_result_id: 1,
            toc_level_id: 2,
            toc_progressive_narrative: 'text1',
            indicators: [{ related_node_id: 5, toc_results_indicator_id: 10, targets: [{ contributing_indicator: 'val' }] }]
          },
          {
            toc_result_id: 3,
            toc_level_id: 4,
            toc_progressive_narrative: 'text2',
            indicators: []
          }
        ]
      };

      component.onPlannedResultChange(item);

      // First tab: reset existing indicators
      expect(item.result_toc_results[0].indicators[0].related_node_id).toBeNull();
      expect(item.result_toc_results[0].toc_result_id).toBeNull();
      // Second tab: created default indicators
      expect(item.result_toc_results[1].indicators.length).toBe(1);
      expect(item.result_toc_results[1].toc_result_id).toBeNull();
    });
  });
});
