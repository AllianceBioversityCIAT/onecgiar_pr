import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateNotificationComponent } from './update-notification.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { BilateralApiService } from '../../../../../../../../shared/services/api/bilateral-api.service';
import { NotificationType } from '../../../../../../../../shared/constants/notification-type.constants';
import { DECISION_URL_TIMEOUT_MS } from '../../../../../../../../shared/services/notification-navigation.service';

describe('UpdateNotificationComponent', () => {
  let component: UpdateNotificationComponent;
  let fixture: ComponentFixture<UpdateNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateNotificationComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getNotificationAction should map types 1,2,3,5 and default', () => {
    expect(component.getNotificationAction(1)).toBe('submitted');
    expect(component.getNotificationAction(2)).toBe('unsubmitted');
    expect(component.getNotificationAction(3)).toBe('Quality Assessed');
    expect(component.getNotificationAction(5)).toBe('created');
    expect(component.getNotificationAction(999)).toBe('');
  });

  it('renders the center comma attached to the result link (NDCW-R-2)', () => {
    const fresh = TestBed.createComponent(UpdateNotificationComponent);
    fresh.componentInstance.notification = {
      notification_level: 2,
      notification_id: 1,
      created_date: new Date().toISOString(),
      text: 'where your center was tagged, has been approved by the Science Program SP03.',
      obj_notification_type: { type: 'Bilateral Result Approved' },
      obj_notification_level: { notifications_level_id: 2 },
      obj_result: { result_code: 9561, title: 'T', obj_result_by_initiatives: [], obj_version: { id: 1 } }
    };
    fresh.detectChanges();
    const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
    const flat = p.textContent!.replace(/\s+/g, ' ').trim();
    expect(flat).toBe('The result 9561 - T, where your center was tagged, has been approved by the Science Program SP03.');
    expect(p.querySelector('a')!.textContent).toBe('9561 - T');
    expect(p.querySelector('a')!.nextSibling!.textContent).toMatch(/^,/);
  });

  describe('click destinations (bugfix/notification-decision-deeplinks)', () => {
    const CENTERS = { response: [{ code: '5', acronym: 'CIMMYT', is_leading_result: 1 }] };
    let bilateralApi: { GET_centersByResultId: jest.Mock };
    let router: { navigateByUrl: jest.Mock };
    let resultsNotifications: { readUpdatesNotifications: jest.Mock };
    let openSpy: jest.SpyInstance;
    let tab: { opener: unknown; location: { href: string }; close: jest.Mock };

    const build = (type: string, over: any = {}) => {
      const f = TestBed.createComponent(UpdateNotificationComponent);
      f.componentInstance.notification = {
        notification_level: 2,
        notification_id: 1,
        result_id: type === NotificationType.BILATERAL_RESULT_SUBMITTED ? 91 : 9544,
        created_date: new Date().toISOString(),
        obj_notification_type: { type },
        obj_notification_level: { notifications_level_id: 2 },
        obj_result: {
          result_code: 9544,
          title: 'T',
          obj_version: { id: 36 },
          obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP03' } }]
        },
        ...over
      } as any;
      f.detectChanges();
      const a: HTMLAnchorElement = f.nativeElement.querySelector('a');
      return { f, a };
    };
    const click = (a: HTMLAnchorElement, init: MouseEventInit = {}) => {
      const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
      a.dispatchEvent(e);
      return e;
    };

    beforeEach(() => {
      bilateralApi = { GET_centersByResultId: jest.fn().mockReturnValue(of(CENTERS)) };
      router = { navigateByUrl: jest.fn() };
      resultsNotifications = { readUpdatesNotifications: jest.fn() };
      tab = { opener: 'x', location: { href: 'about:blank' }, close: jest.fn() };
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [UpdateNotificationComponent],
        providers: [
          { provide: BilateralApiService, useValue: bilateralApi },
          { provide: Router, useValue: router },
          { provide: ResultsNotificationsService, useValue: resultsNotifications }
        ]
      });
    });

    afterEach(() => openSpy.mockRestore());

    it('review request: href is the full drawer URL and the click is not intercepted', () => {
      const { a } = build(NotificationType.BILATERAL_RESULT_SUBMITTED);
      expect(a.getAttribute('href')).toBe('/result-framework-reporting/entity-details/SP03/bilateral-review?reviewResult=9544&reviewResultId=91');
      expect(click(a).defaultPrevented).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('decision: keeps Result Detail as href, opens a tab synchronously and sets the center editor URL', () => {
      const { a } = build(NotificationType.BILATERAL_RESULT_APPROVED);
      expect(a.getAttribute('href')).toBe('/result/result-detail/9544/general-information?phase=36');

      const e = click(a);

      expect(e.defaultPrevented).toBe(true);
      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(tab.opener).toBeNull();
      expect(tab.location.href).toBe(`${window.location.origin}/bilateral/CIMMYT/result/9544?phase=36`);
    });

    it('decision: marks nothing read', () => {
      const { a, f } = build(NotificationType.BILATERAL_RESULT_REJECTED);
      click(a);
      expect(resultsNotifications.readUpdatesNotifications).not.toHaveBeenCalled();
      expect(f.componentInstance.notification.read).toBeFalsy();
    });

    it('decision: empty or failing centers lookup opens Result Detail in the tab', () => {
      for (const centers$ of [of({ response: [] }), throwError(() => new Error('boom'))]) {
        bilateralApi.GET_centersByResultId.mockReturnValue(centers$);
        const { a } = build(NotificationType.BILATERAL_RESULT_APPROVED);
        tab.location.href = 'about:blank';
        click(a);
        expect(tab.location.href).toBe(`${window.location.origin}/result/result-detail/9544/general-information?phase=36`);
      }
    });

    it('decision: a hung lookup sets the tab to Result Detail after the timeout, never blank', () => {
      jest.useFakeTimers();
      try {
        bilateralApi.GET_centersByResultId.mockReturnValue(NEVER);
        const { a } = build(NotificationType.BILATERAL_RESULT_APPROVED);
        click(a);
        expect(tab.location.href).toBe('about:blank');

        jest.advanceTimersByTime(DECISION_URL_TIMEOUT_MS + 1);

        expect(tab.location.href).toBe(`${window.location.origin}/result/result-detail/9544/general-information?phase=36`);
      } finally {
        jest.useRealTimers();
      }
    });

    it('decision: a blocked tab falls back to the current tab', () => {
      openSpy.mockReturnValue(null);
      const { a } = build(NotificationType.BILATERAL_RESULT_APPROVED);

      click(a);

      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIMMYT/result/9544?phase=36');
    });

    it('decision: ctrl-click is left to the browser (href)', () => {
      const { a } = build(NotificationType.BILATERAL_RESULT_APPROVED);
      expect(click(a, { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('other types keep their Result Detail href and are not intercepted', () => {
      const { a } = build(NotificationType.RESULT_SUBMITTED);
      expect(a.getAttribute('href')).toBe('/result/result-detail/9544/general-information?phase=36');
      expect(click(a).defaultPrevented).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });
  });
});
