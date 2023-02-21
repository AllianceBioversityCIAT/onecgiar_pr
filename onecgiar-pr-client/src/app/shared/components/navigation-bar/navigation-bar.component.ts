import { Component, OnInit } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { NavigationBarService } from '../../services/navigation-bar.service';
import { RolesService } from '../../services/global/roles.service';
import { environment } from 'src/environments/environment';
import { DataControlService } from '../../services/data-control.service';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit {
  navigationOptions: PrRoute[] = routingApp;
  constructor(public _navigationBarService: NavigationBarService, private rolesSE: RolesService, private dataControlSE: DataControlService) {}

  ngOnInit(): void {
    window.addEventListener('scroll', e => {
      let scrollTopValue: any = window.pageYOffset || ((document.documentElement || document.body.parentNode || document.body) as any).scrollTop;
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
    // if (option?.path == 'quality-assurance' && !this.rolesSE.isAdmin) return true;
    if (option?.path == 'type-one-report' && !this.rolesSE.isAdmin) return true;
    return false;
  }

  validateCoordAndLead() {
    return !this.dataControlSE.myInitiativesList.some(init => init?.role == 'Lead' || init?.role == 'Coordinator');
  }
}
