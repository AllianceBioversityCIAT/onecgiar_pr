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

jest.useFakeTimers();
describe('ShareRequestModalComponent', () => {
  let component: ShareRequestModalComponent;
  let fixture: ComponentFixture<ShareRequestModalComponent>;
  let mockApiService: any;
  let mockRetrieveModalService: any;
  let mockShareRequestModalService: any;
  let mockResultsNotificationsService:any;
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
      },
      rolesSE: {
        isAdmin: true
      }
    }

    mockRetrieveModalService = {}

    mockShareRequestModalService = {
      initiative_id: undefined,
      shareRequestBody: {
        result_toc_results: []
      }
    }

    mockResultsNotificationsService = {
      get_section_information: jest.fn()
    }

    await TestBed.configureTestingModule({
      declarations: [
        ShareRequestModalComponent,
        PrButtonComponent,
        PrSelectComponent,
        LabelNamePipe,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        DialogModule,
        FormsModule,
        TooltipModule,
        ScrollingModule
      ],
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
        },
      ]
    })
      .compileComponents();

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
        },
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
        },
      ];

      const result = component.validateAcceptOrReject();

      expect(result).toBeFalsy();
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

      component.onRequest();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalledWith(mockShareRequestModalService.shareRequestBody);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'requesqshared',
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success',
      });
      expect(navigateSpy).toHaveBeenCalledWith([`/ipsr/list/innovation-list`]);
    });
    it('should set requesting to true and call POST_createRequest when api.resultsSE.ipsrDataControlSE.inIpsr is false', () => {
      mockApiService.resultsSE.ipsrDataControlSE.inIpsr = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onRequest();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalledWith(mockShareRequestModalService.shareRequestBody);
      expect(spyShow).toHaveBeenCalledWith({
        id: 'requesqshared',
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success',
      });
      expect(navigateSpy).toHaveBeenCalledWith([`/result/results-outlet/results-list`]);
    });
    it('should handle error on POST_createRequest call', () => {
      const errorMessage = {
        error:{
          message: 'error message'
        }
        };
      const spy = jest.spyOn(mockApiService.resultsSE, 'POST_createRequest')
        .mockReturnValue(throwError(errorMessage));

      component.onRequest();

      expect(spy).toHaveBeenCalledWith(mockShareRequestModalService.shareRequestBody);
      expect(component.api.dataControlSE.showShareRequest).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'requesqsharederror',
        title: 'Error when requesting',
        description: '',
        status: 'error',
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
        },
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
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success',
      });
    });
    it('should set requesting to true and call PATCH_updateRequest when api.resultsSE.ipsrDataControlSE.inIpsr is false', () => {
      mockApiService.resultsSE.ipsrDataControlSE.inIpsr = false;
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');
      const spyShow = jest.spyOn(mockApiService.alertsFe, 'show');
      const spygGet_section_information= jest.spyOn(mockResultsNotificationsService, 'get_section_information');

      component.acceptOrReject();

      expect(component.requesting).toBeFalsy();
      expect(spy).toHaveBeenCalled();
      expect(spyShow).toHaveBeenCalledWith({
        id: 'noti',
        title: `Request sent`,
        description: `Once your request is accepted, the result can be mapped to your Initiative's ToC.`,
        status: 'success',
      });
      expect(spygGet_section_information).toHaveBeenCalled();
    });
    it('should handle error on PATCH_updateRequest call', () => {
      const errorMessage = {
        error:{
          message: 'error message'
        }
        };
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest')
        .mockReturnValue(throwError(errorMessage));

      component.acceptOrReject();

      expect(spy).toHaveBeenCalled();
      expect(component.api.dataControlSE.showShareRequest).toBeFalsy();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
        id: 'noti-error',
        title: 'Error when requesting ',
        description: '',
        status: 'error',
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
});
