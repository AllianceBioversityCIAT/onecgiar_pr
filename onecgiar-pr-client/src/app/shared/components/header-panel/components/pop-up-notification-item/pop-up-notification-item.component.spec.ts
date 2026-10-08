import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { DECISION_URL_TIMEOUT_MS } from '../../../../services/notification-navigation.service';

import { PopUpNotificationItemComponent } from './pop-up-notification-item.component';
import { BilateralApiService } from '../../../../services/api/bilateral-api.service';
import { ResultsApiService } from '../../../../services/api/results-api.service';
import { NotificationType } from '../../../../constants/notification-type.constants';
import { By } from '@angular/platform-browser';
import { Directive, Input } from '@angular/core';
import { HlmTooltip } from '@spartan/tooltip';
import { BrnButton } from '@spartan-ng/brain/button';
import { ApiService } from '../../../../services/api/api.service';
import { ResultsNotificationsService } from '../../../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { acceptLabelFor } from '../../../../../pages/results/pages/results-outlet/pages/results-notifications/utils/request-decision';
import { BELL_QUICK_INBOX_COPY } from '../../../../../internationalization/bell-quick-inbox.copy';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../internationalization/contribution-request-drawer.copy';

// The shared Jest Brain stub (tests/mocks/spartanBrainMock.ts) declares BrnTooltip with no inputs, so the
// real HlmTooltip host-directive inputs raise NG0311 under Jest. Swap in a same-selector stub here.
@Directive({ selector: '[hlmTooltip]', standalone: true })
class HlmTooltipStub {
  @Input() hlmTooltip: string | undefined;
  @Input() tooltipDisabled: boolean | undefined;
}

describe('PopUpNotificationItemComponent', () => {
  let component: PopUpNotificationItemComponent;
  let fixture: ComponentFixture<PopUpNotificationItemComponent>;
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let bilateralApi: { GET_centersByResultId: jest.Mock };
  let resultsApi: { PATCH_readNotification: jest.Mock };
  let notificationsSE: { decideRequest: jest.Mock; acceptPrimaryForReview: jest.Mock; refreshBell: jest.Mock; markRequestSeen: jest.Mock };
  let apiMock: any;

  beforeEach(async () => {
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    bilateralApi = {
      GET_centersByResultId: jest.fn().mockReturnValue(of({ response: [] }))
    };
    resultsApi = { PATCH_readNotification: jest.fn().mockReturnValue(of({})) };
    notificationsSE = { decideRequest: jest.fn().mockResolvedValue(undefined), acceptPrimaryForReview: jest.fn().mockResolvedValue(undefined), refreshBell: jest.fn(), markRequestSeen: jest.fn().mockResolvedValue(true) };
    apiMock = {
      rolesSE: { isAdmin: false, platformIsClosed: false },
      alertsFe: { show: jest.fn() },
      dataControlSE: { reportingCurrentPhase: { phaseId: 'v1' }, IPSRCurrentPhase: { phaseId: 'v1' } }
    };

    await TestBed.configureTestingModule({
      imports: [PopUpNotificationItemComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: ResultsApiService, useValue: resultsApi },
        { provide: ApiService, useValue: apiMock },
        { provide: ResultsNotificationsService, useValue: notificationsSE }
      ]
    })
      .overrideComponent(PopUpNotificationItemComponent, { remove: { imports: [HlmTooltip] }, add: { imports: [HlmTooltipStub] } })
      .compileComponents();

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

    // @akili-spec bilateral/resubmit-followups — RSF-T-1 (RSF-P-8, DD-3): ownerless result -> empty rbi array.
    it.each([['an empty obj_result_by_initiatives', []], ['no obj_result_by_initiatives', undefined]])(
      'update row with %s: link omits init and still carries phase and search',
      (_label, rbi) => {
        const notification = {
          notification_id: 123,
          obj_result: { result_code: 'R001', title: 'Result Title', obj_version: { id: 'v1' }, obj_result_by_initiatives: rbi },
          notification_type: 1,
          obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
        };
        const url = component.generateUrlLink(notification);
        expect(url).not.toContain('init=');
        expect(url).not.toContain('undefined');
        expect(url).toBe('result/results-outlet/results-notifications?phase=v1&search=John Doe has submitted the result R001 - Result Title');
      }
    );

    it('update row with an empty obj_result_by_initiatives renders without a program chip and no "undefined"', () => {
      fixture = TestBed.createComponent(PopUpNotificationItemComponent);
      component = fixture.componentInstance;
      component.notification = {
        notification_id: 123,
        read: false,
        created_date: '2026-10-01T00:00:00Z',
        obj_result: { result_code: 'R001', title: 'Result Title', obj_version: { id: 'v1' }, obj_result_by_initiatives: [] },
        notification_type: 1,
        obj_emitter_user: { first_name: 'John', last_name: 'Doe' }
      };
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(fixture.nativeElement.textContent).not.toContain('undefined');
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

    // BELL-R-9 / BELL-AC-8 (BELL-T-3 attempt 2): every unread update is marked read on click, not
    // only the bilateral types. The destination stays the existing merged-inbox link, reached in-app
    // (SPA) so the read PATCH is not aborted by a full document navigation.
    describe('plain update types (BELL-R-9)', () => {
      const plainUpdate = (type: string, overrides: any = {}) => ({
        notification_id: 41,
        read: false,
        obj_notification_type: { type },
        obj_result: {
          result_code: 'R1',
          title: 'T',
          obj_version: { id: 'v1' },
          obj_result_by_initiatives: [{ obj_initiative: { id: 'i7', official_code: 'SP7' } }]
        },
        ...overrides
      });

      it.each([
        ['RESULT_QUALITY_ASSESSED', NotificationType.RESULT_QUALITY_ASSESSED],
        ['PRIMARY_PROGRAM_REQUEST_ACCEPTED', NotificationType.PRIMARY_PROGRAM_REQUEST_ACCEPTED],
        ['RESULT_SUBMITTED', NotificationType.RESULT_SUBMITTED]
      ])('%s: marks read, refreshes the bell once and keeps the existing destination', (_name, type) => {
        const emitted = jest.fn();
        component.itemSelected.subscribe(emitted);
        component.notification = plainUpdate(type);
        const expectedUrl = '/' + component.generateUrlLink(component.notification);

        const event = clickEvent();
        component.onNotificationClick(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledTimes(1);
        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(41);
        expect(notificationsSE.refreshBell).toHaveBeenCalledTimes(1);
        expect(router.navigateByUrl).toHaveBeenCalledWith(expectedUrl);
        expect(expectedUrl).toContain('results-notifications?phase=v1&init=i7');
        expect(emitted).toHaveBeenCalled();
      });

      it('legacy id-only rows (notification_type 3) are marked read too', () => {
        component.notification = {
          notification_id: 42,
          read: false,
          notification_type: 3,
          obj_result: { result_code: 'R3', title: 'T', obj_version: { id: 'v1' }, obj_result_by_initiatives: [] }
        };

        component.onNotificationClick(clickEvent());

        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(42);
        expect(notificationsSE.refreshBell).toHaveBeenCalledTimes(1);
      });

      it('an already-read update navigates without a PATCH or a refresh', () => {
        component.notification = plainUpdate(NotificationType.RESULT_SUBMITTED, { read: true });

        component.onNotificationClick(clickEvent());

        expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
        expect(notificationsSE.refreshBell).not.toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalled();
      });

      it('a failed read PATCH still navigates but does not refresh the bell', () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        resultsApi.PATCH_readNotification.mockReturnValue(throwError(() => new Error('x')));
        component.notification = plainUpdate(NotificationType.RESULT_QUALITY_ASSESSED);

        component.onNotificationClick(clickEvent());

        expect(router.navigateByUrl).toHaveBeenCalled();
        expect(notificationsSE.refreshBell).not.toHaveBeenCalled();
      });

      it('a decision row body click never decides (BRS-T-5 replaces the plain-anchor behaviour)', () => {
        component.notification = {
          kind: 'decision',
          share_result_request_id: 7,
          obj_result: { result_code: 'R9', title: 'T', obj_version: { id: 'v1' } }
        };

        component.onNotificationClick(clickEvent());

        expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
        expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
      });
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

    describe('validate-the-bilateral-result CTA', () => {
      const submitted = (initiatives: any[] = [{ obj_initiative: { official_code: 'SP03' } }]) =>
        bilateralNotification({
          kind: null,
          result_id: 91,
          obj_notification_type: { type: NotificationType.BILATERAL_RESULT_SUBMITTED },
          obj_result: { result_code: 9544, obj_version: { id: 36 }, obj_result_by_initiatives: initiatives }
        });
      const render = (row: any) => {
        fixture = TestBed.createComponent(PopUpNotificationItemComponent);
        component = fixture.componentInstance;
        component.notification = row;
        fixture.detectChanges();
      };
      const cta = () => fixture.nativeElement.querySelector('[data-testid="bell-validate-cta"]') as HTMLAnchorElement | null;

      it('submitted: renders the CTA with the review drawer URL; click navigates once, marks read once, emits once', () => {
        const emitted = jest.fn();
        fixture = TestBed.createComponent(PopUpNotificationItemComponent);
        component = fixture.componentInstance;
        component.itemSelected.subscribe(emitted);
        component.notification = submitted();
        fixture.detectChanges();

        const expected = '/result-framework-reporting/entity-details/SP03/bilateral-review?reviewResult=9544&reviewResultId=91';
        expect(cta()?.textContent?.trim()).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.validateBilateralCta);
        expect(cta()?.getAttribute('href')).toBe(expected);

        cta()!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

        expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
        expect(router.navigateByUrl).toHaveBeenCalledWith(expected);
        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledTimes(1);
        expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(55);
        expect(emitted).toHaveBeenCalledTimes(1);
      });

      it('submitted: Ctrl-click keeps the href (not prevented, no navigation, no read)', () => {
        render(submitted());
        const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
        cta()!.dispatchEvent(e);
        expect(e.defaultPrevented).toBe(false);
        expect(router.navigateByUrl).not.toHaveBeenCalled();
      });

      it('submitted without an SP code: no CTA', () => {
        render(submitted([]));
        expect(cta()).toBeNull();
      });

      it('other update types: no CTA', () => {
        render(bilateralNotification({ kind: null }));
        expect(cta()).toBeNull();
      });
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

  // WPT-T-4 (`w1w2-project-tagged`, design.md §8.2/§8.4, WPT-R-2): the bell/popup consumer loops
  // `segments` (SP09/B-A1080/ABC each in their own <b>, emitter plain) instead of lead/prefix.
  describe('WPT-T-4: Bilateral-project-tagged row segments rendering', () => {
    const enrichedProjectTaggedFixture = () => ({
      notification_id: 11,
      created_date: new Date().toISOString(),
      text: 'B-A1080 (ABC)',
      obj_emitter_user: { first_name: 'Lucia', last_name: 'Ferrari' },
      obj_notification_type: { type: NotificationType.RESULT_BILATERAL_PROJECT_TAGGED },
      obj_result: {
        result_code: 9341,
        title: '<title>',
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP09' } }],
        obj_version: { id: 1 }
      }
    });

    it('renders the SP09/B-A1080/ABC sentence, with those tokens (not the emitter) in <b>', () => {
      const fresh = TestBed.createComponent(PopUpNotificationItemComponent);
      fresh.componentInstance.notification = enrichedProjectTaggedFixture();
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('p');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe('Lucia Ferrari from SP09 has tagged the bilateral project B-A1080 from your center (ABC) to result 9341 - <title>');
      const boldTexts = Array.from(p.querySelectorAll('b')).map(b => b.textContent?.trim());
      expect(boldTexts).toEqual(['SP09', 'B-A1080', 'ABC']);
      expect(boldTexts).not.toContain('Lucia Ferrari');
    });

    it('the result identity still renders "9341 - <title>"', () => {
      const fresh = TestBed.createComponent(PopUpNotificationItemComponent);
      fresh.componentInstance.notification = enrichedProjectTaggedFixture();
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('p');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();
      expect(flat).toContain('9341 - <title>');
    });

    it('regression: a BCT composed fixture renders unchanged, with no duplicated text', () => {
      const fresh = TestBed.createComponent(PopUpNotificationItemComponent);
      fresh.componentInstance.notification = {
        ...enrichedProjectTaggedFixture(),
        text: 'created by SP01 has tagged the B-A1080 of your center (ABC). Click to see the result.'
      };
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('p');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe(
        'The result 9341 - <title> created by SP01 has tagged the B-A1080 of your center (ABC). Click to see the result.'
      );
    });
  });

  // @akili-spec notifications/bell-quick-inbox — BELL-T-3
  describe('BELL-T-3: inline decision actions', () => {
    const decisionRow = (overrides: any = {}) => ({
      kind: 'decision',
      share_result_request_id: 7,
      request_status_id: 1,
      request_type: 'contribution',
      is_map_to_toc: true,
      requested_date: '2026-10-01T00:00:00Z',
      obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
      obj_owner_initiative: { id: 1, official_code: 'SP01' },
      obj_shared_inititiative: { id: 2, official_code: 'SP02' },
      obj_result: { id: 5, result_code: 'R9', title: 'Pending', status_id: 1, obj_version: { id: 'v1' }, obj_result_type: { id: 1 } },
      ...overrides
    });
    const aiJobUpdateRow = () => ({
      kind: 'update',
      notification_id: 3,
      read: false,
      created_date: '2026-10-01T00:00:00Z',
      result_id: null,
      obj_result: null,
      text: 'AI-assisted processing finished — 1 draft ready for CIP · 2 min https://reporting.cgiar.org/bilateral/CIP/drafts',
      obj_notification_type: { type: NotificationType.BILATERAL_AI_JOB_FINISHED }
    });

    // A fresh, not-yet-checked fixture per test: the anchor [href] is computed from the row, so a row set
    // after the shared fixture first ran detectChanges would trip NG0100 (WCT/WPT suites do the same).
    beforeEach(() => {
      fixture = TestBed.createComponent(PopUpNotificationItemComponent);
      component = fixture.componentInstance;
    });

    const render = (row: any) => {
      component.notification = row;
      fixture.detectChanges();
    };
    const q = (id: string): HTMLButtonElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
    const disabledOf = (id: string) => fixture.debugElement.query(By.css(`[data-testid="${id}"]`)).injector.get(BrnButton).disabled;
    const click = (id: string) => q(id)!.click();

    // BELL-P-9 (Step 0): a received-pending row renders with the existing request text, no adapter.
    it('Step 0: a received-pending row renders the existing request text', () => {
      render(decisionRow());
      const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
      expect(text).toContain('Ana Diaz from SP02 has requested contribution');
      expect(text).toContain('R9 - Pending');
    });

    // @akili-spec bilateral/resubmit-followups — RSF-T-1 (RSF-R-1, RSF-R-2): the T-7 case.
    describe('RSF-T-1: primary request sentence', () => {
      const t7Row = (overrides: any = {}) =>
        decisionRow({
          is_map_to_toc: false,
          request_type: 'primary',
          creating_center: { acronym: 'CIAT', name: 'International Center for Tropical Agriculture' },
          obj_owner_initiative: { id: 12, official_code: 'SP12' },
          obj_shared_inititiative: { id: 12, official_code: 'SP12' },
          obj_result: { id: 9762, result_code: 9762, title: 'Some title', status_id: 1, obj_version: { id: 'v1' }, obj_result_type: { id: 1 } },
          ...overrides
        });
      const flatText = () => fixture.nativeElement.querySelector('p').textContent.replace(/\s+/g, ' ').trim();

      it('renders "CIAT has tagged SP12 as the primary Science Program of result 9762 - title" and not the contributor copy', () => {
        render(t7Row());
        const text = flatText();
        expect(text).toBe('CIAT has tagged SP12 as the primary Science Program of result 9762 - Some title');
        expect(text).not.toContain('as a contributor');
        expect(text).not.toContain('has requested inclusion');
        expect(text).not.toContain('from SP12');
      });

      it('bolds the centre and the SP code', () => {
        render(t7Row());
        const bold = Array.from(fixture.nativeElement.querySelectorAll('p b')).map((b: any) => b.textContent.trim());
        expect(bold).toEqual(['CIAT', 'SP12']);
      });

      it('falls back to the unknown-centre label, never "undefined" or "()"', () => {
        render(t7Row({ creating_center: null }));
        const text = flatText();
        expect(text).toBe('the Center has tagged SP12 as the primary Science Program of result 9762 - Some title');
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('()');
      });

      it('uses the centre name when there is no acronym', () => {
        render(t7Row({ creating_center: { name: 'Some Centre' } }));
        expect(flatText()).toContain('Some Centre has tagged SP12');
      });

      it('a contribution row keeps today text (non-map)', () => {
        render(decisionRow({ is_map_to_toc: false, request_type: 'contribution' }));
        expect(flatText()).toBe('Ana Diaz from SP01 has requested inclusion of SP02 as a contributor to result R9 - Pending');
      });

      it('the deep link search text for a primary row is the primary sentence', () => {
        const row = t7Row();
        expect(component.generateNotificationTextRequest(row)).toBe('CIAT has tagged SP12 as the primary Science Program of result 9762 - Some title');
        expect(component.generateUrlLink(row)).toContain('&search=CIAT has tagged SP12 as the primary Science Program of result 9762 - Some title');
      });

      it('omits init when the row has no initiative', () => {
        const url = component.generateUrlLink(t7Row({ obj_shared_inititiative: null }));
        expect(url).not.toContain('init=');
        expect(url).toContain('?phase=v1&search=');
      });
    });

    it('an update row renders no Accept/Decline', () => {
      render(aiJobUpdateRow());
      expect(q('bell-accept')).toBeNull();
      expect(q('bell-decline')).toBeNull();
      expect(q('bell-decision-actions')).toBeNull();
    });

    it('a decision row renders Accept and Decline', () => {
      render(decisionRow());
      expect(q('bell-accept')?.textContent?.trim()).toBe('Accept contribution');
      expect(q('bell-decline')?.textContent?.trim()).toBe(BELL_QUICK_INBOX_COPY.actions.decline);
    });

    it('a row with isDecidable=false binds disabled on both buttons (platform closed)', () => {
      apiMock.rolesSE.platformIsClosed = true;
      render(decisionRow());
      expect(disabledOf('bell-accept')).toBe(true);
      expect(disabledOf('bell-decline')).toBe(true);
    });

    it('a decidable row binds disabled=false', () => {
      render(decisionRow());
      expect(disabledOf('bell-accept')).toBe(false);
      expect(disabledOf('bell-decline')).toBe(false);
    });

    it('a not-decidable row never decides nor hands off even if the handlers run', () => {
      apiMock.rolesSE.platformIsClosed = true;
      const handoff = jest.fn();
      component.handoff.subscribe(handoff);
      render(decisionRow({ is_map_to_toc: false, request_type: 'contributor' }));
      const event = new Event('click');
      component.onAcceptClick(event);
      component.onDeclineClick(event);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
      expect(handoff).not.toHaveBeenCalled();
    });

    it('Quality Assessed rows expose the inbox tooltip text; decidable rows expose none', () => {
      component.notification = decisionRow({ obj_result: { ...decisionRow().obj_result, status_id: 2 } });
      expect(component.actionTooltip).toBe(BELL_QUICK_INBOX_COPY.qaedTooltip);
      component.notification = decisionRow();
      expect(component.actionTooltip).toBe('');
    });

    it('PRA-R-3 no confirm: a primary Review result click is busy-guarded and sends ONE accept', () => {
      let resolve!: () => void;
      notificationsSE.acceptPrimaryForReview.mockReturnValue(new Promise<void>(r => (resolve = r)));
      const row = decisionRow({ is_map_to_toc: false, request_type: 'primary' });
      render(row);

      click('bell-accept'); // decides immediately
      click('bell-accept'); // busy: ignored
      fixture.detectChanges();

      expect(notificationsSE.acceptPrimaryForReview).toHaveBeenCalledTimes(1);
      expect(notificationsSE.acceptPrimaryForReview).toHaveBeenCalledWith(row);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
      expect(disabledOf('bell-accept')).toBe(true);
      resolve();
    });

    it('BELL-T-9: Accept on a ToC-carried contribution hands off and never decides', () => {
      const handoff = jest.fn();
      component.handoff.subscribe(handoff);
      const row = decisionRow({ is_map_to_toc: true, request_type: 'contribution' });
      render(row);

      click('bell-accept');

      expect(handoff).toHaveBeenCalledTimes(1);
      expect(handoff).toHaveBeenCalledWith({ row, action: 'accept' });
      expect(notificationsSE.decideRequest).toHaveBeenCalledTimes(0);
    });

    it('Accept on a bilateral step row emits handoff and never decides', () => {
      const handoff = jest.fn();
      component.handoff.subscribe(handoff);
      const row = decisionRow({ is_map_to_toc: false, request_type: 'contributor' });
      render(row);

      click('bell-accept');

      expect(handoff).toHaveBeenCalledTimes(1);
      expect(handoff).toHaveBeenCalledWith({ row, action: 'accept' });
      expect(notificationsSE.decideRequest).toHaveBeenCalledTimes(0);
    });

    it('PRA-R-3 no Decline: a primary card renders no Decline button', () => {
      render(decisionRow({ is_map_to_toc: false, request_type: 'primary' }));
      expect(q('bell-decline')).toBeNull();
      expect(q('bell-accept')?.textContent?.trim()).toBe('Review result');
    });

    it('PRA-R-3 contribution unchanged: a contribution card still renders Decline', () => {
      render(decisionRow({ is_map_to_toc: false, request_type: 'contribution' }));
      expect(q('bell-decline')).toBeTruthy();
    });

    it('BELL-T-12: first Decline click on a contribution row arms "Confirm decline" and sends nothing (no strip)', () => {
      render(decisionRow());
      click('bell-decline');
      fixture.detectChanges();

      expect(q('bell-decline')?.textContent?.trim()).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.footer.confirmDecline);
      expect(q('bell-accept')).toBeTruthy();
      expect(q('bell-decline-confirm')).toBeNull();
      expect(q('bell-decline-cancel')).toBeNull();
      expect(q('bell-decline-confirm-strip')).toBeNull();
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('BELL-T-12: Decline second click calls decideRequest(row, false) once, even on a click while busy', () => {
      let resolve!: () => void;
      notificationsSE.decideRequest.mockReturnValue(new Promise<void>(r => (resolve = r)));
      const row = decisionRow();
      render(row);
      click('bell-decline'); // arms
      click('bell-decline'); // decides
      click('bell-decline'); // busy: ignored
      fixture.detectChanges();

      expect(notificationsSE.decideRequest).toHaveBeenCalledTimes(1);
      expect(notificationsSE.decideRequest).toHaveBeenCalledWith(row, false);
      resolve();
    });

    it('on error (non-409) the error text is visible, no navigation, and Review result is enabled again', async () => {
      notificationsSE.acceptPrimaryForReview.mockRejectedValue(new Error('boom'));
      render(decisionRow({ is_map_to_toc: false, request_type: 'primary', obj_result: { ...decisionRow().obj_result, status_id: 5 } }));

      click('bell-accept');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(q('bell-decision-error')?.textContent).toContain(BELL_QUICK_INBOX_COPY.decisionError);
      expect(disabledOf('bell-accept')).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('a failed confirmed decline shows the error and re-enables both buttons', async () => {
      notificationsSE.decideRequest.mockRejectedValue(new Error('boom'));
      render(decisionRow());
      click('bell-decline');
      fixture.detectChanges();

      click('bell-decline');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(q('bell-decision-error')).toBeTruthy();
      expect(disabledOf('bell-decline')).toBe(false);
      expect(disabledOf('bell-accept')).toBe(false);
    });

    it('a retry after an error sends a new request and clears the error', async () => {
      notificationsSE.acceptPrimaryForReview.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
      render(decisionRow({ is_map_to_toc: false, request_type: 'primary' }));
      click('bell-accept');
      await fixture.whenStable();
      fixture.detectChanges();
      click('bell-accept');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(notificationsSE.acceptPrimaryForReview).toHaveBeenCalledTimes(2);
      expect(q('bell-decision-error')).toBeNull();
    });

    it('clicking the row body navigates like today and never decides', () => {
      render(decisionRow());
      const itemSelected = jest.fn();
      component.itemSelected.subscribe(itemSelected);

      (fixture.nativeElement.querySelector('a.notification') as HTMLElement).click();

      expect(itemSelected).toHaveBeenCalled();
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('button clicks do not bubble out of the actions block (no row navigation)', () => {
      render(decisionRow());
      const itemSelected = jest.fn();
      component.itemSelected.subscribe(itemSelected);
      const hostClick = jest.fn();
      fixture.nativeElement.addEventListener('click', hostClick);

      click('bell-accept');

      expect(hostClick).not.toHaveBeenCalled();
      expect(itemSelected).not.toHaveBeenCalled();
    });

    it('clicking an unread update marks it read and refreshes the bell ONCE after the PATCH succeeds', () => {
      component.notification = aiJobUpdateRow();

      component.onNotificationClick({ preventDefault: jest.fn() } as unknown as MouseEvent);

      expect(resultsApi.PATCH_readNotification).toHaveBeenCalledWith(3);
      expect(notificationsSE.refreshBell).toHaveBeenCalledTimes(1);
    });

    it('does not refresh the bell when the read PATCH fails', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      resultsApi.PATCH_readNotification.mockReturnValue(throwError(() => new Error('x')));
      component.notification = aiJobUpdateRow();

      component.onNotificationClick({ preventDefault: jest.fn() } as unknown as MouseEvent);

      expect(notificationsSE.refreshBell).not.toHaveBeenCalled();
    });
  });

  // @akili-spec notifications/bell-quick-inbox — BELL-T-10: card layout (chips, status icon, time)
  describe('BELL-T-10: popover cards', () => {
    const copy = BELL_QUICK_INBOX_COPY;
    const decision = () => ({
      kind: 'decision',
      share_result_request_id: 7,
      request_status_id: 1,
      request_type: 'contribution',
      is_map_to_toc: true,
      requested_date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
      obj_owner_initiative: { id: 1, official_code: 'SP01' },
      obj_shared_inititiative: { id: 2, official_code: 'SP02' },
      obj_result: { id: 5, result_code: 'R9', title: 'Pending', status_id: 1, obj_version: { id: 'v1' }, obj_result_type: { id: 1 } }
    });
    const update = (type: NotificationType | null) => ({
      kind: 'update',
      notification_id: 11,
      read: false,
      created_date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      obj_notification_type: type ? { type } : undefined,
      obj_emitter_user: { first_name: 'Eva', last_name: 'Ruiz' },
      obj_result: { result_code: 'R5', title: 'Done', obj_version: { id: 'v1' }, obj_result_by_initiatives: [{ obj_initiative: { id: 3, official_code: 'SP09' } }] }
    });
    const render = (row: any) => {
      fixture = TestBed.createComponent(PopUpNotificationItemComponent);
      component = fixture.componentInstance;
      component.notification = row;
      fixture.detectChanges();
    };
    const q = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

    it('a decision card shows the program chip, a REQUIRES DECISION chip and the relative time, and no status icon', () => {
      render(decision());
      expect(q('bell-program-chip')?.textContent?.trim()).toBe('SP01');
      expect(q('bell-status-chip')?.textContent?.trim()).toBe(copy.card.requiresDecision);
      expect(q('bell-time')?.textContent?.trim()).toBe('4d ago');
      expect(q('bell-status-icon')).toBeNull();
      expect(q('bell-accept')).not.toBeNull();
    });

    it('a decision card keeps the Accept / Decline pair inside one full-width row', () => {
      render(decision());
      const row = q('bell-decision-buttons');
      expect(row?.contains(q('bell-accept'))).toBe(true);
      expect(row?.contains(q('bell-decline'))).toBe(true);
    });

    it.each([
      [NotificationType.BILATERAL_RESULT_APPROVED, 'approved', copy.card.approved],
      [NotificationType.PRIMARY_PROGRAM_REQUEST_ACCEPTED, 'approved', copy.card.approved],
      [NotificationType.RESULT_CONTRIBUTION_ACCEPTED, 'approved', copy.card.approved],
      [NotificationType.BILATERAL_RESULT_REJECTED, 'declined', copy.card.declined],
      [NotificationType.PRIMARY_PROGRAM_REQUEST_DECLINED, 'declined', copy.card.declined],
      [NotificationType.RESULT_CONTRIBUTION_DECLINED, 'declined', copy.card.declined],
      [NotificationType.RESULT_SUBMITTED, 'info', 'Submitted'],
      [null, 'info', copy.card.updateFallback]
    ])('an update of type %s renders a %s status icon and the "%s" chip, the program chip and the time', (type, status, label) => {
      render(update(type as NotificationType | null));
      expect(q('bell-status-icon')?.getAttribute('data-status')).toBe(status);
      expect(q('bell-status-chip')?.textContent?.trim()).toBe(label);
      expect(q('bell-program-chip')?.textContent?.trim()).toBe('SP09');
      expect(q('bell-time')?.textContent?.trim()).toBe('2h ago');
    });

    // RRC-T-10-F1: the bell names the SP that rejected, not the result's current primary (SP09 here).
    it('a rejection with a linked entry shows the rejecting SP in its chip and sentence, not the current primary', () => {
      render({ ...update(NotificationType.BILATERAL_RESULT_REJECTED), has_review_entry: true, review_comment: 'x', review_program_code: 'SP02' });

      expect(q('bell-program-chip')?.textContent?.trim()).toBe('SP02');
      expect(fixture.nativeElement.textContent).toContain('Science Program SP02');
      expect(fixture.nativeElement.textContent).not.toContain('Science Program SP09');
    });

    it('a rejection whose entry has no code, or a legacy rejection, keeps the current primary', () => {
      render({ ...update(NotificationType.BILATERAL_RESULT_REJECTED), has_review_entry: true, review_program_code: null });
      expect(q('bell-program-chip')?.textContent?.trim()).toBe('SP09');
      expect(fixture.nativeElement.textContent).toContain('Science Program SP09');

      render({ ...update(NotificationType.BILATERAL_RESULT_REJECTED), has_review_entry: false });
      expect(q('bell-program-chip')?.textContent?.trim()).toBe('SP09');
    });

    it('an update card has no buttons at all', () => {
      render(update(NotificationType.BILATERAL_RESULT_APPROVED));
      expect(fixture.nativeElement.querySelector('button')).toBeNull();
      expect(q('bell-decision-actions')).toBeNull();
    });
  });

  // @akili-spec notifications/bell-quick-inbox — BELL-T-11: inbox-matching labels + two-step Accept
  describe('BELL-T-11: labels and two-step Accept', () => {
    const copy = BELL_QUICK_INBOX_COPY;
    const row = (overrides: any = {}) => ({
      kind: 'decision',
      share_result_request_id: 7,
      request_status_id: 1,
      request_type: 'contribution',
      is_map_to_toc: false,
      requested_date: '2026-10-01T00:00:00Z',
      obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
      obj_owner_initiative: { id: 1, official_code: 'SP01' },
      obj_shared_inititiative: { id: 2, official_code: 'SP02' },
      obj_result: { id: 5, result_code: 'R9', title: 'Pending', status_id: 1, source_name: 'W1/W2', obj_version: { id: 'v1' }, obj_result_type: { id: 1 } },
      ...overrides
    });
    const primary = (id = 7) => row({ request_type: 'primary', share_result_request_id: id });
    const mount = (r: any) => {
      const f = TestBed.createComponent(PopUpNotificationItemComponent);
      f.componentInstance.notification = r;
      f.detectChanges();
      return f;
    };
    type Fx = ComponentFixture<PopUpNotificationItemComponent>;
    const btn = (f: Fx) => f.nativeElement.querySelector('[data-testid="bell-accept"]') as HTMLButtonElement;
    const text = (f: Fx) => btn(f).textContent!.trim();
    const hint = (f: Fx) => f.nativeElement.querySelector('[data-testid="bell-accept-hint"]') as HTMLElement | null;

    afterEach(() => jest.useRealTimers());

    it.each([
      ['bilateral contributor', row({ obj_result: { ...row().obj_result, source_name: 'W3/Bilaterals' } }), 'Accept'],
      ['W1/W2', row(), 'Accept contribution'],
      ['ToC-carried', row({ is_map_to_toc: true }), 'Accept contribution']
    ])('the %s card Accept label equals the inbox label', (_k, r, expected) => {
      const f = mount(r);
      expect(text(f)).toBe(expected);
      expect(text(f)).toBe(acceptLabelFor(r));
      expect(f.nativeElement.querySelector('[data-testid="bell-decline"]').textContent.trim()).toBe(copy.actions.decline);
    });

    it('PRA-R-3 label + chip: the primary card shows "Review result" and "Needs your review", and equals the inbox label', () => {
      const r = primary();
      const f = mount(r);
      expect(text(f)).toBe('Review result');
      expect(text(f)).toBe(acceptLabelFor(r));
      expect(f.nativeElement.querySelector('[data-testid="bell-status-chip"]').textContent.trim()).toBe('Needs your review');
      expect(f.nativeElement.querySelector('[data-testid="bell-decline"]')).toBeNull();
    });

    it('PRA-R-3 no confirm: the first click on a primary card sends the accept and never shows a confirm state', () => {
      const f = mount(primary());
      btn(f).click();
      f.detectChanges();
      expect(notificationsSE.acceptPrimaryForReview).toHaveBeenCalledTimes(1);
      expect(text(f)).toBe('Review result');
      expect(hint(f)?.textContent?.trim() ?? '').toBe('');
    });

    it('PRA-R-3 Pending Review: accept first, then navigates to the review drawer URL exactly once', async () => {
      const r: any = primary(9);
      r.obj_result = { ...r.obj_result, status_id: 5, result_code: 9640 };
      r.result_id = 9640;
      const f = mount(r);
      const order: string[] = [];
      notificationsSE.acceptPrimaryForReview.mockImplementation(async () => void order.push('accept'));
      router.navigateByUrl.mockImplementation(() => void order.push('navigate'));

      btn(f).click();
      await f.whenStable();

      expect(order).toEqual(['accept', 'navigate']);
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      const url = router.navigateByUrl.mock.calls[0][0] as string;
      expect(url).toContain('/result-framework-reporting/entity-details/SP02/bilateral-review');
      expect(url).toContain('reviewResult=9640');
      expect(url).toContain('reviewResultId=9640');
      expect(apiMock.alertsFe.show).not.toHaveBeenCalled();
    });

    it('PRA-R-3 Editing: accept, then the notify-later toast; the router is NOT called', async () => {
      const f = mount(primary()); // status_id 1
      btn(f).click();
      await f.whenStable();

      expect(notificationsSE.acceptPrimaryForReview).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(apiMock.alertsFe.show).toHaveBeenCalledTimes(1);
      expect(apiMock.alertsFe.show.mock.calls[0][0].title).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.primaryNotifyLater);
    });

    it('PRA-R-3 stale 409: the service treats 409 as success (see its spec), so a status 5 row navigates with no error shown', async () => {
      const r: any = primary();
      r.obj_result = { ...r.obj_result, status_id: 5 };
      const f = mount(r);
      notificationsSE.acceptPrimaryForReview.mockResolvedValue(undefined);
      btn(f).click();
      await f.whenStable();
      f.detectChanges();

      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      expect(f.nativeElement.querySelector('[data-testid="bell-decision-error"]')).toBeNull();
    });

    it('a contribution card: one click hands off, with no confirm state', () => {
      const r = row({ is_map_to_toc: true });
      const f = mount(r);
      const handoff = jest.fn();
      f.componentInstance.handoff.subscribe(handoff);
      btn(f).click();
      f.detectChanges();
      expect(handoff).toHaveBeenCalledTimes(1);
      expect(handoff).toHaveBeenCalledWith({ row: r, action: 'accept' });
      expect(text(f)).toBe('Accept contribution');
      expect(hint(f)?.textContent?.trim() ?? '').toBe('');
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });
  });

  describe('BELL-T-12: two-step Decline', () => {
    const copy = BELL_QUICK_INBOX_COPY;
    const confirmDecline = CONTRIBUTION_REQUEST_DRAWER_COPY.footer.confirmDecline;
    const row = (overrides: any = {}) => ({
      kind: 'decision',
      share_result_request_id: 7,
      request_status_id: 1,
      request_type: 'contribution',
      is_map_to_toc: false,
      requested_date: '2026-10-01T00:00:00Z',
      obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
      obj_owner_initiative: { id: 1, official_code: 'SP01' },
      obj_shared_inititiative: { id: 2, official_code: 'SP02' },
      obj_result: { id: 5, result_code: 'R9', title: 'Pending', status_id: 1, source_name: 'W1/W2', obj_version: { id: 'v1' }, obj_result_type: { id: 1 } },
      ...overrides
    });
    const primary = (id = 7) => row({ request_type: 'primary', share_result_request_id: id });
    const contribution = (id = 7) => row({ share_result_request_id: id });
    const mount = (r: any) => {
      const f = TestBed.createComponent(PopUpNotificationItemComponent);
      f.componentInstance.notification = r;
      f.detectChanges();
      return f;
    };
    type Fx = ComponentFixture<PopUpNotificationItemComponent>;
    const el = (f: Fx, id: string) => f.nativeElement.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement;
    const dec = (f: Fx) => el(f, 'bell-decline');
    const acc = (f: Fx) => el(f, 'bell-accept');
    const text = (b: HTMLElement) => b.textContent!.trim();
    const hint = (f: Fx) => el(f, 'bell-accept-hint');

    afterEach(() => jest.useRealTimers());

    it('the armed Decline is announced through the aria-live hint and styled as destructive outline', () => {
      const f = mount(contribution());
      dec(f).click();
      f.detectChanges();
      expect(text(dec(f))).toBe(confirmDecline);
      expect(hint(f).getAttribute('aria-live')).toBe('polite');
      expect(text(hint(f))).toBe(copy.actions.confirmHint);
      expect(dec(f).classList.contains('bell-decline--confirm')).toBe(true);
    });

    it('reverts after 5 s with 0 decide', () => {
      jest.useFakeTimers();
      const f = mount(contribution());
      dec(f).click();
      f.detectChanges();
      jest.advanceTimersByTime(4999);
      f.detectChanges();
      expect(text(dec(f))).toBe(confirmDecline);
      jest.advanceTimersByTime(1);
      f.detectChanges();
      expect(text(dec(f))).toBe(copy.actions.decline);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('Escape reverts with 0 decide', () => {
      const f = mount(contribution());
      dec(f).click();
      f.detectChanges();
      dec(f).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      f.detectChanges();
      expect(text(dec(f))).toBe(copy.actions.decline);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('focus leaving the card reverts; focus moving inside it does not', () => {
      const f = mount(contribution());
      dec(f).click();
      f.detectChanges();
      dec(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: acc(f) }));
      f.detectChanges();
      expect(text(dec(f))).toBe(confirmDecline);
      dec(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
      f.detectChanges();
      expect(text(dec(f))).toBe(copy.actions.decline);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('on one card, arming Decline disarms an armed Accept and the reverse (one armed slot)', () => {
      // A real card is never both direct-accept and inline-decline, so drive the shared slot directly.
      const f = mount(contribution());
      const comp = f.componentInstance;
      const slot = (comp as any).acceptConfirm;
      slot.enter(comp, 'accept');
      f.detectChanges();
      expect(comp.isConfirmingAccept()).toBe(true);
      dec(f).click();
      f.detectChanges();
      expect(comp.isConfirmingAccept()).toBe(false);
      expect(text(dec(f))).toBe(confirmDecline);
      slot.enter(comp, 'accept');
      f.detectChanges();
      expect(text(dec(f))).toBe(copy.actions.decline);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('arming on card B disarms card A, across Decline and Accept', () => {
      const a = mount(contribution(1));
      const b = mount(contribution(2));
      dec(a).click();
      a.detectChanges();
      expect(text(dec(a))).toBe(confirmDecline);
      dec(b).click();
      a.detectChanges();
      b.detectChanges();
      expect(text(dec(a))).toBe(copy.actions.decline);
      expect(text(dec(b))).toBe(confirmDecline);

      dec(a).click();
      a.detectChanges();
      b.detectChanges();
      expect(text(dec(b))).toBe(copy.actions.decline);
      expect(text(dec(a))).toBe(confirmDecline);
      expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
    });

    it('PRA-R-3: a primary card has no Decline at all, so nothing can hand off', () => {
      const f = mount(primary());
      expect(dec(f)).toBeNull();
    });
  });
  // @akili-spec notifications/bell-read-state — BRS-T-5: fresh / read look + request body click marks seen
  describe('BRS-T-5: read state', () => {
    const copy = BELL_QUICK_INBOX_COPY;
    const decision = (overrides: any = {}) => ({
      kind: 'decision',
      fresh: true,
      share_result_request_id: 7,
      request_status_id: 1,
      request_type: 'contribution',
      is_map_to_toc: true,
      requested_date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      obj_requested_by: { first_name: 'Ana', last_name: 'Diaz' },
      obj_owner_initiative: { id: 1, official_code: 'SP01' },
      obj_shared_inititiative: { id: 2, official_code: 'SP02' },
      obj_result: { id: 5, result_code: 'R9', title: 'Pending', status_id: 1, obj_version: { id: 'v1' }, obj_result_type: { id: 1 } },
      ...overrides
    });
    const update = (overrides: any = {}) => ({
      kind: 'update',
      fresh: true,
      notification_id: 11,
      read: false,
      created_date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      obj_notification_type: { type: NotificationType.RESULT_SUBMITTED },
      obj_emitter_user: { first_name: 'Eva', last_name: 'Ruiz' },
      obj_result: { result_code: 'R5', title: 'Done', obj_version: { id: 'v1' }, obj_result_by_initiatives: [{ obj_initiative: { id: 3, official_code: 'SP09' } }] },
      ...overrides
    });
    const render = (row: any) => {
      fixture = TestBed.createComponent(PopUpNotificationItemComponent);
      component = fixture.componentInstance;
      component.notification = row;
      fixture.detectChanges();
    };
    const q = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);
    const body = (): HTMLElement => fixture.nativeElement.querySelector('p.m-0');
    const mouse = (init: MouseEventInit = {}) => new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

    describe('look', () => {
      it('a fresh row shows the dot, bold text and "Unread" in its accessible name', () => {
        render(decision());
        expect(q('bell-unread-dot')).toBeTruthy();
        expect(q('bell-unread-dot')!.getAttribute('aria-hidden')).toBe('true');
        expect(body().className).toContain('font-bold');
        expect(body().className).not.toContain('font-normal');
        expect(q('bell-unread-label')!.textContent).toContain(copy.card.unreadRowPrefix);
        expect(fixture.nativeElement.querySelector('a.notification').textContent).toContain(copy.card.unreadRowPrefix);
      });

      it('a read row shows no dot, regular secondary text and no "Unread" label', () => {
        render(decision({ fresh: false }));
        expect(q('bell-unread-dot')).toBeNull();
        expect(q('bell-unread-label')).toBeNull();
        expect(body().className).toContain('font-normal');
        expect(body().className).toContain('text-[var(--pr-text-secondary)]');
        expect(body().className).not.toContain('font-bold');
      });

      it('the underlined result reference is black on fresh rows and inherits the dimmed colour on read rows', () => {
        for (const row of [decision(), update()]) {
          render(row);
          expect(q('bell-result-ref')!.className).toContain('underline');
          expect(q('bell-result-ref')!.className).toContain('text-[var(--pr-color-black)]');
          expect(q('bell-result-ref')!.getAttribute('style')).toBeNull();
          render({ ...row, fresh: false });
          expect(q('bell-result-ref')!.className).toContain('underline');
          expect(q('bell-result-ref')!.className).not.toContain('pr-color-black');
          expect(q('bell-result-ref')!.getAttribute('style')).toBeNull();
        }
      });

      it('the unread dot is positioned in px, not rem', () => {
        render(decision());
        expect(q('bell-unread-dot')!.className).toContain('top-[16px]');
      });

      it('a row with no `fresh` tag is treated as fresh', () => {
        render(decision({ fresh: undefined }));
        expect(q('bell-unread-dot')).toBeTruthy();
      });

      it('a read update row dims its status icon and chip; a fresh one does not', () => {
        render(update({ fresh: false }));
        expect(q('bell-status-icon')!.className).toContain('opacity-70');
        expect(q('bell-status-chip')!.className).toContain('opacity-70');
        render(update());
        expect(q('bell-status-icon')!.className).not.toContain('opacity-70');
        expect(q('bell-status-chip')!.className).not.toContain('opacity-70');
      });

      it('Requires decision chip, Accept and Decline carry identical classes in fresh and read rows, and never the read-state dimming', () => {
        const classesOf = (row: any) => {
          render(row);
          const chips = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="bell-status-chip"]')) as HTMLElement[];
          const decide = chips.find(c => c.textContent!.includes(copy.card.requiresDecision))!;
          return [decide.className, q('bell-accept')!.className, q('bell-decline')!.className];
        };
        const fresh = classesOf(decision());
        const read = classesOf(decision({ fresh: false }));
        expect(read).toEqual(fresh);
        read.forEach(c => expect(c).not.toContain('opacity-70'));
      });
    });

    describe('decision body click', () => {
      it('a plain click marks the request seen, closes the popover and navigates in-app, without deciding', () => {
        render(decision());
        const emitted = jest.fn();
        component.itemSelected.subscribe(emitted);
        const event = mouse();

        fixture.nativeElement.querySelector('a.notification').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
        expect(notificationsSE.markRequestSeen).toHaveBeenCalledWith(component.notification);
        expect(emitted).toHaveBeenCalledTimes(1);
        const expected = component.generateUrlLink(component.notification);
        expect(router.navigateByUrl).toHaveBeenCalledWith(`/${expected}`);
        expect(notificationsSE.decideRequest).not.toHaveBeenCalled();
        expect(resultsApi.PATCH_readNotification).not.toHaveBeenCalled();
      });

      it('does not wait for markRequestSeen before navigating', () => {
        notificationsSE.markRequestSeen.mockReturnValue(new Promise(() => undefined));
        render(decision());
        component.onNotificationClick(mouse());
        expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      });

      it('a failed markRequestSeen (resolves false) still navigates', () => {
        notificationsSE.markRequestSeen.mockResolvedValue(false);
        render(decision());
        component.onNotificationClick(mouse());
        expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      });

      it.each([
        ['ctrl', { ctrlKey: true }],
        ['meta', { metaKey: true }],
        ['shift', { shiftKey: true }],
        ['alt', { altKey: true }],
        ['middle button', { button: 1 }]
      ])('a %s click keeps native behaviour: no preventDefault, no seen, no navigation', (_label, init) => {
        render(decision());
        const emitted = jest.fn();
        component.itemSelected.subscribe(emitted);
        const event = mouse(init as MouseEventInit);

        component.onNotificationClick(event);

        expect(event.defaultPrevented).toBe(false);
        expect(notificationsSE.markRequestSeen).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(emitted).not.toHaveBeenCalled();
      });

      it('Accept and Decline clicks never mark the request seen', () => {
        render(decision({ is_map_to_toc: false, request_type: 'contribution' }));
        q('bell-accept')!.click();
        q('bell-decline')!.click();
        expect(notificationsSE.markRequestSeen).not.toHaveBeenCalled();
      });
    });
  });

  describe('rejection reason line (RRC-T-9, RRC-R-13)', () => {
    const render = (extra: any) => {
      // Fresh fixture per render: re-binding `notification` on the already-checked one trips NG0100 on data-kind.
      fixture = TestBed.createComponent(PopUpNotificationItemComponent);
      component = fixture.componentInstance;
      component.notification = {
        notification_id: 77,
        notification_type: 6,
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_REJECTED },
        obj_result: { result_code: 'R9', title: 'T' },
        created_date: new Date().toISOString(),
        ...extra
      };
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('[data-testid="bell-rejection-reason"]') as HTMLElement | null;
    };

    it('shows the comment for an entry with a comment', () => {
      const el = render({ has_review_entry: true, review_comment: 'Belongs to SP12' });
      expect(el?.textContent).toContain('Reason:');
      expect(el?.textContent).toContain('Belongs to SP12');
      expect(el?.className).toContain('line-clamp-2');
    });

    it('shows the fallback for an entry with an empty comment', () => {
      const el = render({ has_review_entry: true, review_comment: '' });
      expect(el?.textContent).toContain('No justification was recorded.');
    });

    it('shows no line for a legacy row', () => {
      expect(render({ has_review_entry: false, review_comment: null })).toBeNull();
      expect(render({})).toBeNull();
    });

    it('shows no line for another type', () => {
      expect(render({ obj_notification_type: { type: NotificationType.BILATERAL_RESULT_APPROVED }, has_review_entry: true, review_comment: 'x' })).toBeNull();
    });
  });
});
