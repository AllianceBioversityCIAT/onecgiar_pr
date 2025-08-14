import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CognitoService } from '../../shared/services/cognito.service';
import { AuthService } from '../../shared/services/api/auth.service';

@Component({
    selector: 'app-auth-cognito',
    imports: [],
    templateUrl: './auth-cognito.component.html',
    styleUrl: './auth-cognito.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthCognitoComponent implements OnInit, OnDestroy {
  cognito = inject(CognitoService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.inLogin.set(true);
    this.cognito.validateCognitoCode();
  }

  ngOnDestroy(): void {
    this.authService.inLogin.set(false);
  }
}
