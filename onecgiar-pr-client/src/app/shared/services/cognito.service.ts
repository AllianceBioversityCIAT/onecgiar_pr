import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// import { CacheService } from './cache.service';
// import { ApiService } from './api.service';
// import { ActionsService } from './actions.service';
import { ClarityService } from './clarity.service';
import { environment } from '../../../environments/environment';
import { ApiService } from './api/api.service';
import { AuthService } from './api/auth.service';
import { CustomizedAlertsFeService } from './customized-alerts-fe.service';
import { RolesService } from './global/roles.service';
import { WebsocketService } from '../../sockets/websocket.service';
import { internationalizationData } from '../data/internationalization-data';
import { UserAuth } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class CognitoService {
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  // cache = inject(CacheService);
  api = inject(ApiService);
  // actions = inject(ActionsService);
  clarity = inject(ClarityService);
  authService = inject(AuthService);
  customAlertService = inject(CustomizedAlertsFeService);
  webSocket = inject(WebsocketService);
  rolesSE = inject(RolesService);
  internationalizationData = internationalizationData;
  userLoginData = new UserAuth();

  redirectToCognito() {
    window.location.href = environment.cognitoUrl;
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

    this.authService.userAuth(this.userLoginData).subscribe({
      next: resp => {
        // this.successLogin = true;
        this.updateCacheService(resp);
        setTimeout(() => {
          this.router.navigate(['/']);
          this.rolesSE.validateReadOnly();
        }, 2000);
      },
      error: err => {
        const statusCode = err?.error?.statusCode;
        if (statusCode == 404)
          return this.customAlertService.show(
            {
              id: 'loginAlert',
              title: 'Oops!',
              description: this.internationalizationData.login.alerts[statusCode],
              status: 'warning',
              confirmText: 'Contact us'
            },
            () => {
              document.getElementById('question').click();
              this.customAlertService.closeAction('loginAlert');
            }
          );
        console.error(err);
        this.customAlertService.show(
          {
            id: 'loginAlert',
            title: 'Oops!',
            description: err?.error?.message,
            status: 'warning',
            confirmText: 'Retry Log in',
            hideCancelButton: true
          },
          () => {
            this.redirectToCognito();
          }
        );
      }
    });

    // this.actions.updateLocalStorage(loginResponse);
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
