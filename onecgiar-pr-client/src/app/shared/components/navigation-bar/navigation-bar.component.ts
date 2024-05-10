import { Component, OnInit } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { NavigationBarService } from '../../services/navigation-bar.service';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { AuthService } from '../../services/api/auth.service';
import { ApiService } from '../../services/api/api.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit {
  navigationOptions: PrRoute[] = routingApp;
  emailAccess = ['h.f.tobon@cgiar.org', 'admin@prms.pr', 'j.cadavid@cgiar.org', 'j.delgado@cgiar.org', 'd.casanas@cgiar.org', 'S.Galvez@cgiar.org', 'y.zuniga@cgiar.org', 'yecksin@gmail.com'];

  constructor(public api: ApiService, public _navigationBarService: NavigationBarService, private rolesSE: RolesService, private dataControlSE: DataControlService, private authSE: AuthService) {}

  ngOnInit(): void {
    window.addEventListener('scroll', e => {
      const scrollTopValue: any = window.pageYOffset || ((document.documentElement || document.body.parentNode || document.body) as any).scrollTop;
      if (scrollTopValue > 70) {
        this._navigationBarService.navbar_fixed = true;
      } else {
        this._navigationBarService.navbar_fixed = false;
      }
    });
  }

  hasAccess() {
    return !!this.emailAccess.find(email => email.toUpperCase() == this.authSE?.localStorageUser?.email.toUpperCase());
  }

  validateAdminModuleAndRole(option) {
    if (option.onlytest && environment.production) return true;
    // if (option?.path == 'ipsr' && !this.hasAccess()) return true;
    if (this.rolesSE.isAdmin) return false;
    if (option?.path == 'init-admin-module') return this.validateCoordAndLead();
    // if (option?.path == 'quality-assurance' && !this.rolesSE.isAdmin) return true;
    // if (option?.path == 'type-one-report' && !this.rolesSE.isAdmin) return true;

    return false;
  }

  validateTypeOneReport(option) {
    return option.path === 'type-one-report' && !this.api?.rolesSE?.isAdmin;
  }

  validateCoordAndLead() {
    return !this.dataControlSE.myInitiativesList.some(init => init?.role == 'Lead' || init?.role == 'Coordinator');
  }
}
