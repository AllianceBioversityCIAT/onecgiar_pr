import { Component, OnInit } from '@angular/core';
import Hotjar from '@hotjar/browser';
import { AuthService } from './shared/services/api/auth.service';
import { environment } from '../environments/environment';
import { RolesService } from './shared/services/global/roles.service';
import { ApiService } from './shared/services/api/api.service';
import { FooterService } from './shared/components/footer/footer.service';
// import { WebsocketService } from './sockets/websocket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'onecgiar-pr-client';
  isProduction = environment.production;

  constructor(
    public AuthService: AuthService,
    public rolesSE: RolesService,
    public api: ApiService,
    public footerSE: FooterService
    // public webSocket: WebsocketService
  ) {}

  ngOnInit(): void {
    if (!this.AuthService.localStorageUser) {
      this.AuthService.inLogin.set(true);
    }

    Hotjar.init(environment.hotjarSiteId, environment.hotjarVersion);
    this.getGlobalParametersByCategory();
    this.rolesSE.validateReadOnly();

    this.api.dataControlSE.findClassTenSeconds('pSelectP').then(resp => {
      try {
        document.querySelector('.pSelectP').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
    this.copyTokenToClipboard();
  }

  copyTokenToClipboard() {
    if (environment.production) return;
    const AUTH_KEYS = ['token', 'user', 'roles'];

    document.onkeydown = function (e: KeyboardEvent) {
      if (!e.altKey) return;

      if (e.code === 'KeyT') {
        e.preventDefault();
        const data: Record<string, string> = {};
        AUTH_KEYS.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) data[key] = value;
        });
        navigator.clipboard.writeText(JSON.stringify(data));
        return;
      }

      if (e.code === 'KeyP') {
        e.preventDefault();
        navigator.clipboard
          .readText()
          .then(text => {
            const data = JSON.parse(text);
            Object.entries(data).forEach(([key, value]) => {
              localStorage.setItem(key, value as string);
            });
            window.location.reload();
          })
          .catch(err => console.error('[DevSession] Paste failed:', err));
        return;
      }
    };
  }

  private getGlobalParametersByCategory() {
    this.api.resultsSE.GET_platformGlobalVariables().subscribe(({ response }) => {
      this.api.globalVariablesSE.get = response;
    });
  }
}
