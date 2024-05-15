import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationItemComponent } from './notification-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { of, throwError } from 'rxjs';

describe('NotificationItemComponent', () => {
  let component: NotificationItemComponent;
  let fixture: ComponentFixture<NotificationItemComponent>;
  let mockApiService: any;
  let mockRetrieveModalService: any;
  let mockShareRequestModalService:any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          title: '',
          submitter: '',
          result_level_id: 1,
          result_type : ''
        },
        currentNotification: '',
        showShareRequest: false
      },
      alertsFe: {
        show: jest.fn()
      },
      rolesSE: {
        platformIsClosed: false
      },
      resultsSE: {
        currentResultId: 1,
        PATCH_updateRequest: () => of({ response: {} }),
      }
    };

    mockRetrieveModalService = {
      title: '',
      requester_initiative_id: 1
    };

    mockShareRequestModalService = {
      shareRequestBody: {
        initiative_id: 1,
        official_code: '',
        short_name: '',
        result_toc_results: [],
        planned_result: ''
      }
    }

    await TestBed.configureTestingModule({
      declarations: [ NotificationItemComponent ],
      imports: [
        HttpClientTestingModule
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
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationItemComponent);
    component = fixture.componentInstance;
  });

  describe('mapAndAccept()', () => {
    it('should map and accept notification', () => {
      const notification = {
        title: 'Title',
        approving_inititiative_id: 'appInitId',
        owner_initiative_id: 'ownerInitId',
        approving_official_code: 'appCode',
        approving_short_name: 'appName',
        requester_official_code: 'reqCode',
        requester_short_name: 'reqName',
        result_type_name: 'Result Type',
        result_level_id: 'resultLevelId',
        result_id: 'resultId',
        requester_initiative_id: 'reqInitId'
      };

      component.mapAndAccept(notification);

      expect(mockApiService.dataControlSE.currentResult.title).toBe('Title');
      expect(mockApiService.dataControlSE.currentResult.submitter).toBe('reqCode - reqName');
      expect(mockRetrieveModalService.title).toBe('Title');
      expect(mockApiService.resultsSE.currentResultId).toBe('resultId');
      expect(mockApiService.dataControlSE.currentResult.result_level_id).toBe('resultLevelId');
      expect(mockApiService.dataControlSE.currentResult.result_type).toBe('Result Type');
      expect(mockApiService.dataControlSE.currentNotification).toBe(notification);
      expect(mockShareRequestModalService.shareRequestBody.initiative_id).toBe('appInitId');
      expect(mockShareRequestModalService.shareRequestBody.official_code).toBe('appCode');
      expect(mockShareRequestModalService.shareRequestBody.short_name).toBe('appName');
      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });
    it('should map and accept notification when approving_inititiative_id = owner_initiative_id and rolesSE.platformIsClosed is true', () => {
      const notification = {
        title: 'Title',
        approving_inititiative_id: 'appInitId',
        owner_initiative_id: 'appInitId',
        approving_official_code: 'appCode',
        approving_short_name: 'appName',
        requester_official_code: 'reqCode',
        requester_short_name: 'reqName',
        result_type_name: 'Result Type',
        result_level_id: 'resultLevelId',
        result_id: 'resultId',
        requester_initiative_id: 'reqInitId'
      };
      mockApiService.rolesSE.platformIsClosed = true;
      component.mapAndAccept(notification);

      expect(mockApiService.dataControlSE.currentResult.title).toBe('Title');
      expect(mockApiService.dataControlSE.currentResult.submitter).toBe('appCode - appName');
    });
  });

  describe('isSubmitted()', () => {
    it('should return false if status is 1 and request_status_id is 1', () => {
      component.notification = {
        status: 1,
        request_status_id: 1,
      };

      const result = component.isSubmitted;

      expect(result).toBeTruthy();
    });
  });

  describe('resultUrl()', () => {
    it('should generate the correct result URL', () => {
      const mockNotification = {
        result_code: 'resultCode',
        version_id:'1'
      }

      const result = component.resultUrl(mockNotification);

      expect(result).toBe(`/result/result-detail/${mockNotification.result_code}/general-information?phase=${mockNotification.version_id}`);
    });
  });

  describe('acceptOrReject()', () => {
    it('should handle success PATCH_updateRequest when response is true', () => {
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(true);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti',
        title: 'Request accepted',
        status: 'success'
      });
      expect(component.requesting).toBeFalsy();
      expect(emitSpy).toHaveBeenCalled();
    });
    it('should handle success PATCH_updateRequest when response is false', () => {
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(false);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti',
        title: 'Request rejected',
        status: 'success'
      });
      expect(component.requesting).toBeFalsy();
      expect(emitSpy).toHaveBeenCalled();
    });
    it('should not call PATCH_updateRequest when rolesSE.platformIsClosed is true', () => {
      mockApiService.rolesSE.platformIsClosed = true;
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.acceptOrReject(true);

      expect(spy).not.toHaveBeenCalled();
    });
    it('should handle errors from PATCH_updateRequest correctly', async () => {
      const errorMessage = 'error message';
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const spyPATCH_updateRequest = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest').mockReturnValue(throwError(errorMessage));
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(true);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti-error',
        title: 'Error when requesting ',
        description: '',
        status: 'error'
      });
      expect(component.requesting).toBeFalsy();
      expect(spyPATCH_updateRequest).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
