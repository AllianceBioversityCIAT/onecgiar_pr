import { Component, OnInit } from '@angular/core';
import { AuthService } from './shared/services/api/auth.service';
import { environment } from '../environments/environment';
import { RolesService } from './shared/services/global/roles.service';
import { ApiService } from './shared/services/api/api.service';
import { FooterService } from './shared/components/footer/footer.service';
import { RouterOutlet } from '@angular/router';
import { NavigationBarComponent } from './shared/components/navigation-bar/navigation-bar.component';
import { HeaderPanelComponent } from './shared/components/header-panel/header-panel.component';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { TestEnvironmentLabelComponent } from './shared/components/test-environment-label/test-environment-label.component';
import { TawkComponent } from './shared/components/tawk/tawk.component';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';
import { ShareRequestModalComponent } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    NavigationBarComponent,
    HeaderPanelComponent,
    ExternalToolsComponent,
    TestEnvironmentLabelComponent,
    TawkComponent,
    GoogleAnalyticsComponent,
    ShareRequestModalComponent,
    FooterComponent,
    DialogModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'onecgiar-pr-client';
  isProduction = environment.production;
  constructor(
    public AuthService: AuthService,
    public rolesSE: RolesService,
    public api: ApiService,
    public footerSE: FooterService
  ) {}
  ngOnInit(): void {
    this.getGlobalParametersByCategory();
    setTimeout(() => {
      if (!this.AuthService.inLogin) this.rolesSE.validateReadOnly();
    }, 500);

    this.api.dataControlSE.findClassTenSeconds('pSelectP').then(resp => {
      try {
        document.querySelector('.pSelectP').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
    this.copyTokenToClipboard();
  }

  copyTokenToClipboard() {
    if (environment.production) return;
    document.onkeyup = function () {
      var e = e || window.event;
      if (e.altKey && e.which == 84) {
        console.log('event');
        navigator.clipboard.writeText(localStorage.getItem('token'));
        alert('Token copied to clipboard');
        return false;
      }
      return false;
    };
  }

  private getGlobalParametersByCategory() {
    this.api.resultsSE
      .GET_platformGlobalVariables()
      .subscribe(({ response }) => {
        this.api.globalVariablesSE.get = response;
      });
  }
}
