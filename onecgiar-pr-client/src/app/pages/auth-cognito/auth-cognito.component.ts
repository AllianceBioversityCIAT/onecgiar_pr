import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CognitoService } from '../../shared/services/cognito.service';
import { AuthService } from '../../shared/services/api/auth.service';

@Component({
  selector: 'app-auth-cognito',
  standalone: true,
  imports: [],
  templateUrl: './auth-cognito.component.html',
  styleUrl: './auth-cognito.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthCognitoComponent {
  cognito = inject(CognitoService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.inLogin = true;
    this.cognito.validateCognitoCode();
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
  }
}
