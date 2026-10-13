import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationItemInnovationComponent } from './notification-item-innovation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

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
    component.notification = { result_request: 'Test Request', request_status_id: 1 };
    component.api.resultsSE.PATCH_updateRequest = jest.fn().mockReturnValue(of({}));
    component.acceptOrReject(response);
    expect(component.requesting).toBe(false);
  });

  describe('PF2 mentions (S2)', () => {
    const base = {
      request_status_id: 2,
      approving_official_code: 'SP05',
      approving_name: 'Better Diets',
      requester_official_code: 'SP01',
      requester_name: 'Breeding for Tomorrow',
      result_type_name: 'Innovation package'
    };

    it('shows the label for both the approver and the requester', () => {
      component.notification = base;
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('SP05 - Better Diets requests to be added');
      expect(text).toContain('(SP01 - Breeding for Tomorrow)');
    });

    it('falls back to the code when the name is missing', () => {
      component.notification = { ...base, approving_name: null, requester_name: null };
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('SP05 requests to be added');
    });
  });
});
