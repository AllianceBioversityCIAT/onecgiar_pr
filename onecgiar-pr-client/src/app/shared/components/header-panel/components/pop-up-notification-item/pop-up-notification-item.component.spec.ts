import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUpNotificationItemComponent } from './pop-up-notification-item.component';

describe('PopUpNotificationItemComponent', () => {
  let component: PopUpNotificationItemComponent;
  let fixture: ComponentFixture<PopUpNotificationItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopUpNotificationItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PopUpNotificationItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('generateNotificationTextUpdates', () => {
    it('should return correct text for notification_type 1', () => {
      const notification = {
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' },
        obj_result: { result_code: 'R001', title: 'Result Title' }
      };
      const result = component.generateNotificationTextUpdates(notification);
      expect(result).toBe('John Doe has submitted the result R001 - Result Title');
    });

    it('should return correct text for notification_type 2', () => {
      const notification = {
        notification_type: 2,
        obj_emitter_user: { first_name: 'Jane', last_name: 'Smith' },
        obj_result: { result_code: 'R002', title: 'Another Result' }
      };
      const result = component.generateNotificationTextUpdates(notification);
      expect(result).toBe('Jane Smith has unsubmitted the result R002 - Another Result');
    });

    it('should return correct text for other notification types', () => {
      const notification = {
        notification_type: 3,
        obj_result: { result_code: 'R003', title: 'Different Result' }
      };
      const result = component.generateNotificationTextUpdates(notification);
      expect(result).toBe('The result R003 - Different Result was successfully Quality Assessed.');
    });
  });

  describe('generateNotificationTextRequest', () => {
    it('should return correct text when is_map_to_toc is true', () => {
      const notification = {
        is_map_to_toc: true,
        obj_requested_by: { first_name: 'Alice', last_name: 'Johnson' },
        obj_result: { result_code: 'R005', title: 'Map Result' },
        obj_shared_inititiative: { official_code: 'SI003' },
        obj_owner_initiative: { official_code: 'OI003' }
      };
      const result = component.generateNotificationTextRequest(notification);
      expect(result).toBe('Alice Johnson from SI003 has requested contribution to result R005 - Map Result submitted by OI003');
    });

    it('should return correct text when is_map_to_toc is false', () => {
      const notification = {
        is_map_to_toc: false,
        obj_requested_by: { first_name: 'Bob', last_name: 'Williams' },
        obj_result: { result_code: 'R006', title: 'Non-Map Result' },
        obj_shared_inititiative: { official_code: 'SI004' },
        obj_owner_initiative: { official_code: 'OI004' }
      };
      const result = component.generateNotificationTextRequest(notification);
      expect(result).toBe('Bob Williams from OI004 has requested inclusion of SI004 as a contributor to result R006 - Non-Map Result');
    });
  });
  describe('generateUrlLink', () => {
    it('should return correct URL for notification with notification_id', () => {
      const notification = {
        notification_id: 123,
        obj_result: {
          result_code: 'R001',
          title: 'Result Title',
          obj_version: { id: 'v1' },
          obj_result_by_initiatives: [{ obj_initiative: { id: 'init1' } }]
        },
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
      };
      const result = component.generateUrlLink(notification);
      expect(result).toBe(
        'result/results-outlet/results-notifications/updates?phase=v1&init=init1&search=John Doe has submitted the result R001 - Result Title'
      );
    });

    it('should return correct URL for notification without notification_id and is_map_to_toc is true', () => {
      const notification = {
        is_map_to_toc: true,
        obj_requested_by: { first_name: 'Alice', last_name: 'Johnson' },
        obj_result: {
          result_code: 'R005',
          title: 'Map Result',
          obj_version: {
            id: 'v2'
          }
        },
        obj_shared_inititiative: { official_code: 'SI003' },
        obj_owner_initiative: { official_code: 'OI003', id: 'owner1' }
      };
      const result = component.generateUrlLink(notification);
      expect(result).toBe(
        'result/results-outlet/results-notifications/requests/received?phase=v2&init=owner1&search=Alice Johnson from SI003 has requested contribution to result R005 - Map Result submitted by OI003'
      );
    });

    it('should return correct URL for notification without notification_id and is_map_to_toc is false', () => {
      const notification = {
        is_map_to_toc: false,
        obj_requested_by: { first_name: 'Bob', last_name: 'Williams' },
        obj_result: {
          result_code: 'R006',
          title: 'Non-Map Result',
          obj_version: {
            id: 'v3'
          }
        },
        obj_shared_inititiative: { official_code: 'SI004', id: 'shared1' },
        obj_owner_initiative: { official_code: 'OI004' }
      };
      const result = component.generateUrlLink(notification);
      expect(result).toBe(
        'result/results-outlet/results-notifications/requests/received?phase=v3&init=shared1&search=Bob Williams from OI004 has requested inclusion of SI004 as a contributor to result R006 - Non-Map Result'
      );
    });
  });
});
