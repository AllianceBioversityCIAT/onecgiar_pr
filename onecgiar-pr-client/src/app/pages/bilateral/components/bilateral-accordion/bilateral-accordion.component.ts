import { Component, input, inject, signal, effect, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralExpandableStateService } from '../../services/bilateral-expandable-state.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { MdsStatus } from '../../services/bilateral-mds-tracker.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';

@Component({
  selector: 'app-bilateral-accordion',
  imports: [CommonModule, FormSkeletonComponent],
  templateUrl: './bilateral-accordion.component.html',
  styleUrl: './bilateral-accordion.component.scss'
})
export class BilateralAccordionComponent {
  sectionName = input.required<string>();
  sectionLabel = input.required<string>();
  sectionIcon = input<string>('folder');
  totalFields = input<number>(0);
  filledFields = input<number>(0);
  mdsStatus = input<MdsStatus>('empty');
  resultId = input<number | null>(null);
  openSectionName = model<string | null>(null);
  showTracker = input<boolean>(true);

  private readonly expandStateService = inject(BilateralExpandableStateService);
  /**
   * `APF-T-7` rework: optional. `BilateralAutoSaveService` is `@Injectable()` with **no**
   * `providedIn: 'root'` — its only provider in the tree is component-level on
   * `bilateral-result-creator.component.ts`. This accordion is also reused by
   * `app-bilateral-sp-selector`'s "Contributing Science Programs" disclosure (`APF-DD-11`), which
   * is mounted from `bilateral-manual-create-drawer-host` → `bilateral-projects-panel` — outside
   * that provider's scope. A required `inject()` there threw `NullInjectorError` the moment a user
   * picked a primary SP with secondary SPs available, taking the drawer down. `{ optional: true }`
   * keeps every existing (result-creator) host's autosave-then-close behaviour unchanged and makes
   * `toggle()` null-safe for hosts with no autosave scope.
   */
  private readonly autoSaveService = inject(BilateralAutoSaveService, { optional: true });
  readonly creationService = inject(BilateralCreationService);

  showAllFields = signal(false);

  get isOpen(): boolean {
    return this.openSectionName() === this.sectionName();
  }

  constructor() {
    effect(() => {
      const rid = this.resultId();
      const name = this.sectionName();
      if (rid && name) {
        this.showAllFields.set(this.expandStateService.getShowAllFields(rid, name));
      }
    });
  }

  toggle(): void {
    if (this.isOpen) {
      const flushed = this.autoSaveService?.flush() ?? Promise.resolve();
      flushed.then(() => {
        this.openSectionName.set(null);
      });
    } else {
      this.openSectionName.set(this.sectionName());
    }
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    const rid = this.resultId();
    const name = this.sectionName();
    if (rid) this.expandStateService.setShowAllFields(rid, name, this.showAllFields());
  }
}
