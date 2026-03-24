import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { InnovationControlListService } from '../../../../../../../../../../shared/services/global/innovation-control-list.service';

@Component({
  selector: 'app-inno-dev-content',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './inno-dev-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InnoDevContentComponent implements OnInit, OnDestroy {
  @Input() disabled: boolean = false;
  @Input() set resultDetail(value: BilateralResultDetail) {
    if (!value) {
      this._resultDetail = value;
      return;
    }

    if (!value.resultTypeResponse || !Array.isArray(value.resultTypeResponse) || value.resultTypeResponse.length === 0) {
      value.resultTypeResponse = [{
        result_innovation_dev_id: null,
        innovation_nature_id: null,
        innovation_type_id: null,
        innovation_type_name: null,
        innovation_developers: null,
        innovation_readiness_level_id: null,
        readinness_level_id: null,
        level: null,
        name: null
      } as any];
    } else {
      const firstItem: any = value.resultTypeResponse[0];
      if (firstItem.innovation_nature_id === undefined) firstItem.innovation_nature_id = null;
      if (firstItem.innovation_type_id === undefined) firstItem.innovation_type_id = null;
      if (firstItem.innovation_type_name === undefined) firstItem.innovation_type_name = null;
      if (firstItem.innovation_developers === undefined) firstItem.innovation_developers = null;
      if (firstItem.innovation_readiness_level_id === undefined) firstItem.innovation_readiness_level_id = null;
      if (firstItem.readinness_level_id === undefined) firstItem.readinness_level_id = null;
      if (firstItem.level === undefined) firstItem.level = null;
      if (firstItem.name === undefined) firstItem.name = null;
    }

    this._resultDetail = value;
    this.cdr.markForCheck();
    queueMicrotask(() => this.cdr.markForCheck());
  }
  get resultDetail(): BilateralResultDetail {
    return this._resultDetail;
  }
  private _resultDetail: BilateralResultDetail;

  private readonly cdr = inject(ChangeDetectorRef);
  innovationControlListSE = inject(InnovationControlListService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.innovationControlListSE.readinessLevelsLoaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  readinessDescription(): string {
    return 'Use the slider to select the appropriate readiness level. Readiness levels range from 1 (basic research) to 9 (proven in operational environment).';
  }
}
