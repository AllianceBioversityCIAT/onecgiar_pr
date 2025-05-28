import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services/api/auth.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit, OnDestroy {
  cognito = inject(CognitoService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.inLogin.set(true);
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

  ngOnDestroy(): void {
    this.authService.inLogin.set(false);
  }
}
