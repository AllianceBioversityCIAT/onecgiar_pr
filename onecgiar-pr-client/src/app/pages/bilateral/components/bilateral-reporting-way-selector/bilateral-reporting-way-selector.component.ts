import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

type ReportingWay = 'ai' | 'manual' | 'bulk';

interface ReportingWayOption {
  id: ReportingWay;
  icon: string;
  label: string;
  title: string;
  description: string;
  enabled: boolean;
  badge?: string;
}

@Component({
  selector: 'app-bilateral-reporting-way-selector',
  imports: [CommonModule],
  templateUrl: './bilateral-reporting-way-selector.component.html',
  styleUrl: './bilateral-reporting-way-selector.component.scss'
})
export class BilateralReportingWaySelectorComponent {
  isLoading = input(false);
  waySelected = output<ReportingWay>();

  options: ReportingWayOption[] = [
    {
      id: 'ai',
      icon: 'auto_awesome',
      label: 'AI-Assisted',
      title: 'Reuse Information Without Duplicating Effort',
      description: 'Leverage existing result information, uploaded documents, or previously reported data to accelerate bilateral result creation using intelligent recommendations.',
      enabled: false,
      badge: 'Coming soon'
    },
    {
      id: 'manual',
      icon: 'assignment',
      label: 'Complete the Form Manually',
      title: 'Create a bilateral result step by step by manually completing the reporting form.',
      description: '',
      enabled: true
    },
    {
      id: 'bulk',
      icon: 'upload_file',
      label: 'Bulk Upload Results',
      title: 'Upload multiple bilateral results at once using the PRMS bulk upload template.',
      description: '',
      enabled: false,
      badge: 'Coming soon'
    }
  ];

  selectWay(option: ReportingWayOption): void {
    if (!option.enabled || this.isLoading()) return;
    this.waySelected.emit(option.id);
  }
}
