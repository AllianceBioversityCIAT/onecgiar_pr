import { Component } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent {
  navigationOptions: PrRoute[] = routingApp;

  constructor(
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

  validateAdminModuleAndRole(option) {
    if (option.onlytest && environment.production) return true;
    if (this.rolesSE.isAdmin) return false;
    if (option?.path == 'init-admin-module') return this.validateCoordAndLead();
    return false;
  }

  validateCoordAndLead() {
    return !this.dataControlSE.myInitiativesList.some(init => init?.role == 'Lead' || init?.role == 'Coordinator');
  }
}
