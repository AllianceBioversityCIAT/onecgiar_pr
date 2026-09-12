import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClarityService } from './clarity.service';
import { ApiService } from './api/api.service';
import { AuthService } from './api/auth.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
// import { WebsocketService } from '../../sockets/websocket.service';
import { RolesService } from './global/roles.service';
import { UserAuth } from '../interfaces/user.interface';
import { internationalizationData } from '../data/internationalization-data';
import { environment } from '../../../environments/environment';
// @akili-spec changes/cognito-email-otp-login — OTP-T-6, design.md §5.3
/** Mapped from the server's `OTP_*` error codes; the panel owns the copy per key. */
export type OtpErrorKey = 'domain' | 'mismatch' | 'expired' | 'attempts' | 'rate' | 'upstream' | 'needsRoles' | 'unknown';

/**
 * `serverMessage` is only passed for `unknown` keys that carry a non-empty server message.
 * `rotatedSession` (OTP-T-13, design.md §18.1 steps 9-10) is only passed on a `mismatch` whose
 * body carried a rotated Cognito `session` (the real path — a decoy mismatch never rotates).
 * Both trailing args are omitted entirely when absent so existing `toHaveBeenCalledWith(key)`
 * assertions keep matching call arity.
 */
export type OtpErrorCallback = (key: OtpErrorKey, serverMessage?: string, rotatedSession?: string) => void;

export interface OtpStartResult {
  session: string;
  destination: string;
}

@Injectable({
  providedIn: 'root'
})
export class CognitoService {
  internationalizationData = internationalizationData;
  isLoadingAzureAd = signal(false);
  isLoadingCredentials = signal(false);
  requiredChangePassword = signal(false);
  body = signal<UserAuth>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  chagePasswordSession = signal<string | null>(null);

  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  clarity = inject(ClarityService);
  authService = inject(AuthService);
  customAlertService = inject(CustomizedAlertsFeService);
  // webSocket = inject(WebsocketService);
  rolesSE = inject(RolesService);

  private getRedirectUri(): string {
    return `${window.location.origin}/auth`;
  }

  loginWithAzureAd() {
    if (this.isLoadingAzureAd()) return;

    this.isLoadingAzureAd.set(true);

    const provider = environment.production ? 'CGIAR-Account' : 'CGIAR-AzureAD';
    this.api.resultsSE.GET_loginWithAzureAd(provider, this.getRedirectUri()).subscribe({
      next: res => {
        window.location.href = res?.response?.authUrl;

        this.isLoadingAzureAd.set(false);
      },
      error: err => {
        console.error(err);
        this.customAlertService.show({
          id: 'loginAlert',
          title: 'Oops!',
          description: 'Error while trying to login with Azure AD',
          status: 'warning'
        });
        this.isLoadingAzureAd.set(false);
      }
    });
  }

  async validateCognitoCode() {
    const { code } = this.activatedRoute.snapshot.queryParams ?? {};

    if (!code) {
      return;
    }

    this.api.resultsSE.POST_validateCognitoCode(code, this.getRedirectUri()).subscribe({
      next: res => {
        this.updateCacheService(res);
        this.redirectToHome();
        this.isLoadingAzureAd.set(false);
      },
      error: err => {
        console.error(err);

        this.customAlertService.show(
          {
            id: 'loginAlert',
            title: 'Oops!',
            description: err?.error?.message?.includes('User is inactive')
              ? 'User is inactive. Please contact support.'
              : 'Error while trying to login with Azure AD',
            status: 'warning',
            confirmText: 'Return to login',
            hideCancelButton: true
          },
          () => {
            this.router.navigate(['/login']);
          }
        );
        this.isLoadingAzureAd.set(false);
      }
    });
  }

  loginWithCredentials(body: UserAuth) {
    if (this.isLoadingCredentials() || body.email == '' || body.password == '') return;

    this.isLoadingCredentials.set(true);

    this.authService.POST_cognitoAuth(body).subscribe({
      next: resp => {
        if (resp?.response?.challengeName && resp?.response?.challengeName == 'NEW_PASSWORD_REQUIRED') {
          this.requiredChangePassword.set(true);
          this.isLoadingCredentials.set(false);
          this.body.set({
            email: body.email,
            password: '',
            confirmPassword: ''
          });
          this.chagePasswordSession.set(resp?.response?.session);
          return;
        }

        this.updateCacheService(resp);
        this.isLoadingCredentials.set(false);
        this.requiredChangePassword.set(false);
        this.body.set({
          email: '',
          password: '',
          confirmPassword: ''
        });
        this.redirectToHome();
      },
      error: err => {
        console.error(err);
        this.isLoadingCredentials.set(false);
        this.requiredChangePassword.set(false);
        const statusCode = err?.error?.statusCode;
        if (statusCode == 404)
          return this.customAlertService.show({
            id: 'loginAlert',
            title: 'Oops!',
            description: 'This user is not registered. <br> Please contact the support team.',
            status: 'warning'
          });
        console.error(err);
        this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: err?.error?.message, status: 'warning' });
      }
    });
  }

  changePassword() {
    const body = {
      session: this.chagePasswordSession(),
      newPassword: this.body().password,
      username: this.body().email
    };

    this.isLoadingCredentials.set(true);

    this.authService.POST_cognitoChangePassword(body).subscribe({
      next: resp => {
        this.updateCacheService(resp);
        this.isLoadingCredentials.set(false);
        this.requiredChangePassword.set(false);
        this.body.set({
          email: '',
          password: '',
          confirmPassword: ''
        });
        this.redirectToHome();
      },
      error: err => {
        console.error(err);
        this.isLoadingCredentials.set(false);
        this.requiredChangePassword.set(false);
        this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: err?.error?.message, status: 'warning' });
      }
    });
  }

  // @akili-spec changes/cognito-email-otp-login — OTP-T-6, design.md §5.3, OTP-R-2/OTP-R-20/OTP-R-21
  /**
   * Starts the Center email-OTP challenge. The panel owns busy/step state — this only
   * calls the server and hands the `{ session, destination }` (or a mapped error key)
   * back through the callbacks, never a global alert (copy stays inline in the panel).
   */
  startOtp(email: string, onSuccess: (result: OtpStartResult) => void, onError: OtpErrorCallback): void {
    this.authService.POST_otpStart({ email }).subscribe({
      next: resp => {
        onSuccess({
          session: resp?.response?.session,
          destination: resp?.response?.destination
        });
      },
      error: err => this.reportOtpError('start', err, onError)
    });
  }

  // @akili-spec changes/cognito-email-otp-login — OTP-T-6, design.md §5.3/§5.1, OTP-R-4/OTP-R-5
  /** Success reuses `updateCacheService` + `redirectToHome` exactly as `loginWithCredentials` does. */
  verifyOtp(email: string, code: string, session: string, onError: OtpErrorCallback): void {
    this.authService.POST_otpVerify({ email, code, session }).subscribe({
      next: resp => {
        this.updateCacheService(resp);
        this.redirectToHome();
      },
      error: err => this.reportOtpError('verify', err, onError)
    });
  }

  /**
   * OTP-R-11 / `.cursorrules`: log the HTTP status only — the error body carries the server
   * message, which can include the email address. Unmapped codes hand the server message to the
   * panel (when there is one) so the user sees something more useful than the generic copy.
   */
  private reportOtpError(stage: 'start' | 'verify', err: any, onError: OtpErrorCallback): void {
    console.error(`OTP ${stage} failed`, err?.status);

    const key = this.mapOtpErrorKey(err);
    const serverMessage = err?.error?.message;
    if (key === 'unknown' && typeof serverMessage === 'string' && serverMessage.trim()) {
      onError(key, serverMessage);
      return;
    }

    // OTP-T-13 rework 2: a `mismatch` body can carry a rotated Cognito `session` (design.md
    // §18.1 steps 9-10) — pass it through as the third arg only when present so calls without
    // one keep matching a plain `toHaveBeenCalledWith(key)` assertion. Gated strictly on
    // `key === 'mismatch'` (Reviewer advisory 2) — a `session` field on any other mapped key
    // must never be surfaced as a rotated session.
    if (key === 'mismatch') {
      const rotatedSession = err?.error?.response?.session;
      if (typeof rotatedSession === 'string' && rotatedSession.trim()) {
        onError(key, undefined, rotatedSession);
        return;
      }
    }

    onError(key);
  }

  /** `OTP_*` codes (design.md §4.1) → the panel's inline error key. `needsRoles` has no `code`. */
  private mapOtpErrorKey(err: any): OtpErrorKey {
    const body = err?.error?.response;

    if (body?.needsRoles) return 'needsRoles';

    switch (body?.code) {
      case 'OTP_DOMAIN_NOT_ALLOWED':
        return 'domain';
      case 'OTP_CODE_MISMATCH':
        return 'mismatch';
      case 'OTP_CODE_EXPIRED':
        return 'expired';
      case 'OTP_ATTEMPTS_EXCEEDED':
        return 'attempts';
      case 'OTP_RATE_LIMITED':
        return 'rate';
      case 'OTP_UPSTREAM_UNAVAILABLE':
        return 'upstream';
      default:
        // Covers OTP_NOT_AUTHORIZED (decoy/unsupported-challenge) and any unmapped failure.
        return 'unknown';
    }
  }

  updateCacheService(resp: any) {
    this.authService.localStorageToken = resp?.response?.token;
    this.authService.localStorageUser = resp?.response?.user;
    // this.webSocket.configUser(this.authService.localStorageUser?.user_name, this.authService.localStorageUser?.id);
    this.clarity.updateUserInfo();
    this.rolesSE.validateReadOnly();
  }

  redirectToHome() {
    // Back to the deep link the user was denied before logging in; otherwise '/', which
    // the landing resolver turns into their first science program (or the Results Center).
    const pending = this.authService.consumePendingRedirectUrl();
    if (pending) {
      this.router.navigateByUrl(pending).then(ok => {
        if (!ok) this.router.navigate(['/']);
      });
      return;
    }
    this.router.navigate(['/']);
  }
}
