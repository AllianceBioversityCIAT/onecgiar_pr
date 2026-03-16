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

    // TODO: Replace with real API call
    // this.api.resultsSE.GET_phaseSciencePrograms(this.phaseId).subscribe({...})
    setTimeout(() => {
      this.phaseDetail.set({
        id: this.phaseId,
        phase_name: 'Reporting 2025',
        phase_year: 2025,
        status: true,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        portfolio: {
          id: 1,
          name: 'CGIAR portfolio 2022-2025',
          acronym: 'P25'
        }
      });

      this.sciencePrograms.set([
        { id: 1, official_code: 'SGP-02', name: 'AVISA', category: 'Science programs', reporting_enabled: true, color: '#f59e0b' },
        { id: 2, official_code: 'SP01', name: 'Breeding for Tomorrow', category: 'Science programs', reporting_enabled: true, color: '#ef4444' },
        { id: 3, official_code: 'SP02', name: 'Sustainable Farming', category: 'Science programs', reporting_enabled: true, color: '#84cc16' },
        { id: 4, official_code: 'SP03', name: 'Sustainable Animal and Aquatic Foods', category: 'Science programs', reporting_enabled: false, color: '#fb923c' },
        { id: 5, official_code: 'SP04', name: 'Multifunctional Landscapes', category: 'Science programs', reporting_enabled: true, color: '#10b981' },
        { id: 6, official_code: 'SP05', name: 'Better Diets and Nutrition', category: 'Science programs', reporting_enabled: true, color: '#92400e' },
        { id: 7, official_code: 'SP06', name: 'Climate Action', category: 'Science programs', reporting_enabled: true, color: '#3b82f6' },
        { id: 8, official_code: 'SP07', name: 'Policy Innovations', category: 'Science programs', reporting_enabled: true, color: '#f59e0b' },
        { id: 9, official_code: 'SP08', name: 'Food Frontiers and Security', category: 'Science programs', reporting_enabled: false, color: '#06b6d4' },
        { id: 10, official_code: 'SP09', name: 'Scaling for Impact', category: 'Scaling programs', reporting_enabled: true, color: '#a855f7' },
        { id: 11, official_code: 'SP10', name: 'Gender Equality and Inclusion', category: 'Accelerators', reporting_enabled: true, color: '#ec4899' },
        { id: 12, official_code: 'SP11', name: 'Capacity Sharing', category: 'Accelerators', reporting_enabled: true, color: '#8b5cf6' },
        { id: 13, official_code: 'SP12', name: 'Digital Transformation', category: 'Accelerators', reporting_enabled: true, color: '#d946ef' },
        { id: 14, official_code: 'SP13', name: 'Genebank', category: 'Accelerators', reporting_enabled: true, color: '#65a30d' }
      ]);

      this.isLoading.set(false);
    }, 500);
  }

  onToggleProgram(program: ScienceProgramAccess): void {
    // TODO: Replace with real API call
    // this.api.resultsSE.PATCH_phaseScienceProgramToggle(this.phaseId, program.id, { reporting_enabled: program.reporting_enabled }).subscribe({...})
    this.customizedAlertsFeSE.show({
      id: 'sp-toggle',
      title: `${program.official_code} ${program.reporting_enabled ? 'opened' : 'closed'}`,
      status: 'success',
      closeIn: 500
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
        // TODO: Replace with real API call
        // this.api.resultsSE.PATCH_phaseScienceProgramsBulk(this.phaseId, { reporting_enabled: true }).subscribe({...})
        this.sciencePrograms.update(programs => programs.map(p => ({ ...p, reporting_enabled: true })));
        this.isBulkUpdating.set(false);
        this.customizedAlertsFeSE.show({
          id: 'sp-bulk',
          title: 'All programs opened',
          status: 'success',
          closeIn: 500
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
        // TODO: Replace with real API call
        // this.api.resultsSE.PATCH_phaseScienceProgramsBulk(this.phaseId, { reporting_enabled: false }).subscribe({...})
        this.sciencePrograms.update(programs => programs.map(p => ({ ...p, reporting_enabled: false })));
        this.isBulkUpdating.set(false);
        this.customizedAlertsFeSE.show({
          id: 'sp-bulk',
          title: 'All programs closed',
          status: 'success',
          closeIn: 500
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
