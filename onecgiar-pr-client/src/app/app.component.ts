import { Component, OnInit } from '@angular/core';
import { AuthService } from './shared/services/api/auth.service';
import { environment } from '../environments/environment';
import { RolesService } from './shared/services/global/roles.service';
import { ApiService } from './shared/services/api/api.service';
import { FooterService } from './shared/components/footer/footer.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'onecgiar-pr-client';
  isProduction = environment.production;
  constructor(public AuthService: AuthService, public rolesSE: RolesService, public api: ApiService, public footerSE: FooterService) {}
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
      } catch (error) {
        console.error(error);
      }
    });
    this.copyTokenToClipboard();
  }

  copyTokenToClipboard() {
    if (environment.production) return;
    document.onkeyup = function () {
      var e = e || window.event;
      if (e.altKey && e.which == 84) {
        navigator.clipboard.writeText(localStorage.getItem('token'));
        alert('Token copied to clipboard');
        return false;
      }
      return false;
    };
  }

  private getGlobalParametersByCategory() {
    this.api.resultsSE.GET_platformGlobalVariables().subscribe(({ response }) => {
      this.api.globalVariablesSE.get = response;
    });
  }
}
