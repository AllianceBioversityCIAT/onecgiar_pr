// @akili-spec changes/cognito-email-otp-login — OTP-T-6
// Implements: OTP-R-2, OTP-R-4 (client half), OTP-R-5 (client half), OTP-R-14, OTP-R-20..23,
// OTP-AC-3, OTP-AC-6 (client), OTP-AC-7/8 (copy), OTP-DD-8. design.md §5.3 / §6.2 / §6.3.
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideKeyRound, lucideMail, lucideRefreshCw } from '@ng-icons/lucide';
import { CognitoService, OtpErrorKey } from '../../../../shared/services/cognito.service';

/** OTP-R-20: resend stays disabled for 30 s after every send (start or resend). */
const RESEND_COOLDOWN_SECONDS = 30;

/** Service keys plus the panel-only `format` key (code shape rejected before any request). */
type PanelErrorKey = OtpErrorKey | 'format';

/** design.md §5.3 — exact inline copy per error key. Owned by the panel, not the service. */
const OTP_ERROR_COPY: Record<PanelErrorKey, string> = {
  format: 'Enter the code from your email.',
  domain:
    'That email domain is not enabled for this option — use your CGIAR account or the external-user option, or contact PRMSTechSupport@cgiar.org',
  mismatch: 'Code incorrect. Try again.',
  expired: 'Code expired — request a new one.',
  attempts: 'Too many attempts — request a new code.',
  rate: 'Too many requests — wait a few minutes.',
  upstream: 'We could not reach the sign-in service. Try again in a minute or contact support.',
  needsRoles: 'This account does not have any roles assigned yet. Please contact the administrator.',
  unknown: 'Something went wrong. Please try again or contact support.'
};

const EMAIL_SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mirrors the server DTO (`OTP-R-6`: 4–10 digits) so a malformed code never reaches the API. */
const CODE_SHAPE_RE = /^\d{4,10}$/;

@Component({
  selector: 'app-center-otp-panel',
  imports: [CommonModule, FormsModule, NgIcon],
  // `lucideBuilding2` (the choose-step Center button) belongs to `LoginComponent` (OTP-T-7).
  providers: [provideIcons({ lucideMail, lucideKeyRound, lucideRefreshCw, lucideArrowLeft })],
  templateUrl: './center-otp-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterOtpPanelComponent {
  private readonly cognito = inject(CognitoService);
  private readonly injector = inject(Injector);

  /** Allow-listed Center domains from `GET_otpConfig` (owned by `LoginComponent`, OTP-T-7). */
  readonly domains = input<string[]>([]);

  // §5.3 state machine
  readonly step = signal<'email' | 'code'>('email');
  readonly email = signal('');
  readonly session = signal<string | null>(null);
  readonly destination = signal<string | null>(null);
  readonly code = signal('');
  readonly busy = signal(false);
  readonly error = signal<PanelErrorKey | null>(null);
  /** Server-provided text for an `unknown` key; overrides the generic copy when present. */
  private readonly serverMessage = signal<string | null>(null);
  /** Seconds left before resend re-enables; 0 = enabled (OTP-R-20). */
  readonly resendCooldown = signal(0);

  private resendTimer: ReturnType<typeof setInterval> | null = null;
  /** Bumped on every request and on `back()`; a callback whose token is stale is ignored. */
  private requestSeq = 0;
  private readonly codeInputRef = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  /** `aria-live` status text: the active error copy, else the neutral "sent" line on the code step. */
  readonly statusText = computed<string | null>(() => {
    const err = this.error();
    if (err) return (err === 'unknown' && this.serverMessage()) || OTP_ERROR_COPY[err];
    if (this.step() === 'code') {
      const dest = this.destination();
      return `If this account exists, we sent a code to ${dest || 'your email'}`;
    }
    return null;
  });

  readonly statusIsError = computed(() => this.error() !== null);
  readonly resendDisabled = computed(() => this.busy() || this.resendCooldown() > 0);
  readonly resendLabel = computed(() => (this.resendCooldown() > 0 ? `Resend in ${this.resendCooldown()} s` : 'Resend code'));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearResendTimer());
  }

  onEmailInput(value: string): void {
    this.email.set(value);
  }

  onCodeInput(value: string): void {
    this.code.set((value || '').replace(/\D/g, ''));
  }

  /** OTP-R-2: email syntax + domain checked BEFORE any request; a foreign domain never calls the server. */
  sendCode(): void {
    if (this.busy()) return;

    const email = (this.email() || '').trim().toLowerCase();
    this.clearError();

    if (!EMAIL_SYNTAX_RE.test(email) || !this.domains().includes(this.extractDomain(email))) {
      this.error.set('domain');
      return;
    }

    this.email.set(email);
    this.requestCode(email);
  }

  /** OTP-R-20: resend issues a fresh `start` call (old code/session invalid) under the same cooldown. */
  resend(): void {
    if (this.resendDisabled()) return;
    this.clearError();
    this.requestCode(this.email());
  }

  verify(): void {
    if (this.busy()) return;
    const session = this.session();
    if (!session) return;

    this.clearError();

    if (!CODE_SHAPE_RE.test(this.code())) {
      this.error.set('format');
      return;
    }

    this.busy.set(true);
    const token = ++this.requestSeq;

    this.cognito.verifyOtp(this.email(), this.code(), session, (key, serverMessage) => {
      if (token !== this.requestSeq) return; // `back()` already reset the panel — stale reply.
      this.busy.set(false);
      this.setError(key, serverMessage);

      // OTP_CODE_EXPIRED / OTP_ATTEMPTS_EXCEEDED: the current code can never succeed again —
      // let the user request a new one immediately instead of waiting out the cooldown.
      if (key === 'expired' || key === 'attempts') {
        this.clearResendTimer();
        this.resendCooldown.set(0);
      }
    });
  }

  /** OTP-R-23: only the code-step fields reset — the email value survives the trip back. */
  back(): void {
    this.requestSeq++; // any in-flight reply is now stale
    this.clearResendTimer();
    this.resendCooldown.set(0);
    this.busy.set(false);
    this.step.set('email');
    this.session.set(null);
    this.destination.set(null);
    this.code.set('');
    this.clearError();
  }

  private requestCode(email: string): void {
    this.busy.set(true);
    const token = ++this.requestSeq;

    this.cognito.startOtp(
      email,
      result => {
        if (token !== this.requestSeq) return; // `back()` already reset the panel — stale reply.
        this.busy.set(false);
        this.session.set(result.session);
        this.destination.set(result.destination);
        this.code.set('');
        this.step.set('code');
        this.startResendCooldown();
        this.focusCodeInput();
      },
      (key, serverMessage) => {
        if (token !== this.requestSeq) return;
        this.busy.set(false);
        this.setError(key, serverMessage);
      }
    );
  }

  private setError(key: PanelErrorKey, serverMessage?: string): void {
    this.serverMessage.set(serverMessage?.trim() || null);
    this.error.set(key);
  }

  private clearError(): void {
    this.serverMessage.set(null);
    this.error.set(null);
  }

  private extractDomain(email: string): string {
    return (email.split('@')[1] || '').toLowerCase();
  }

  private startResendCooldown(): void {
    this.clearResendTimer();
    this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
    this.resendTimer = setInterval(() => {
      const next = this.resendCooldown() - 1;
      if (next <= 0) {
        this.resendCooldown.set(0);
        this.clearResendTimer();
      } else {
        this.resendCooldown.set(next);
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  /**
   * A11y (§10): focus moves to the code field right after a successful send. `step.set('code')`
   * only marks the view dirty — the `@if` block exists only after the next render, so the focus
   * call must be an after-render hook (a microtask would drain before Zone's tick renders it).
   */
  private focusCodeInput(): void {
    afterNextRender(() => this.codeInputRef()?.nativeElement.focus(), { injector: this.injector });
  }
}
