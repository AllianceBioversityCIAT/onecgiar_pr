import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, input, output, signal, viewChild } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Default,
  host: {
    '[class.search_active]': 'isSearchMode()'
  }
})
export class NavigationBarComponent {
  readonly navigationOptions = signal<PrRoute[]>(routingApp);
  readonly isSearchMode = input(false);
  readonly searchClosed = output<void>();
  readonly searchQuery = signal('');

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

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

  constructor() {
    effect(() => {
      if (this.isSearchMode()) {
        setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
      } else {
        this.searchQuery.set('');
      }
    });
  }

  closeSearch() {
    this.searchQuery.set('');
    this.searchClosed.emit();
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
