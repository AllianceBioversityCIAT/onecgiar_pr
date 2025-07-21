import { Component, OnDestroy, OnInit } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-navigation-bar',
    templateUrl: './navigation-bar.component.html',
    styleUrls: ['./navigation-bar.component.scss'],
    standalone: false
})
export class NavigationBarComponent implements OnInit, OnDestroy {
  navigationOptions: PrRoute[] = routingApp;
  isSticky = false;
  private ticking = false;

  constructor(
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

  ngOnInit() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  onScroll = () => {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.isSticky = window.scrollY > 70;
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

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
