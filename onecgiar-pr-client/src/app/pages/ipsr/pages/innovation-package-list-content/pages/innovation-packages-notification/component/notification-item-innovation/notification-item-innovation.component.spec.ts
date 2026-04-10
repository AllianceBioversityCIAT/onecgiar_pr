import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationItemInnovationComponent } from './notification-item-innovation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('NotificationItemInnovationComponent', () => {
  let component: NotificationItemInnovationComponent;
  let fixture: ComponentFixture<NotificationItemInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationItemInnovationComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationItemInnovationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map and accept notification', () => {
    component.requesting = false;
    component.api.rolesSE.platformIsClosed = false;

    const notification = {
      title: 'Test Title',
      approving_inititiative_id: 1,
      owner_initiative_id: 1,
      approving_official_code: 'Test Code',
      approving_short_name: 'Test Name',
      requester_official_code: 'Test Code',
      requester_short_name: 'Test Name',
      result_type_name: 'Test Result Type',
      result_level_id: 1,
      requester_initiative_id: 1,
      status_id: 1,
      request_status_id: 2,
      version_status: true
    };
    component.notification = notification;

    component.mapAndAccept(notification);

    expect(component.api.dataControlSE.currentResult.title).toEqual('Test Title');
  });

  it('should check if notification is QAed', () => {
    component.notification = { status_id: 2, request_status_id: 1 };
    expect(component.isQAed).toBeTruthy();
  });

  it('should generate result URL', () => {
    const notification = { result_code: 'Test Code', version_id: 'Test Version' };
    const url = component.resultUrl(notification);
    expect(url).toEqual('/ipsr/detail/Test Code/general-information?phase=Test Version');
  });

  it('should accept or reject request', () => {
    const response = true;
    component.notification = { result_request: 'Test Request', request_status_id: 1, version_status: true };
    component.api.resultsSE.PATCH_updateRequest = jest.fn().mockReturnValue(of({}));
    component.acceptOrReject(response);
    expect(component.requesting).toBe(false);
  });

  describe('mapAndAccept guard conditions', () => {
    it('should return null when requesting is true', () => {
      component.requesting = true;
      component.notification = { version_status: true };
      const result = component.mapAndAccept({});
      expect(result).toBeNull();
    });

    it('should return null when platformIsClosed is true', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = true;
      component.notification = { version_status: true };
      const result = component.mapAndAccept({});
      expect(result).toBeNull();
    });

    it('should return null when isQAed is true', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 2, request_status_id: 1, version_status: true };
      const result = component.mapAndAccept({});
      expect(result).toBeNull();
    });

    it('should return null when version_status is falsy', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 1, request_status_id: 2, version_status: false };
      const result = component.mapAndAccept({});
      expect(result).toBeNull();
    });
  });

  describe('mapAndAccept submitter branch', () => {
    it('should set submitter using requester codes when approving_inititiative_id !== owner_initiative_id', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      const notification = {
        title: 'Test',
        approving_inititiative_id: 1,
        owner_initiative_id: 2,
        approving_official_code: 'Approving Code',
        approving_short_name: 'Approving Name',
        requester_official_code: 'Requester Code',
        requester_short_name: 'Requester Name',
        result_type_name: 'Type',
        result_level_id: 1,
        result_id: 10,
        requester_initiative_id: 3,
        status_id: 1,
        request_status_id: 2,
        version_status: true
      };
      component.notification = notification;
      component.mapAndAccept(notification);
      expect(component.api.dataControlSE.currentResult.submitter).toBe('Requester Code - Requester Name');
    });

    it('should set submitter using approving codes when approving_inititiative_id === owner_initiative_id', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      const notification = {
        title: 'Test',
        approving_inititiative_id: 1,
        owner_initiative_id: 1,
        approving_official_code: 'Approving Code',
        approving_short_name: 'Approving Name',
        requester_official_code: 'Requester Code',
        requester_short_name: 'Requester Name',
        result_type_name: 'Type',
        result_level_id: 1,
        result_id: 10,
        requester_initiative_id: 3,
        status_id: 1,
        request_status_id: 2,
        version_status: true
      };
      component.notification = notification;
      component.mapAndAccept(notification);
      expect(component.api.dataControlSE.currentResult.submitter).toBe('Approving Code - Approving Name');
    });
  });

  describe('acceptOrReject guard conditions', () => {
    it('should return early when requesting is true', () => {
      component.requesting = true;
      component.notification = { version_status: true };
      const spy = jest.spyOn(component.api.resultsSE, 'PATCH_updateRequest').mockReturnValue(of({}));
      component.acceptOrReject(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early when platformIsClosed is true', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = true;
      component.notification = { version_status: true };
      const spy = jest.spyOn(component.api.resultsSE, 'PATCH_updateRequest').mockReturnValue(of({}));
      component.acceptOrReject(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early when isQAed is true', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 2, request_status_id: 1, version_status: true };
      const spy = jest.spyOn(component.api.resultsSE, 'PATCH_updateRequest').mockReturnValue(of({}));
      component.acceptOrReject(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should return early when version_status is falsy', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 1, request_status_id: 2, version_status: null };
      const spy = jest.spyOn(component.api.resultsSE, 'PATCH_updateRequest').mockReturnValue(of({}));
      component.acceptOrReject(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle reject (response=false) and show reject alert', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 1, request_status_id: 2, version_status: true };
      component.api.resultsSE.PATCH_updateRequest = jest.fn().mockReturnValue(of({}));
      const showSpy = jest.spyOn(component.api.alertsFe, 'show');

      component.acceptOrReject(false);

      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Request rejected' })
      );
    });

    it('should handle error on acceptOrReject', () => {
      component.requesting = false;
      component.api.rolesSE.platformIsClosed = false;
      component.notification = { status_id: 1, request_status_id: 2, version_status: true };
      component.api.resultsSE.PATCH_updateRequest = jest.fn().mockReturnValue(throwError(() => new Error('fail')));
      const showSpy = jest.spyOn(component.api.alertsFe, 'show');

      component.acceptOrReject(true);

      expect(component.requesting).toBe(false);
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'noti-error', status: 'error' })
      );
    });
  });

  describe('isQAed', () => {
    it('should return false when status_id is not 2', () => {
      component.notification = { status_id: 1, request_status_id: 1 };
      expect(component.isQAed).toBeFalsy();
    });

    it('should return false when request_status_id is not 1', () => {
      component.notification = { status_id: 2, request_status_id: 2 };
      expect(component.isQAed).toBeFalsy();
    });
  });
});
