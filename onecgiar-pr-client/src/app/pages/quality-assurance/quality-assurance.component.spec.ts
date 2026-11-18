import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { QA_SP_GENERIC_ERROR, QA_SP_RELOAD_MESSAGE_TYPE, QualityAssuranceComponent, resolveQaSpEmbed } from './quality-assurance.component';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { QualityAssuranceService } from './quality-assurance.service';
import { environment } from '../../../environments/environment';

/**
 * P2-3911 — Science Program view of the new QA. The environment file is per-environment and
 * gitignored, so assertions are built from `environment.qaUrl` instead of a hardcoded host.
 */
describe('QualityAssuranceComponent (P2-3911 SP link)', () => {
  let component: QualityAssuranceComponent;
  let fixture: ComponentFixture<QualityAssuranceComponent>;
  let codeCounter: number;
  let getQaSpLink: jest.Mock;
  let apiMock: any;

  const qaOrigin = new URL(environment.qaUrl).origin;
  const initiatives = [
    { official_code: 'SP01', full_name: 'Program 1' },
    { official_code: 'SP02', full_name: 'Program 2' }
  ];

  // Real DomSanitizer: the wrapped value is what Angular binds to the iframe.
  const lastUrl = () => (component.sanitizedUrl() as any)?.changingThisBreaksApplicationSecurity as string;
  const postFromQa = (origin = qaOrigin, data: any = { type: QA_SP_RELOAD_MESSAGE_TYPE, reason: 'code_invalid' }) =>
    component.handleQaMessage(new MessageEvent('message', { origin, data }));

  beforeEach(async () => {
    codeCounter = 0;
    getQaSpLink = jest.fn(() => {
      codeCounter += 1;
      return of({ response: { code: `code+${codeCounter}/=`, expiresAt: '2026-11-17T12:01:00Z' } });
    });
    apiMock = {
      rolesSE: { isAdmin: false, validateReadOnly: jest.fn() },
      dataControlSE: {
        myInitiativesListReportingByPortfolio: initiatives,
        detailSectionTitle: jest.fn(),
        getCurrentPhases: () => of({ response: [] }),
        reportingCurrentPhase: { portfolioAcronym: 'P25' },
        show_qa_full_screen: false
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn(() => of({ response: initiatives })),
        GET_QaSpLink: getQaSpLink,
        GET_ClarisaQaToken: jest.fn(() => of({ response: { token: 'legacy-token' } }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [QualityAssuranceComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: QualityAssuranceService, useValue: {} },
        { provide: ResultLevelService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QualityAssuranceComponent);
    component = fixture.componentInstance;
    // The environment file is per-environment and gitignored: never depend on its qaSpEmbed value.
    component.qaSpEmbed = 'new';
  });

  afterEach(() => {
    fixture.destroy();
    jest.restoreAllMocks();
  });

  describe('code per load', () => {
    it('asks for a code on first load and points the iframe at {qaUrl}/sp?code=…', () => {
      component.ngOnInit();

      expect(getQaSpLink).toHaveBeenCalledWith('SP01');
      expect(lastUrl()).toBe(`${environment.qaUrl.replace(/\/+$/, '')}/sp?code=${encodeURIComponent('code+1/=')}`);
      expect(lastUrl()).not.toMatch(/[^:]\/\/sp\?/);
      expect(component.showIframe()).toBe(true);
    });

    it('asks for a NEW code every time the program changes', () => {
      component.ngOnInit();
      component.selectOptionEvent('SP02');
      component.selectOptionEvent('SP01');

      expect(getQaSpLink.mock.calls.map(c => c[0])).toEqual(['SP01', 'SP02', 'SP01']);
      expect(lastUrl()).toContain(encodeURIComponent('code+3/='));
    });

    it('admin sees all programs and gets a code for the first one', () => {
      apiMock.rolesSE.isAdmin = true;

      component.ngOnInit();

      expect(apiMock.resultsSE.GET_AllInitiatives).toHaveBeenCalledWith('P25');
      expect(component.allInitiatives).toEqual(initiatives);
      expect(getQaSpLink).toHaveBeenCalledWith('SP01');
    });

    it('drops a pending request when the user switches program', () => {
      const pending = new Subject<any>();
      getQaSpLink.mockReturnValueOnce(pending.asObservable());
      component.selectOptionEvent('SP01');
      component.selectOptionEvent('SP02');

      pending.next({ response: { code: 'stale', expiresAt: 'x' } });

      expect(lastUrl()).not.toContain('stale');
      expect(lastUrl()).toContain(encodeURIComponent('code+1/='));
    });

    it('does not ask for a code without a program', () => {
      apiMock.dataControlSE.myInitiativesListReportingByPortfolio = [];
      component.ngOnInit();

      expect(getQaSpLink).not.toHaveBeenCalled();
      expect(component.showIframe()).toBe(false);
    });
  });

  describe('errors from the back', () => {
    it.each([
      ['This program is not in QA yet', 404],
      ['Quality Assurance is not available right now', 503],
      ['You do not have access to Quality Assurance for this program', 403]
    ])('shows "%s" and a Reload button', (message, status) => {
      getQaSpLink.mockReturnValueOnce(throwError(() => ({ status, error: { message } })));

      component.selectOptionEvent('SP01');

      expect(component.errorMessage()).toBe(message);
      expect(component.showReloadButton()).toBe(true);
      expect(component.showIframe()).toBe(false);
    });

    it('falls back to a generic message', () => {
      getQaSpLink.mockReturnValueOnce(throwError(() => ({ status: 0 })));

      component.selectOptionEvent('SP01');

      expect(component.errorMessage()).toBe(QA_SP_GENERIC_ERROR);
    });

    it('Reload asks for a new code and clears the error', () => {
      getQaSpLink.mockReturnValueOnce(throwError(() => ({ status: 502 })));
      component.selectOptionEvent('SP01');

      component.reload();

      expect(getQaSpLink).toHaveBeenCalledTimes(2);
      expect(component.errorMessage()).toBeNull();
      expect(component.showReloadButton()).toBe(false);
      expect(component.showIframe()).toBe(true);
    });
  });

  describe('qa-sp:reload-required', () => {
    beforeEach(() => component.ngOnInit());

    it('ignores messages from another origin', () => {
      postFromQa('https://evil.example.com');

      expect(getQaSpLink).toHaveBeenCalledTimes(1);
      expect(component.showReloadButton()).toBe(false);
    });

    it('ignores other message types from the QA origin', () => {
      postFromQa(qaOrigin, { type: 'something-else' });

      expect(getQaSpLink).toHaveBeenCalledTimes(1);
    });

    it('reloads once with a new code, then shows the Reload button (no loop)', () => {
      postFromQa();
      expect(getQaSpLink).toHaveBeenCalledTimes(2);
      expect(component.showReloadButton()).toBe(false);

      postFromQa();
      postFromQa();
      expect(getQaSpLink).toHaveBeenCalledTimes(2);
      expect(component.showReloadButton()).toBe(true);
    });

    it('a user action (Reload) re-arms the single automatic reload', () => {
      postFromQa();
      postFromQa();
      component.reload();
      expect(getQaSpLink).toHaveBeenCalledTimes(3);

      postFromQa();
      expect(getQaSpLink).toHaveBeenCalledTimes(4);
    });

    it('listens on window while alive and stops on destroy', () => {
      window.dispatchEvent(new MessageEvent('message', { origin: qaOrigin, data: { type: QA_SP_RELOAD_MESSAGE_TYPE } }));
      expect(getQaSpLink).toHaveBeenCalledTimes(2);

      component.ngOnDestroy();
      window.dispatchEvent(new MessageEvent('message', { origin: qaOrigin, data: { type: QA_SP_RELOAD_MESSAGE_TYPE } }));
      expect(getQaSpLink).toHaveBeenCalledTimes(2);
    });
  });

  describe('template', () => {
    it('renders the iframe with title "Quality Assurance" and no sandbox', () => {
      fixture.detectChanges();

      const iframe: HTMLIFrameElement = fixture.nativeElement.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe.getAttribute('title')).toBe('Quality Assurance');
      expect(iframe.hasAttribute('sandbox')).toBe(false);
    });

    it('renders the back error message', () => {
      getQaSpLink.mockReturnValue(throwError(() => ({ status: 404, error: { message: 'This program is not in QA yet' } })));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('This program is not in QA yet');
      expect(fixture.nativeElement.querySelector('app-pr-button.qa_reload')).toBeTruthy();
    });
  });

  it('never builds //sp when qaUrl has a trailing slash', () => {
    component.qaUrl = 'https://qa.example.test';
    component.selectOptionEvent('SP01');
    expect(lastUrl()).toBe(`https://qa.example.test/sp?code=${encodeURIComponent('code+1/=')}`);
  });

  describe("qaSpEmbed switch ('new' in TEST, 'legacy' in PROD)", () => {
    it.each([
      ['new', 'new'],
      ['legacy', 'legacy'],
      [undefined, 'legacy'],
      ['NEW', 'legacy'],
      [true, 'legacy']
    ])('resolves %p to %p (only an explicit "new" switches)', (value, expected) => {
      expect(resolveQaSpEmbed(value)).toBe(expected);
    });

    describe("'legacy'", () => {
      beforeEach(() => {
        component.qaSpEmbed = 'legacy';
      });

      it('uses the CLARISA token and the old /crp URL, never the new code route', () => {
        component.ngOnInit();

        expect(apiMock.resultsSE.GET_ClarisaQaToken).toHaveBeenCalledWith('SP01');
        expect(getQaSpLink).not.toHaveBeenCalled();
        expect(lastUrl()).toBe(`${environment.qaUrl}/crp?crp_id=SP01&token=legacy-token`);
        expect(component.showIframe()).toBe(true);
      });

      it('asks for a new token on program change', () => {
        component.ngOnInit();
        component.selectOptionEvent('SP02');

        expect(apiMock.resultsSE.GET_ClarisaQaToken.mock.calls.map(c => c[0])).toEqual(['SP01', 'SP02']);
        expect(lastUrl()).toContain('crp_id=SP02');
      });

      it('ignores qa-sp:reload-required messages', () => {
        component.ngOnInit();
        postFromQa();

        expect(apiMock.resultsSE.GET_ClarisaQaToken).toHaveBeenCalledTimes(1);
        expect(component.showReloadButton()).toBe(false);
      });

      it('shows the generic error when the token does not come back', () => {
        apiMock.resultsSE.GET_ClarisaQaToken.mockReturnValueOnce(throwError(() => ({ status: 500 })));
        component.selectOptionEvent('SP01');

        expect(component.errorMessage()).toBe(QA_SP_GENERIC_ERROR);
        expect(component.showIframe()).toBe(false);
      });

      it('shows the generic error when the token is empty', () => {
        apiMock.resultsSE.GET_ClarisaQaToken.mockReturnValueOnce(of({ response: { token: null } }));
        component.selectOptionEvent('SP01');

        expect(component.errorMessage()).toBe(QA_SP_GENERIC_ERROR);
      });
    });
  });

  it('originOf returns null for an invalid URL', () => {
    expect(QualityAssuranceComponent.originOf('not a url')).toBeNull();
  });
});
