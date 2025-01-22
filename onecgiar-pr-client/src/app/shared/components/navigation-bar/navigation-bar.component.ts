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

  constructor(
    public api: ApiService,
    public _navigationBarService: NavigationBarService,
    public rolesSE: RolesService,
    public dataControlSE: DataControlService,
    public authSE: AuthService
  ) {}

  ngOnInit(): void {
    window.addEventListener('scroll', e => {
      const scrollTopValue: number = window.scrollY || ((document.documentElement || document.body.parentNode || document.body) as any).scrollTop;
      if (scrollTopValue > 70) {
        this._navigationBarService.navbar_fixed = true;
      } else {
        this._navigationBarService.navbar_fixed = false;
      }
    });
  }

  validateAdminModuleAndRole(option) {
    if (option.onlytest && environment.production) return true;
    if (this.rolesSE.isAdmin) return false;
    if (option?.path == 'init-admin-module') return this.validateCoordAndLead();
    return false;
  }

  validateTypeOneReport(option) {
    return option.path === 'type-one-report' && !this.api?.rolesSE?.isAdmin;
  }

  validateCoordAndLead() {
    return !this.dataControlSE.myInitiativesList.some(init => init?.role == 'Lead' || init?.role == 'Coordinator');
  }
}
