import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PHASE_MANAGEMENT_COPY } from '../../../../internationalization/phase-management.copy';

export type PhaseManagementTab = 'reporting' | 'innovation-package';

@Component({
  selector: 'app-phase-management',
  templateUrl: './phase-management.component.html',
  styleUrls: ['./phase-management.component.scss'],
  standalone: false
})
export class PhaseManagementComponent {
  private readonly router = inject(Router);

  readonly copy = PHASE_MANAGEMENT_COPY;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly activeTab = computed<PhaseManagementTab>(() => (this.currentUrl().includes('/innovation-package') ? 'innovation-package' : 'reporting'));

  readonly title = computed(() => (this.activeTab() === 'innovation-package' ? this.copy.ipsrTitle : this.copy.reportingTitle));
  readonly description = computed(() => (this.activeTab() === 'innovation-package' ? this.copy.ipsrDescription : this.copy.reportingDescription));
}
