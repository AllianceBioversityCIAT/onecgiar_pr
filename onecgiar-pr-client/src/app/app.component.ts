import { Component, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
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
export class AppComponent implements OnInit, OnDestroy {
  title = 'onecgiar-pr-client';
  isProduction = environment.production;

  /** Disposer for the global partners-request click-delegation listener. */
  private partnersRequestUnlisten?: () => void;

  constructor(
    public AuthService: AuthService,
    public rolesSE: RolesService,
    public api: ApiService,
    public footerSE: FooterService,
    private ngZone: NgZone,
    private renderer: Renderer2
    // public webSocket: WebsocketService
  ) {}

  ngOnInit(): void {
    if (!this.AuthService.localStorageUser) {
      this.AuthService.inLogin.set(true);
    }

    Hotjar.init(environment.hotjarSiteId, environment.hotjarVersion);
    this.getGlobalParametersByCategory();
    this.rolesSE.validateReadOnly();

    this.registerPartnersRequestTrigger();
    this.copyTokenToClipboard();
  }

  ngOnDestroy(): void {
    this.partnersRequestUnlisten?.();
  }

  /**
   * Opens the shared partners-request modal when the user clicks any of the
   * "request a partner" anchor links embedded in [innerHTML] field descriptions
   * and IPSR alerts (`.pSelectP`, `.alert-event`, `.alert-event-2`, `.alert-event-3`).
   *
   * A single delegated document listener replaces the previous per-component
   * DOM polling (`findClassTenSeconds`) + manual `addEventListener`, which threw
   * `Cannot read properties of null` on pages where the anchor never rendered.
   * Registered outside Angular's zone so unrelated clicks don't trigger change
   * detection; re-enters the zone only when a trigger is actually matched.
   */
  private registerPartnersRequestTrigger(): void {
    this.ngZone.runOutsideAngular(() => {
      this.partnersRequestUnlisten = this.renderer.listen('document', 'click', (event: Event) => {
        const trigger = (event.target as HTMLElement)?.closest?.('.pSelectP, .alert-event, .alert-event-2, .alert-event-3, #partnerRequest');
        if (!trigger) return;
        event.preventDefault();
        this.ngZone.run(() => this.api.dataControlSE.showPartnersRequest.set(true));
      });
    });
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
      }
    };
  }

  private getGlobalParametersByCategory() {
    this.api.resultsSE.GET_platformGlobalVariables().subscribe(({ response }) => {
      this.api.globalVariablesSE.get = response;
    });
  }
}
