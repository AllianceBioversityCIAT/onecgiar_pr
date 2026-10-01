import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { DECISION_URL_TIMEOUT_MS } from '../../../../services/notification-navigation.service';

import { PopUpNotificationItemComponent } from './pop-up-notification-item.component';
import { BilateralApiService } from '../../../../services/api/bilateral-api.service';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import { NotificationType } from '../../../../constants/notification-type.constants';

describe('PopUpNotificationItemComponent', () => {
  let component: PopUpNotificationItemComponent;
  let fixture: ComponentFixture<PopUpNotificationItemComponent>;
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let bilateralApi: { GET_centersByResultId: jest.Mock };
  let resultsApi: { PATCH_readNotification: jest.Mock };

  beforeEach(async () => {
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    bilateralApi = {
      GET_centersByResultId: jest.fn().mockReturnValue(of({ response: [] }))
    };
    resultsApi = { PATCH_readNotification: jest.fn().mockReturnValue(of({})) };

    await TestBed.configureTestingModule({
      imports: [PopUpNotificationItemComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: ResultsApiService, useValue: resultsApi }
      ]
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
      // NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): the routed `/updates` destination was retired along
      // with its route — repoints at the merged `results-notifications` base route.
      expect(result).toBe(
        'result/results-outlet/results-notifications?phase=v1&init=init1&search=John Doe has submitted the result R001 - Result Title'
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
      // NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): the routed `/requests/received` destination was
      // retired along with its route — repoints at the merged `results-notifications` base route.
      expect(result).toBe(
        'result/results-outlet/results-notifications?phase=v2&init=owner1&search=Alice Johnson from SI003 has requested contribution to result R005 - Map Result submitted by OI003'
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
      // NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): the routed `/requests/received` destination was
      // retired along with its route — repoints at the merged `results-notifications` base route.
      expect(result).toBe(
        'result/results-outlet/results-notifications?phase=v3&init=shared1&search=Bob Williams from OI004 has requested inclusion of SI004 as a contributor to result R006 - Non-Map Result'
      );
    });
  });

  // P2-3157 AC3 + AC5
  describe('onNotificationClick', () => {
    const bilateralNotification = (overrides: any = {}) => ({
      notification_id: 55,
      result_id: 77,
      read: false,
      obj_notification_type: { type: NotificationType.BILATERAL_RESULT_REJECTED },
      obj_result: {
        result_code: 'R100',
        title: 'Rejected result',
        obj_version: { id: 'v1' },
        obj_result_by_initiatives: [{ obj_initiative: { id: 'init1', official_code: 'SP5' } }]
      },
      ...overrides
    });

    const clickEvent = () => ({ preventDefault: jest.fn() }) as unknown as MouseEvent;

    it('AI job finished: navigates to its drafts in-app and marks it read', () => {
      const emitted = jest.fn();
      component.itemSelected.subscribe(emitted);
      component.notification = {
        notification_id: 9,
        read: false,
        result_id: null,
        obj_result: null,
        text: 'AI-assisted processing finished — 1 draft ready for CIP · 2 min https://reporting.cgiar.org/bilateral/CIP/drafts',
        obj_notification_type: { type: NotificationType.BILATERAL_AI_JOB_FINISHED }
      };

      expect(component.generateUrlLink(component.notification)).toBe('/bilateral/CIP/drafts');
      const event = clickEvent();
      component.onNotificationClick(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIP/drafts');
      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(9);
      expect(emitted).toHaveBeenCalled();
    });

    it('leaves a non-bilateral notification on its plain anchor navigation', () => {
      const emitted = jest.fn();
      component.itemSelected.subscribe(emitted);
      component.notification = {
        notification_id: 1,
        obj_notification_type: { type: NotificationType.RESULT_SUBMITTED },
        obj_result: { result_code: 'R1', title: 'T', obj_version: { id: 'v1' }, obj_result_by_initiatives: [] }
      };

      const event = clickEvent();
      component.onNotificationClick(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
      expect(emitted).toHaveBeenCalled();
    });

    // 2026-09-05 — "submitted for your review" goes to the SP's review queue.
    it('routes a submitted-for-review notification to the Science Program review queue', () => {
      const emitted = jest.fn();
      component.itemSelected.subscribe(emitted);
      component.notification = bilateralNotification({
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_SUBMITTED }
      });

      const event = clickEvent();
      component.onNotificationClick(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(55);
      expect(router.navigateByUrl).toHaveBeenCalledWith(
        '/result-framework-reporting/entity-details/SP5/bilateral-review?reviewResult=R100&reviewResultId=77'
      );
      expect(emitted).toHaveBeenCalled();
    });

    it('falls back to the plain anchor when the submitted notification carries no SP code', () => {
      component.notification = bilateralNotification({
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_SUBMITTED },
        obj_result: { result_code: 'R100', obj_version: { id: 'v1' }, obj_result_by_initiatives: [] }
      });

      const event = clickEvent();
      component.onNotificationClick(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('routes a bilateral decision notification to the result in the lead centre editor', () => {
      bilateralApi.GET_centersByResultId.mockReturnValue(
        of({ response: [{ code: '3', acronym: 'CIAT', is_leading_result: 1 }] })
      );
      component.notification = bilateralNotification();

      const event = clickEvent();
      component.onNotificationClick(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(bilateralApi.GET_centersByResultId).toHaveBeenCalledWith(77);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIAT/result/R100?phase=v1');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('routes result 9544 (CIMMYT lead, phase 36) to the center editor and closes the popup', () => {
      const emitted = jest.fn();
      component.itemSelected.subscribe(emitted);
      bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [{ code: '5', acronym: 'CIMMYT', is_leading_result: 1 }] }));
      component.notification = bilateralNotification({
        result_id: 9544,
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_APPROVED },
        obj_result: { result_code: 9544, obj_version: { id: 36 }, obj_result_by_initiatives: [] }
      });

      component.onNotificationClick(clickEvent());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIMMYT/result/9544?phase=36');
      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(55);
      expect(emitted).toHaveBeenCalled();
    });

    it('reaches the review drawer for result 9544 (SP03) from a review request', () => {
      const emitted = jest.fn();
      component.itemSelected.subscribe(emitted);
      component.notification = bilateralNotification({
        result_id: 91,
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_SUBMITTED },
        obj_result: { result_code: 9544, obj_version: { id: 36 }, obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP03' } }] }
      });

      component.onNotificationClick(clickEvent());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/result-framework-reporting/entity-details/SP03/bilateral-review?reviewResult=9544&reviewResultId=91');
      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(55);
      expect(emitted).toHaveBeenCalled();
    });

    it('opens Result Detail, without throwing, when the centres lookup hangs', () => {
      jest.useFakeTimers();
      try {
        const emitted = jest.fn();
        component.itemSelected.subscribe(emitted);
        bilateralApi.GET_centersByResultId.mockReturnValue(NEVER);
        component.notification = bilateralNotification();

        component.onNotificationClick(clickEvent());
        expect(router.navigateByUrl).not.toHaveBeenCalled();

        jest.advanceTimersByTime(DECISION_URL_TIMEOUT_MS + 1);

        expect(router.navigateByUrl).toHaveBeenCalledWith('/result/result-detail/R100/general-information?phase=v1');
        expect(emitted).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('marks the notification as read on click (AC5)', () => {
      component.notification = bilateralNotification();

      component.onNotificationClick(clickEvent());

      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(55);
      expect(component.notification.read).toBe(true);
    });

    it('does not re-mark an already read notification', () => {
      component.notification = bilateralNotification({ read: true });

      component.onNotificationClick(clickEvent());

      expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
    });

    it('prefers the lead centre over a contributing one', () => {
      bilateralApi.GET_centersByResultId.mockReturnValue(
        of({
          response: [
            { code: '9', acronym: 'IRRI', is_leading_result: 0 },
            { code: '3', acronym: 'CIAT', is_leading_result: 1 }
          ]
        })
      );
      component.notification = bilateralNotification();

      component.onNotificationClick(clickEvent());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIAT/result/R100?phase=v1');
    });

    it('falls back to Result Detail when no centre can be resolved', () => {
      bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [] }));
      component.notification = bilateralNotification();

      component.onNotificationClick(clickEvent());

      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/result/result-detail/R100/general-information?phase=v1');
    });

    it('falls back to the notifications list when the payload has no result code', () => {
      bilateralApi.GET_centersByResultId.mockReturnValue(of({ response: [] }));
      component.notification = bilateralNotification({ obj_result: { obj_version: { id: 'v1' }, obj_result_by_initiatives: [{ obj_initiative: { id: 'i', official_code: 'SP5' } }] } });

      component.onNotificationClick(clickEvent());

      // NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): the routed `/updates` destination was retired along
      // with its route — the fallback now points at the merged `results-notifications` base route.
      expect(router.navigateByUrl).toHaveBeenCalledWith(expect.stringContaining('results-notifications'));
    });

    // P2-3214 AC4 + AC5. Before this, these types fell through to `generateUrlLink`, which points
    // at the filtered notification LIST rather than the result the centre was tagged on.
    describe('tagged centre / bilateral project (P2-3214)', () => {
      const taggedNotification = (overrides: any = {}) => ({
        notification_id: 88,
        result_id: 99,
        read: false,
        obj_notification_type: { type: NotificationType.RESULT_CENTER_TAGGED },
        text: 'created by SP04 has tagged the Africa Rice Center. Click to see the result.',
        obj_result: {
          result_code: 'R500',
          title: 'A pooled funding result',
          obj_version: { id: 'v9' },
          obj_result_by_initiatives: []
        },
        ...overrides
      });

      it('navigates to the result detail rather than the notifications list', () => {
        component.notification = taggedNotification();

        component.onNotificationClick(clickEvent());

        expect(router.navigateByUrl).toHaveBeenCalledWith('/result/result-detail/R500/general-information?phase=v9');
        expect(router.navigateByUrl).not.toHaveBeenCalledWith(expect.stringContaining('results-notifications'));
      });

      it('routes IPSR result types to their own detail route', () => {
        component.notification = taggedNotification({
          obj_result: {
            result_code: 'R900',
            obj_version: { id: 'v9' },
            obj_result_type: { id: 10 },
            obj_result_by_initiatives: []
          }
        });

        component.onNotificationClick(clickEvent());

        expect(router.navigateByUrl).toHaveBeenCalledWith('/ipsr/detail/R900/general-information?phase=v9');
      });

      it('marks the notification as read on the way out (AC5)', () => {
        component.notification = taggedNotification();

        component.onNotificationClick(clickEvent());

        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(88);
      });

      it('does not re-mark an already read notification', () => {
        component.notification = taggedNotification({ read: true });

        component.onNotificationClick(clickEvent());

        expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
      });

      it('keeps the plain anchor behaviour when the result has no code', () => {
        component.notification = taggedNotification({ obj_result: { obj_version: { id: 'v9' } } });

        component.onNotificationClick(clickEvent());

        expect(router.navigateByUrl).not.toHaveBeenCalled();
      });

      it('does not go through the bilateral centre lookup', () => {
        component.notification = taggedNotification();

        component.onNotificationClick(clickEvent());

        expect(bilateralApi.GET_centersByResultId).not.toHaveBeenCalled();
      });
    });

    it('falls back to Result Detail when the centre lookup fails', () => {
      bilateralApi.GET_centersByResultId.mockReturnValue(throwError(() => new Error('boom')));
      component.notification = bilateralNotification();

      component.onNotificationClick(clickEvent());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/result/result-detail/R100/general-information?phase=v1');
    });
  });

  // WCT-T-5 (`w1w2-center-tagged`, design.md §8.2, WCT-R-5): the bell/popup consumer renders `lead`
  // (owner SP code) in `<b>` right before the prefix sentence for a bare direct-tag row.
  describe('WCT-T-5: Center-tagged row lead rendering', () => {
    const bareCenterTaggedFixture = () => ({
      notification_id: 1,
      created_date: new Date().toISOString(),
      text: 'ABC',
      obj_notification_type: { type: NotificationType.RESULT_CENTER_TAGGED },
      obj_result: {
        result_code: 9398,
        title: 'A pooled funding result',
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }],
        obj_version: { id: 1 }
      }
    });

    it('renders the bare SP01/ABC/9398 sentence with SP01 emphasized in <b>', () => {
      const fresh = TestBed.createComponent(PopUpNotificationItemComponent);
      fresh.componentInstance.notification = bareCenterTaggedFixture();
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('p');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe('SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - A pooled funding result');
      const boldTexts = Array.from(p.querySelectorAll('b')).map(b => b.textContent?.trim());
      expect(boldTexts).toContain('SP01');
    });

    it('a legacy composed fixture renders as it does today (no lead)', () => {
      const fresh = TestBed.createComponent(PopUpNotificationItemComponent);
      fresh.componentInstance.notification = {
        ...bareCenterTaggedFixture(),
        text: 'created by SP01 has tagged the International Center X. Click to see the result.'
      };
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('p');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe(
        'The result 9398 - A pooled funding result created by SP01 has tagged the International Center X. Click to see the result.'
      );
    });
  });
});
