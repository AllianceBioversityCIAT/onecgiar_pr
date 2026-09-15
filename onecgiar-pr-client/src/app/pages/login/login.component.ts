import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../shared/services/api/auth.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmInput } from '@spartan/input';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2 } from '@ng-icons/lucide';
import { CenterOtpPanelComponent } from './components/center-otp-panel/center-otp-panel.component';

// @akili-spec changes/cognito-email-otp-login — OTP-T-7, design.md §5.3: helper label per allow-listed
// domain; a domain without an entry is shown as-is.
const CENTER_LABELS: Record<string, string> = {
  'icrisat.org': 'ICRISAT',
  'cifor-icraf.org': 'CIFOR-ICRAF'
};

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule, HlmInput, NgIcon, CenterOtpPanelComponent],
    providers: [provideIcons({ lucideBuilding2 })],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, OnDestroy {
  cognito = inject(CognitoService);
  authService = inject(AuthService);
  router = inject(Router);

  showLoginForm = signal(false);
  showPassword = false;
  showConfirmPassword = false;

  // @akili-spec changes/cognito-email-otp-login — OTP-T-7 (OTP-R-1, OTP-R-14 choose state, design.md §6.2)
  /** Allow-listed Center domains from `GET_otpConfig`; empty keeps the third path hidden. */
  centerDomains = signal<string[]>([]);
  private readonly centerPanelRequested = signal(false);
  /** One active path at a time: the panel yields to the external form and to the password-change form. */
  centerPanelOpen = computed(() => this.centerPanelRequested() && !this.showLoginForm() && !this.cognito.requiredChangePassword());
  centerHelperText = computed(
    () =>
      `For CGIAR centers outside the CGIAR directory · ${this.centerDomains()
        .map(domain => CENTER_LABELS[domain] ?? domain)
        .join(' · ')}`
  );

  toggleLoginForm(): void {
    this.showLoginForm.set(!this.showLoginForm());
  }

  /** Opening the Center panel closes the external form; the external button closes the panel through `centerPanelOpen`. */
  toggleCenterPanel(): void {
    const open = !this.centerPanelOpen();
    this.centerPanelRequested.set(open);
    if (open) this.showLoginForm.set(false);
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  ngOnInit(): void {
    if (this.authService.localStorageUser) {
      // Already signed in: honour the deep link that sent them here, if any.
      const pending = this.authService.consumePendingRedirectUrl();
      if (pending) {
        this.router.navigateByUrl(pending).then(ok => {
          if (!ok) this.router.navigate(['/']);
        });
      } else {
        this.router.navigate(['/']);
      }
    }

    this.authService.inLogin.set(true);

    // OTP-T-7 / design.md §5.3: an empty list or a failed request only keeps the Center block hidden —
    // the CGIAR and external paths never wait on it.
    this.authService.GET_otpConfig().subscribe({
      next: resp => this.centerDomains.set(resp?.response?.domains ?? []),
      error: () => this.centerDomains.set([])
    });
  }

  validateBody(): boolean {
    if (this.cognito.requiredChangePassword()) {
      return (
        !this.cognito.body().email ||
        !this.cognito.body().password ||
        !this.cognito.body().confirmPassword ||
        !this.isPasswordValid() ||
        !this.doPasswordsMatch()
      );
    }
    return !this.cognito.body().email || !this.cognito.body().password;
  }

  // Password validation based on requirements
  isPasswordValid(): boolean {
    const password = this.cognito.body().password;

    if (this.cognito.requiredChangePassword() && !password) {
      return true;
    }

    return (
      this.hasLowerCase(password) &&
      this.hasUpperCase(password) &&
      this.hasMinLength(password) &&
      this.hasSpecialCharacter(password) &&
      this.hasNoLeadingTrailingSpaces(password)
    );
  }

  // Check if passwords match
  doPasswordsMatch(): boolean {
    return this.cognito.body().password === this.cognito.body().confirmPassword;
  }

  // Individual validation methods
  hasLowerCase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  hasUpperCase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  hasMinLength(password: string): boolean {
    return password.length >= 8;
  }

  hasSpecialCharacter(password: string): boolean {
    return /[^a-zA-Z0-9]/.test(password);
  }

  hasNoLeadingTrailingSpaces(password: string): boolean {
    return password === password.trim();
  }

  // Handle keydown events to support Enter key submissions
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.validateBody()) {
      if (this.cognito.requiredChangePassword()) {
        this.cognito.changePassword();
      } else {
        this.cognito.loginWithCredentials(this.cognito.body());
      }
    }
  }

  ngOnDestroy(): void {
    this.authService.inLogin.set(false);
  }
}
