import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClarityService } from './clarity.service';
import { ApiService } from './api/api.service';
import { AuthService } from './api/auth.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import { WebsocketService } from '../../sockets/websocket.service';
import { RolesService } from './global/roles.service';
import { UserAuth } from '../interfaces/user.interface';
import { internationalizationData } from '../data/internationalization-data';
import { environment } from '../../../environments/environment';
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
  webSocket = inject(WebsocketService);
  rolesSE = inject(RolesService);

  loginWithAzureAd() {
    if (this.isLoadingAzureAd()) return;

    this.isLoadingAzureAd.set(true);

    this.api.resultsSE.GET_loginWithAzureAd(environment.production ? 'CGIAR-Account' : 'CGIAR-AzureAD').subscribe({
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

    this.api.resultsSE.POST_validateCognitoCode(code).subscribe({
      next: res => {
        this.updateCacheService(res);
        this.redirectToHome();
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

  updateCacheService(resp: any) {
    this.authService.localStorageToken = resp?.response?.token;
    this.authService.localStorageUser = resp?.response?.user;
    this.webSocket.configUser(this.authService.localStorageUser?.user_name, this.authService.localStorageUser?.id);
    this.clarity.updateUserInfo();
    this.rolesSE.validateReadOnly();
  }

  redirectToHome() {
    // setTimeout(() => {
    this.router.navigate(['/']);
    // }, 1000);
  }
}
