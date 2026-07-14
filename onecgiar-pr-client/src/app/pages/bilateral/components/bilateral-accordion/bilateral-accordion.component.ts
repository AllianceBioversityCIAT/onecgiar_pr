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

  private readonly expandStateService = inject(BilateralExpandableStateService);
  private readonly autoSaveService = inject(BilateralAutoSaveService);
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
      this.autoSaveService.flush().then(() => {
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
