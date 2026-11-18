// @akili-spec changes/admin-reminders-page (ARP-T-1)
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { HlmBreadcrumbImports } from '@spartan/breadcrumb';
import { HlmTabsImports } from '@spartan/tabs';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../internationalization/replicated-innovation-reminders.copy';
import { CenterFocalPointsComponent } from './components/center-focal-points/center-focal-points.component';
import { ReplicatedInnovationRemindersComponent } from './components/replicated-innovation-reminders/replicated-innovation-reminders.component';

export type RemindersTab = 'reminders' | 'focalPoints';

/**
 * Admin module -> Reminders. Owns the page header and the two tabs; both panels stay mounted
 * (hidden, not destroyed) so the focal points load once on open and report their missing count
 * before their tab is opened (ARP-R-2, ARP-NFR-3, ARP-DD-3).
 */
@Component({
  selector: 'app-reminders-page',
  imports: [HlmBreadcrumbImports, HlmTabsImports, ReplicatedInnovationRemindersComponent, CenterFocalPointsComponent],
  templateUrl: './reminders-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RemindersPageComponent {
  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY.page;

  readonly activeTab = signal<RemindersTab>('reminders');
  /** Null until the focal points report; stays null on loading/error. */
  readonly missingCount = signal<number | null>(null);
  readonly showMissing = computed(() => (this.missingCount() ?? 0) > 0);

  setTab(tab: string): void {
    this.activeTab.set(tab === 'focalPoints' ? 'focalPoints' : 'reminders');
  }
}
