import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';

const TOTAL_FIELDS = 4;

@Component({
  selector: 'app-type-capacity-sharing',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-capacity-sharing.component.html',
  styleUrl: './type-capacity-sharing.component.scss',
})
export class TypeCapacitySharingComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);

  body: any = {};
  deliveryMethods: any[] = [];
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_capacityDevelopment(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
    this.bilateralApi.GET_capdevsDeliveryMethod().subscribe(({ response }) => {
      this.deliveryMethods = response || [];
    });
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    this.autoSave.schedulePayload('typeSpecific', { ...this.body }, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_capacityDevelopment(resultId, body),
    });
  }

  updateMds(): void {
    const filled =
      (this.body.female_using != null ? 1 : 0) +
      (this.body.male_using != null ? 1 : 0) +
      (this.body.non_binary_using != null ? 1 : 0) +
      (this.body.capdev_delivery_method_id ? 1 : 0);
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
