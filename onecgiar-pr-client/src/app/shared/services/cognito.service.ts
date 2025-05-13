import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClarityService } from './clarity.service';
import { environment } from '../../../environments/environment';
import { ApiService } from './api/api.service';
import { AuthService } from './api/auth.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import { WebsocketService } from '../../sockets/websocket.service';
@Injectable({
  providedIn: 'root'
})
export class CognitoService {
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  clarity = inject(ClarityService);
  authService = inject(AuthService);
  customAlertService = inject(CustomizedAlertsFeService);
  webSocket = inject(WebsocketService);
  isLoadingAzureAd = signal(false);

  redirectToCognito() {
    window.location.href = environment.cognitoUrl;
  }

  async loginWithAzureAd() {
    if (this.isLoadingAzureAd()) return;

    this.isLoadingAzureAd.set(true);

    const res = await this.api.resultsSE.loginWithAzureAd(15, 'CGIAR-AzureAD').then(res => res.json());

    if (!res.authUrl) {
      this.customAlertService.show({
        id: 'loginAlert',
        title: 'Oops!',
        description: 'Error while trying to login with Azure AD',
        status: 'warning'
      });
      this.isLoadingAzureAd.set(false);

      return;
    }

    window.location.href = res.authUrl;

    this.isLoadingAzureAd.set(false);
  }

  async validateCognitoCode() {
    const { code } = this.activatedRoute.snapshot.queryParams ?? {};

    if (!code) return;
    // this.cache.isValidatingToken.set(true);
    // const loginResponse = await this.api.login(code);
    // if (!loginResponse.successfulRequest) {
    //   // this.actions.showGlobalAlert({
    //   //   severity: 'error',
    //   //   summary: 'Error authenticating',
    //   //   detail: loginResponse.errorDetail.errors,
    //   //   confirmCallback: {
    //   //     label: 'Retry Log in',
    //   //     event: () => this.redirectToCognito()
    //   //   }
    //   // });
    //   return;
    // }
  }

  updateCacheService(resp: any) {
    // this.cache.dataCache.set(localStorage.getItem('data') ? JSON.parse(localStorage.getItem('data') ?? '') : {});
    // this.cache.isLoggedIn.set(true);
    // this.cache.isValidatingToken.set(false);

    this.clarity.updateUserInfo();

    this.authService.localStorageToken = resp?.response?.token;
    this.authService.localStorageUser = resp?.response?.user;
    this.webSocket.configUser(this.authService.localStorageUser?.user_name, this.authService.localStorageUser?.id);
    this.clarity.updateUserInfo();
  }
}
