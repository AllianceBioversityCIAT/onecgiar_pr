import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';
import { ScienceProgramAccess, PhaseDetailData } from './phase-detail.interface';

@Component({
  selector: 'app-phase-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, InputSwitchModule, TooltipModule],
  templateUrl: './phase-detail.component.html',
  styleUrl: './phase-detail.component.scss'
})
export class PhaseDetailComponent implements OnInit {
  phaseId: number;
  isLoading = signal(true);
  isBulkUpdating = signal(false);

  phaseDetail = signal<PhaseDetailData | null>(null);
  sciencePrograms = signal<ScienceProgramAccess[]>([]);

  searchText = signal('');
  selectedCategory = signal('all');

  categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Science Programs', value: 'Science programs' },
    { label: 'Accelerators', value: 'Accelerators' },
    { label: 'Scaling Programs', value: 'Scaling programs' }
  ];

  filteredPrograms = computed(() => {
    let programs = this.sciencePrograms();
    const search = this.searchText().toLowerCase();
    const category = this.selectedCategory();

    if (search) {
      programs = programs.filter(
        p => p.name.toLowerCase().includes(search) || p.official_code.toLowerCase().includes(search)
      );
    }

    if (category !== 'all') {
      programs = programs.filter(p => p.category === category);
    }

    return programs;
  });

  openCount = computed(() => this.sciencePrograms().filter(p => p.reporting_enabled).length);
  totalCount = computed(() => this.sciencePrograms().length);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: ApiService,
    private customizedAlertsFeSE: CustomizedAlertsFeService
  ) {}

  ngOnInit(): void {
    this.phaseId = +this.route.snapshot.paramMap.get('phaseId');
    this.loadPhaseDetail();
  }

  loadPhaseDetail(): void {
    this.isLoading.set(true);
    this.api.resultsSE.GET_phaseReportingInitiatives(this.phaseId).subscribe({
      next: (res) => {
        this.phaseDetail.set(res.response.phase);
        this.sciencePrograms.set(res.response.science_programs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.customizedAlertsFeSE.show({ id: 'sp-load-error', title: 'Error loading phase details', status: 'error', closeIn: 3000 });
      }
    });
  }

  onToggleProgram(program: ScienceProgramAccess): void {
    this.sciencePrograms.update(p => [...p]);
    this.api.resultsSE.PATCH_phaseReportingInitiativeToggle(this.phaseId, program.id, { reporting_enabled: program.reporting_enabled }).subscribe({
      next: () => {
        this.api.dataControlSE.notifyReportingStatusChanged();
        this.customizedAlertsFeSE.show({
          id: 'sp-toggle',
          title: `${program.official_code} ${program.reporting_enabled ? 'opened' : 'closed'}`,
          status: 'success',
          closeIn: 500
        });
      },
      error: () => {
        program.reporting_enabled = !program.reporting_enabled;
        this.sciencePrograms.update(p => [...p]);
        this.customizedAlertsFeSE.show({ id: 'sp-toggle-error', title: 'Error updating reporting status', status: 'error', closeIn: 3000 });
      }
    });
  }

  openAll(): void {
    this.customizedAlertsFeSE.show(
      {
        id: 'sp-open-all',
        title: 'Open all Science Programs',
        description: 'Are you sure you want to enable reporting for all Science Programs and Accelerators?',
        status: 'warning',
        confirmText: 'Yes, open all'
      },
      () => {
        this.isBulkUpdating.set(true);
        this.api.resultsSE.PATCH_phaseReportingInitiativesBulk(this.phaseId, { reporting_enabled: true }).subscribe({
          next: (res) => {
            this.sciencePrograms.set(res.response);
            this.isBulkUpdating.set(false);
            this.api.dataControlSE.notifyReportingStatusChanged();
            this.customizedAlertsFeSE.show({ id: 'sp-bulk', title: 'All programs opened', status: 'success', closeIn: 500 });
          },
          error: () => {
            this.isBulkUpdating.set(false);
            this.customizedAlertsFeSE.show({ id: 'sp-bulk-error', title: 'Error opening all programs', status: 'error', closeIn: 3000 });
          }
        });
      }
    );
  }

  closeAll(): void {
    this.customizedAlertsFeSE.show(
      {
        id: 'sp-close-all',
        title: 'Close all Science Programs',
        description: 'Are you sure you want to disable reporting for all Science Programs and Accelerators?',
        status: 'warning',
        confirmText: 'Yes, close all'
      },
      () => {
        this.isBulkUpdating.set(true);
        this.api.resultsSE.PATCH_phaseReportingInitiativesBulk(this.phaseId, { reporting_enabled: false }).subscribe({
          next: (res) => {
            this.sciencePrograms.set(res.response);
            this.isBulkUpdating.set(false);
            this.api.dataControlSE.notifyReportingStatusChanged();
            this.customizedAlertsFeSE.show({ id: 'sp-bulk', title: 'All programs closed', status: 'success', closeIn: 500 });
          },
          error: () => {
            this.isBulkUpdating.set(false);
            this.customizedAlertsFeSE.show({ id: 'sp-bulk-error', title: 'Error closing all programs', status: 'error', closeIn: 3000 });
          }
        });
      }
    );
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  getInitials(code: string): string {
    if (code.startsWith('SGP')) return 'SG';
    return 'SP';
  }
}
