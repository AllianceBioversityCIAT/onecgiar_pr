import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  body = signal({
    email: '',
    password: ''
  });

  cognito = inject(CognitoService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.inLogin.set(true);
  }

  validateBody(): boolean {
    return !this.body().email || !this.body().password;
  }

  ngOnDestroy(): void {
    this.authService.inLogin.set(false);
  }
}
