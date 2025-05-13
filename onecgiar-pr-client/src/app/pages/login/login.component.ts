import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { internationalizationData } from '../../shared/data/internationalization-data';
import { AuthService } from '../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { WebsocketService } from '../../sockets/websocket.service';
import { ClarityService } from '../../shared/services/clarity.service';
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
// OnDestroy,
export class LoginComponent implements OnInit {
  internationalizationData = internationalizationData;
  isLoadingAzureAd = signal(false);
  isLoadingCredentials = signal(false);
  body = signal({
    email: '',
    password: ''
  });

  cognito = inject(CognitoService);
  authService = inject(AuthService);
  clarityService = inject(ClarityService);
  customAlertService = inject(CustomizedAlertsFeService);
  router = inject(Router);
  rolesSE = inject(RolesService);
  webSocket = inject(WebsocketService);

  ngOnInit(): void {
    this.authService.inLogin = true;
  }

  loginWithAzureAd() {
    this.isLoadingAzureAd.set(true);

    setTimeout(() => {
      this.isLoadingAzureAd.set(false);
    }, 1500);
  }

  loginWithCredentials() {
    this.isLoadingCredentials.set(true);

    this.authService.userAuth(this.body()).subscribe({
      next: resp => {
        this.authService.localStorageToken = resp?.response?.token;
        this.authService.localStorageUser = resp?.response?.user;
        this.isLoadingCredentials.set(false);

        this.webSocket.configUser(this.authService.localStorageUser?.user_name, this.authService.localStorageUser?.id);
        this.clarityService.updateUserInfo();
        if (resp?.response?.valid) {
          this.router.navigate(['/']);
          this.rolesSE.validateReadOnly();
        }
      },
      error: err => {
        this.isLoadingCredentials.set(false);
        const statusCode = err?.error?.statusCode;
        if (statusCode == 404)
          return this.customAlertService.show({
            id: 'loginAlert',
            title: 'Oops!',
            description: this.internationalizationData.login.alerts[statusCode],
            status: 'warning'
          });
        console.error(err);
        this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: err?.error?.message, status: 'warning' });
      }
    });
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
  }
}
