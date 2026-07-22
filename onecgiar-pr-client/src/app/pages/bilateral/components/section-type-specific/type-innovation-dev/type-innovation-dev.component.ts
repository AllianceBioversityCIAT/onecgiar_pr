import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';

const TOTAL_FIELDS = 4;

@Component({
  selector: 'app-type-innovation-dev',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-innovation-dev.component.html',
  styleUrl: './type-innovation-dev.component.scss',
})
export class TypeInnovationDevComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);

  body: any = {};
  readinessLevels: any[] = [];
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');

  readonly typologies = [
    { code: 12, label: 'Product innovation' },
    { code: 13, label: 'Process innovation' },
    { code: 14, label: 'Organizational innovation' },
    { code: 15, label: 'Marketing innovation' },
  ];

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationDev(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
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
      executor: (resultId, body) => this.bilateralApi.PATCH_innovationDev(resultId, body),
    });
  }

  updateMds(): void {
    const filled =
      (this.body.short_title ? 1 : 0) +
      (this.body.innovation_characterization_id ? 1 : 0) +
      (this.body.innovation_readiness_level_id ? 1 : 0) +
      (this.body.innovation_developers?.trim() ? 1 : 0);
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
