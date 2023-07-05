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
  constructor(public AuthService: AuthService, public rolesSE: RolesService, private api: ApiService, public footerSE: FooterService) {}
  ngOnInit(): void {
    // this.AuthService.inLogin = false;
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
  }
}
