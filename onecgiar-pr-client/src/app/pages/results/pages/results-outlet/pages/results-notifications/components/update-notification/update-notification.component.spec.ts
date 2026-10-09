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

    it('AI job finished: shows the server sentence and a View link, never "The result -"', () => {
      const { f } = build(NotificationType.BILATERAL_AI_JOB_FINISHED, {
        result_id: null,
        obj_result: null,
        text: 'AI-assisted processing finished — 1 draft ready for CIP · 1 PDF · 2 min https://reporting.cgiar.org/bilateral/CIP/drafts'
      });
      const body: HTMLElement = f.nativeElement.querySelector('.update_notification_content_body_text');
      expect(body.textContent).toContain('AI-assisted processing finished — 1 draft ready for CIP');
      expect(body.textContent).not.toContain('The result');
      expect(body.textContent).not.toMatch(/\s-\s*$/);
      const link: HTMLAnchorElement = body.querySelector('a')!;
      expect(link.getAttribute('href')).toBe('/bilateral/CIP/drafts');
      click(link);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/bilateral/CIP/drafts');
    });

    it('review request: href is the full drawer URL and the click is not intercepted', () => {
      const { a } = build(NotificationType.BILATERAL_RESULT_SUBMITTED);
      expect(a.getAttribute('href')).toBe('/result-framework-reporting/entity-details/SP03/bilateral-review?reviewResult=9544&reviewResultId=91');
      expect(click(a).defaultPrevented).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('review request: the CTA renders with the drawer URL and navigates in-app once', () => {
      const { f } = build(NotificationType.BILATERAL_RESULT_SUBMITTED);
      const cta: HTMLAnchorElement = f.nativeElement.querySelector('[data-testid="update-validate-cta"]');
      const expected = '/result-framework-reporting/entity-details/SP03/bilateral-review?reviewResult=9544&reviewResultId=91';

      expect(cta.textContent?.trim()).toBe('Click here to validate the bilateral result');
      expect(cta.getAttribute('href')).toBe(expected);
      expect(click(cta).defaultPrevented).toBe(true);
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).toHaveBeenCalledWith(expected);
    });

    it('review request: Ctrl-click on the CTA keeps the href (not prevented, no navigation)', () => {
      const { f } = build(NotificationType.BILATERAL_RESULT_SUBMITTED);
      const cta: HTMLAnchorElement = f.nativeElement.querySelector('[data-testid="update-validate-cta"]');
      expect(click(cta, { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('review request without an SP code: no CTA', () => {
      const { f } = build(NotificationType.BILATERAL_RESULT_SUBMITTED, {
        obj_result: { result_code: 9544, title: 'T', obj_version: { id: 36 }, obj_result_by_initiatives: [] }
      });
      expect(f.nativeElement.querySelector('[data-testid="update-validate-cta"]')).toBeNull();
    });

    it('other types: no CTA', () => {
      const { f } = build(NotificationType.BILATERAL_RESULT_APPROVED);
      expect(f.nativeElement.querySelector('[data-testid="update-validate-cta"]')).toBeNull();
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

  // WCT-T-5 (`w1w2-center-tagged`, design.md §8.2, WCT-R-5): the bare-shape direct-tag row renders
  // `lead` (owner SP code) in `<b>` right before the prefix sentence.
  describe('WCT-T-5: Center-tagged row lead rendering', () => {
    const bareCenterTaggedFixture = () => ({
      notification_level: 2,
      notification_id: 1,
      created_date: new Date().toISOString(),
      text: 'ABC',
      obj_notification_type: { type: NotificationType.RESULT_CENTER_TAGGED },
      obj_notification_level: { notifications_level_id: 2 },
      obj_result: {
        result_code: 9398,
        title: 'A pooled funding result',
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }],
        obj_version: { id: 1 }
      }
    });

    it('renders the bare SP01/ABC/9398 sentence with SP01 emphasized in <b>', () => {
      const fresh = TestBed.createComponent(UpdateNotificationComponent);
      fresh.componentInstance.notification = bareCenterTaggedFixture();
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe('SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - A pooled funding result');
      // SP01 is the lead, rendered in its own <b>, distinct from the prefix text.
      const boldTexts = Array.from(p.querySelectorAll('b')).map(b => b.textContent?.trim());
      expect(boldTexts).toContain('SP01');
    });

    it('a legacy composed fixture renders as it does today (no lead)', () => {
      const fresh = TestBed.createComponent(UpdateNotificationComponent);
      fresh.componentInstance.notification = {
        ...bareCenterTaggedFixture(),
        text: 'created by SP01 has tagged the International Center X. Click to see the result.'
      };
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe(
        'The result 9398 - A pooled funding result created by SP01 has tagged the International Center X. Click to see the result.'
      );
    });
  });

  // WPT-T-4 (`w1w2-project-tagged`, design.md §8.2/§8.3, WPT-R-2): the enriched bare shape loops
  // `segments` (SP09/B-A1080/ABC each in their own <b>, emitter plain) instead of lead/prefix.
  describe('WPT-T-4: Bilateral-project-tagged row segments rendering', () => {
    const enrichedProjectTaggedFixture = () => ({
      notification_level: 2,
      notification_id: 11,
      created_date: new Date().toISOString(),
      text: 'B-A1080 (ABC)',
      obj_emitter_user: { first_name: 'Lucia', last_name: 'Ferrari' },
      obj_notification_type: { type: NotificationType.RESULT_BILATERAL_PROJECT_TAGGED },
      obj_notification_level: { notifications_level_id: 2 },
      obj_result: {
        result_code: 9341,
        title: '<title>',
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP09' } }],
        obj_version: { id: 1 }
      }
    });

    it('renders the SP09/B-A1080/ABC sentence, with those tokens (not the emitter) in <b>', () => {
      const fresh = TestBed.createComponent(UpdateNotificationComponent);
      fresh.componentInstance.notification = enrichedProjectTaggedFixture();
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe('Lucia Ferrari from SP09 has tagged the bilateral project B-A1080 from your center (ABC) to result 9341 - <title>');
      const boldTexts = Array.from(p.querySelectorAll('b')).map(b => b.textContent?.trim());
      expect(boldTexts).toEqual(['SP09', 'B-A1080', 'ABC']);
      expect(boldTexts).not.toContain('Lucia Ferrari');
    });

    it('the result link still renders "9341 - <title>"', () => {
      const fresh = TestBed.createComponent(UpdateNotificationComponent);
      fresh.componentInstance.notification = enrichedProjectTaggedFixture();
      fresh.detectChanges();

      const link: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text a');
      expect(link.textContent?.trim()).toBe('9341 - <title>');
    });

    it('regression: a BCT composed fixture renders unchanged, with no duplicated text', () => {
      const fresh = TestBed.createComponent(UpdateNotificationComponent);
      fresh.componentInstance.notification = {
        ...enrichedProjectTaggedFixture(),
        text: 'created by SP01 has tagged the B-A1080 of your center (ABC). Click to see the result.'
      };
      fresh.detectChanges();

      const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
      const flat = p.textContent!.replace(/\s+/g, ' ').trim();

      expect(flat).toBe(
        'The result 9341 - <title> created by SP01 has tagged the B-A1080 of your center (ABC). Click to see the result.'
      );
    });
  });
});
