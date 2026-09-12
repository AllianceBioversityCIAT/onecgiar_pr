// @akili-spec changes/cognito-email-otp-login — OTP-T-6
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { CenterOtpPanelComponent } from './center-otp-panel.component';
import { AuthService } from '../../../../shared/services/api/auth.service';
import { CognitoService } from '../../../../shared/services/cognito.service';

function httpError(response: any) {
  return throwError(() => ({ error: response }));
}

describe('CenterOtpPanelComponent', () => {
  let fixture: ComponentFixture<CenterOtpPanelComponent>;
  let component: CenterOtpPanelComponent;
  let authService: AuthService;
  let cognitoService: CognitoService;

  const DOMAINS = ['icrisat.org', 'cifor-icraf.org'];
  const START_OK = { response: { sent: true, session: 'sess-123', destination: 'a***@icrisat.org' }, message: 'sent', status: 200 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CenterOtpPanelComponent, HttpClientTestingModule, RouterTestingModule]
    });

    fixture = TestBed.createComponent(CenterOtpPanelComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    cognitoService = TestBed.inject(CognitoService);

    fixture.componentRef.setInput('domains', DOMAINS);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setEmail(value: string): void {
    component.onEmailInput(value);
    fixture.detectChanges();
  }

  function statusText(): string {
    return fixture.nativeElement.querySelector('[data-test="otp-status"]')?.textContent?.trim() ?? '';
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('blocks a foreign domain before calling the server and shows the inline message', () => {
    const spy = jest.spyOn(authService, 'POST_otpStart');

    setEmail('someone@gmail.com');
    component.sendCode();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(component.step()).toBe('email');
    expect(statusText()).toContain('not enabled for this option');
  });

  it('blocks a syntactically invalid email before calling the server', () => {
    const spy = jest.spyOn(authService, 'POST_otpStart');

    setEmail('not-an-email');
    component.sendCode();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(component.step()).toBe('email');
  });

  it('starts the code step on a valid Center email, normalising the payload, and shows the masked destination', () => {
    const spy = jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));

    setEmail('  A.Person@ICRISAT.org  ');
    component.sendCode();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ email: 'a.person@icrisat.org' });
    expect(component.step()).toBe('code');
    expect(statusText()).toContain('a***@icrisat.org');
  });

  it('moves focus to the code field once the code step has actually rendered (OTP-R-4 autofocus)', async () => {
    // Mirrors production: the response arrives later inside NgZone, change detection is driven by
    // the real tick (autoDetect), so a focus attempt that runs before `@if (step() === 'code')`
    // renders finds no input and leaves focus on <body>.
    const start$ = new Subject<any>();
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(start$);
    fixture.autoDetectChanges();

    setEmail('a.person@icrisat.org');
    fixture.ngZone!.run(() => component.sendCode());
    fixture.ngZone!.run(() => start$.next(START_OK));
    await fixture.whenStable();

    const codeInput = fixture.nativeElement.querySelector('[data-test="otp-code"]');
    expect(codeInput).not.toBeNull();
    expect(document.activeElement).toBe(codeInput);
  });

  it('logs the user in on a correct code (updateCacheService + redirectToHome)', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest.spyOn(authService, 'POST_otpVerify').mockReturnValue(
      of({ response: { valid: true, token: 'jwt-token', user: { id: 1 }, auth_tokens: {} }, message: 'ok', status: 200 })
    );
    const cacheSpy = jest.spyOn(cognitoService, 'updateCacheService');
    const redirectSpy = jest.spyOn(cognitoService, 'redirectToHome').mockImplementation(() => undefined);

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('48291345');
    component.verify();
    fixture.detectChanges();

    expect(cacheSpy).toHaveBeenCalled();
    expect(redirectSpy).toHaveBeenCalled();
  });

  it('shows "Code incorrect" and keeps the session on OTP_CODE_MISMATCH', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest
      .spyOn(authService, 'POST_otpVerify')
      .mockReturnValue(httpError({ response: { valid: false, code: 'OTP_CODE_MISMATCH' }, statusCode: 401, message: 'Code incorrect. Try again.' }));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('000000');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toBe('Code incorrect. Try again.');
    expect(component.session()).toBe('sess-123');
  });

  // @akili-spec changes/cognito-email-otp-login (OTP-T-13, design.md §18.1 steps 9-10,
  // requirements.md §13 OTP-R-4 modified, OTP-AC-18) — a mismatch that carries a rotated
  // Cognito session replaces the panel's session before the retry; one without a session
  // (e.g. a decoy) leaves the current session untouched (covered by the test above).
  describe('rotated session on OTP_CODE_MISMATCH (OTP-T-13)', () => {
    it('replaces the session when the mismatch body carries a rotated one', () => {
      jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
      jest
        .spyOn(authService, 'POST_otpVerify')
        .mockReturnValue(
          httpError({
            response: { valid: false, code: 'OTP_CODE_MISMATCH', session: 'rotated-session-xyz' },
            statusCode: 401,
            message: 'Code incorrect. Try again.'
          })
        );

      setEmail('a.person@icrisat.org');
      component.sendCode();
      fixture.detectChanges();
      expect(component.session()).toBe('sess-123');

      component.onCodeInput('000000');
      component.verify();
      fixture.detectChanges();

      expect(statusText()).toBe('Code incorrect. Try again.');
      expect(component.session()).toBe('rotated-session-xyz');
    });
  });

  it('shows the expired-code copy and re-enables resend immediately', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest
      .spyOn(authService, 'POST_otpVerify')
      .mockReturnValue(httpError({ response: { valid: false, code: 'OTP_CODE_EXPIRED' }, statusCode: 401, message: 'Code expired — request a new one.' }));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();
    expect(component.resendCooldown()).toBe(30);

    component.onCodeInput('123456');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toBe('Code expired — request a new one.');
    expect(component.resendDisabled()).toBe(false);
  });

  it('shows the attempts-exceeded copy and re-enables resend immediately', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest
      .spyOn(authService, 'POST_otpVerify')
      .mockReturnValue(
        httpError({ response: { valid: false, code: 'OTP_ATTEMPTS_EXCEEDED' }, statusCode: 401, message: 'Too many attempts — request a new code.' })
      );

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('123456');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toBe('Too many attempts — request a new code.');
    expect(component.resendDisabled()).toBe(false);
  });

  it('disables resend for 30 s then re-enables it and issues a new start', () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    expect(component.resendDisabled()).toBe(true);

    jest.advanceTimersByTime(30000);
    fixture.detectChanges();

    expect(component.resendDisabled()).toBe(false);

    component.resend();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('back returns to the email step, keeping the email value', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();
    expect(component.step()).toBe('code');

    component.back();
    fixture.detectChanges();

    expect(component.step()).toBe('email');
    expect(component.email()).toBe('a.person@icrisat.org');
  });

  it('does not call verify for a malformed code and shows the neutral inline hint', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    const verifySpy = jest.spyOn(authService, 'POST_otpVerify');

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('12');
    component.verify();
    fixture.detectChanges();

    expect(verifySpy).not.toHaveBeenCalled();
    expect(statusText()).toBe('Enter the code from your email.');
    expect(component.step()).toBe('code');
  });

  it('disables the back link while a request is in flight', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValueOnce(of(START_OK)).mockReturnValueOnce(new Subject<any>());

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-test="otp-back"]').disabled).toBe(false);

    component.resendCooldown.set(0);
    component.resend();
    fixture.detectChanges();

    expect(component.busy()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-test="otp-back"]').disabled).toBe(true);
  });

  it('ignores a start response that arrives after back()', () => {
    const late$ = new Subject<any>();
    jest.spyOn(authService, 'POST_otpStart').mockReturnValueOnce(of(START_OK)).mockReturnValueOnce(late$);

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.resendCooldown.set(0);
    component.resend();
    component.back();
    fixture.detectChanges();
    expect(component.step()).toBe('email');

    late$.next({ response: { sent: true, session: 'sess-late', destination: 'z***@icrisat.org' }, message: 'sent', status: 200 });
    fixture.detectChanges();

    expect(component.step()).toBe('email');
    expect(component.session()).toBeNull();
    expect(component.busy()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-test="otp-code"]')).toBeNull();
  });

  it('ignores a verify error that arrives after back()', () => {
    const late$ = new Subject<any>();
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest.spyOn(authService, 'POST_otpVerify').mockReturnValue(late$);

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('123456');
    component.verify();
    component.back();
    fixture.detectChanges();

    late$.error({ error: { response: { valid: false, code: 'OTP_CODE_MISMATCH' }, statusCode: 401, message: 'Code incorrect. Try again.' } });
    fixture.detectChanges();

    expect(statusText()).toBe('');
    expect(component.busy()).toBe(false);
  });

  it('shows the server message for an unmapped error code when one is provided', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest
      .spyOn(authService, 'POST_otpVerify')
      .mockReturnValue(httpError({ response: { valid: false, code: 'OTP_NOT_AUTHORIZED' }, statusCode: 401, message: 'Session is no longer valid.' }));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('123456');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toBe('Session is no longer valid.');
  });

  it('falls back to the generic copy for an unmapped error without a server message', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest.spyOn(authService, 'POST_otpVerify').mockReturnValue(httpError({ response: { valid: false, code: 'OTP_NOT_AUTHORIZED' }, statusCode: 401 }));

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('123456');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toBe('Something went wrong. Please try again or contact support.');
  });

  it('shows the rate-limit copy on 429', () => {
    setEmail('a.person@icrisat.org');
    jest
      .spyOn(authService, 'POST_otpStart')
      .mockReturnValue(httpError({ response: { valid: false, code: 'OTP_RATE_LIMITED' }, statusCode: 429, message: 'Too many requests — wait a few minutes.' }));

    component.sendCode();
    fixture.detectChanges();

    expect(statusText()).toBe('Too many requests — wait a few minutes.');
  });

  it('shows the upstream-unavailable copy on 503', () => {
    setEmail('a.person@icrisat.org');
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(
      httpError({
        response: { valid: false, code: 'OTP_UPSTREAM_UNAVAILABLE' },
        statusCode: 503,
        message: 'We could not reach the sign-in service. Try again in a minute or contact support.'
      })
    );

    component.sendCode();
    fixture.detectChanges();

    expect(statusText()).toBe('We could not reach the sign-in service. Try again in a minute or contact support.');
  });

  it('shows the needsRoles copy on verify', () => {
    jest.spyOn(authService, 'POST_otpStart').mockReturnValue(of(START_OK));
    jest
      .spyOn(authService, 'POST_otpVerify')
      .mockReturnValue(
        httpError({
          response: { valid: false, needsRoles: true },
          statusCode: 403,
          message: 'The user a.person@icrisat.org does not have any roles assigned. Please contact the administrator.'
        })
      );

    setEmail('a.person@icrisat.org');
    component.sendCode();
    fixture.detectChanges();

    component.onCodeInput('123456');
    component.verify();
    fixture.detectChanges();

    expect(statusText()).toContain('roles');
  });
});
