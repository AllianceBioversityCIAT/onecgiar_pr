import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-type-innovation-dev',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './type-innovation-dev.component.html',
  styleUrl: './type-innovation-dev.component.scss',
})
export class TypeInnovationDevComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  readonly innovationControlListSE = inject(InnovationControlListService);

  body: any = {};
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');

  ngOnInit(): void {
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
    this.autoSave.schedulePayload('typeSpecific', this.buildPayload(), {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_innovationDev(resultId, body),
    });
  }

  private buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      short_title: this.body.short_title ?? null,
      innovation_nature_id: this.body.innovation_nature_id ?? null,
      innovation_developers: this.body.innovation_developers ?? null,
      innovation_readiness_level_id: this.body.innovation_readiness_level_id ?? null,
    };
    // Omit null PK so the server can AUTO_INCREMENT on first create.
    if (this.body.result_innovation_dev_id != null) {
      payload['result_innovation_dev_id'] = this.body.result_innovation_dev_id;
    }
    return payload;
  }

  updateMds(): void {
    this.mdsTracker.setSectionFields('type-specific', [
      { key: 'short-title', label: 'Short title', filled: !!this.body.short_title },
      {
        key: 'nature',
        label: 'Innovation typology (nature)',
        filled: this.body.innovation_nature_id != null,
      },
      {
        key: 'developers',
        label: 'Innovation developer',
        filled: !!this.body.innovation_developers?.trim(),
      },
      {
        key: 'readiness',
        label: 'Readiness level',
        filled: this.body.innovation_readiness_level_id != null,
      },
    ]);
  }
}
