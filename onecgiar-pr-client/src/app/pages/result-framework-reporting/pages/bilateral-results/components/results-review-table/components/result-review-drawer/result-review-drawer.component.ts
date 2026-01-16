import { ChangeDetectionStrategy, Component, effect, model, OnDestroy, OnInit, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

export interface ResultToReview {
  id: string;
  project_id: string;
  project_name: string;
  result_code: string;
  result_title: string;
  indicator_category: string;
  status_name: string;
  acronym: string;
  toc_title: string;
  indicator: string;
  submission_date: string;
}

export interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}

interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-result-review-drawer',
  imports: [DrawerModule, CommonModule, FormsModule, RadioButtonModule, SelectModule, ButtonModule, DialogModule, TextareaModule],
  templateUrl: './result-review-drawer.component.html',
  styleUrl: './result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultReviewDrawerComponent implements OnInit, OnDestroy {
  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);

  // TOC Alignment fields
  tocAlignmentValue: boolean = true;
  selectedTocResult: string | null = null;
  selectedIndicator: string | null = null;
  rejectJustification: string = '';

  // Dialog state
  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);

  // Dropdown options (TODO: these should come from API)
  tocResultOptions: SelectOption[] = [
    { label: 'AOW01 - Evidence generated to support policy development in Africa and Asia', value: 'aow01' },
    { label: 'AOW02 - New wheat varieties adopted by farmers in target regions', value: 'aow02' },
    { label: 'AOW03 - Enhanced seed systems supporting wheat production', value: 'aow03' },
    { label: 'AOW04 - Small-scale producers and other actors use climate advisory services...', value: 'aow04' },
    { label: 'AOW05 - Climate-smart farming innovations with evidence at scale', value: 'aow05' },
    { label: 'AOW06 - Early warning systems for wheat diseases implemented', value: 'aow06' }
  ];

  indicatorOptions: SelectOption[] = [
    { label: 'Number of small-scale producers using climate services', value: 'ind01' },
    { label: 'Number of farmers adopting new learning resources', value: 'ind02' },
    { label: 'Number of policy instruments influenced by research', value: 'ind03' },
    { label: 'Number of innovations sessions delivered', value: 'ind04' }
  ];

  constructor() {
    effect(() => {
      const result = this.resultToReview();
      if (result && this.visible()) {
        this.initializeFormFromResult(result);
      }
    });
  }

  private initializeFormFromResult(result: ResultToReview): void {
    this.tocAlignmentValue = true;
    this.selectedTocResult = result.acronym || null;
    this.selectedIndicator = null;
  }

  toggleFullScreen(): void {
    this.drawerFullScreen.set(!this.drawerFullScreen());
  }

  closeDrawer(): void {
    this.visible.set(false);
    this.drawerFullScreen.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.rejectJustification = '';
    this.showConfirmApproveDialog.set(false);
    this.showConfirmRejectDialog.set(false);
  }

  saveTocChanges(): void {
    // TODO: Implement API call to save TOC changes
  }

  onApprove(): void {
    this.showConfirmApproveDialog.set(true);
  }

  confirmApprove(): void {
    const result = this.resultToReview();
    const formData = {
      action: 'APPROVE',
      result_id: result?.id,
      result_code: result?.result_code,
      toc_alignment: {
        is_aligned: this.tocAlignmentValue,
        toc_result_id: this.selectedTocResult,
        indicator_id: this.selectedIndicator
      }
    };

    // TODO: Implement API call to approve result with formData

    this.showConfirmApproveDialog.set(false);
    this.closeDrawer();
  }

  cancelApprove(): void {
    this.showConfirmApproveDialog.set(false);
  }

  onReject(): void {
    this.showConfirmRejectDialog.set(true);
  }

  confirmReject(): void {
    if (!this.rejectJustification.trim()) {
      return;
    }

    const result = this.resultToReview();
    const formData = {
      action: 'REJECT',
      result_id: result?.id,
      result_code: result?.result_code,
      rejection_justification: this.rejectJustification
    };

    // TODO: Implement API call to reject result with formData

    this.showConfirmRejectDialog.set(false);
    this.closeDrawer();
  }

  cancelReject(): void {
    this.showConfirmRejectDialog.set(false);
    this.rejectJustification = '';
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}
