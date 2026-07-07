import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { PrRoute, extraRoutingApp, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default
})
export class NavigationBarComponent {
  readonly navigationOptions = signal<PrRoute[]>(routingApp);
  readonly isSearchMode = signal(false);
  readonly searchQuery = signal('');

  readonly allSections = computed<PrRoute[]>(() => {
    return [...routingApp, ...extraRoutingApp].filter(
      o => o.prName && !o.prHide && !this.validateAdminModuleAndRole(o)
    );
  });

  readonly filteredSections = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allSections();
    return this.allSections().filter(s => s.prName.toLowerCase().includes(q));
  });

  public readonly rolesSE = inject(RolesService);
  public readonly dataControlSE = inject(DataControlService);
  public readonly router = inject(Router);

  toggleSearch() {
    this.isSearchMode.update(v => !v);
    if (!this.isSearchMode()) {
      this.searchQuery.set('');
    }
  }

  openSearch() {
    this.isSearchMode.set(true);
  }

  closeSearch() {
    this.isSearchMode.set(false);
    this.searchQuery.set('');
  }

  selectSection(route: PrRoute) {
    this.closeSearch();
    this.router.navigate([route.path]);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isSearchMode()) {
      this.closeSearch();
    }
  }

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
