import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.Default
})
export class NavigationBarComponent {
  readonly navigationOptions = signal<PrRoute[]>(routingApp);

  public readonly rolesSE = inject(RolesService);
  public readonly dataControlSE = inject(DataControlService);
  public readonly router = inject(Router);

  validateAdminModuleAndRole(option: PrRoute): boolean {
    if (option?.onlyTest && environment.production) return true;

    if (this?.rolesSE?.isAdmin) return false;

    if (option?.path === 'init-admin-module') return this.validateCoordAndLead();

    return false;
  }

  validateCoordAndLead(): boolean {
    const initiatives = this.dataControlSE?.myInitiativesList ?? [];
    const hasLeadOrCoordinator = initiatives.some(init => init?.role === 'Lead' || init?.role === 'Coordinator');
    return !hasLeadOrCoordinator;
  }
}
