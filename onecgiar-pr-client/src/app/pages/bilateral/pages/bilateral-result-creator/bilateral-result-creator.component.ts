import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsStatus } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { SectionZeroDashboardComponent } from '../../components/section-zero-dashboard/section-zero-dashboard.component';
import { BilateralAccordionComponent } from '../../components/bilateral-accordion/bilateral-accordion.component';
import { BilateralProjectSelectorComponent } from '../../components/bilateral-project-selector/bilateral-project-selector.component';
import { BilateralSpSelectorComponent } from '../../components/bilateral-sp-selector/bilateral-sp-selector.component';
import { BilateralResultLevelSelectorComponent } from '../../components/bilateral-result-level-selector/bilateral-result-level-selector.component';
import { BilateralReportingWaySelectorComponent } from '../../components/bilateral-reporting-way-selector/bilateral-reporting-way-selector.component';
import { SectionGeneralInfoComponent } from '../../components/section-general-info/section-general-info.component';
import { SectionContributorsComponent } from '../../components/section-contributors/section-contributors.component';
import { SectionGeographyComponent } from '../../components/section-geography/section-geography.component';
import { SectionEvidenceComponent } from '../../components/section-evidence/section-evidence.component';
import { SectionTypeSpecificComponent } from '../../components/section-type-specific/section-type-specific.component';
import { BilateralProject } from '../../services/bilateral-creation.interfaces';

const RESULT_TYPES_BY_LEVEL: Record<number, { id: number; label: string }[]> = {
  3: [
    { id: 1, label: 'Policy Change' },
    { id: 2, label: 'Innovation Use' },
    { id: 4, label: 'Other Outcome' }
  ],
  4: [
    { id: 5, label: 'Capacity Sharing for Development' },
    { id: 6, label: 'Knowledge Product' },
    { id: 7, label: 'Innovation Development' },
    { id: 8, label: 'Other Output' }
  ]
};

@Component({
  selector: 'app-bilateral-result-creator',
  imports: [
    SectionZeroDashboardComponent,
    BilateralAccordionComponent,
    BilateralProjectSelectorComponent,
    BilateralSpSelectorComponent,
    BilateralResultLevelSelectorComponent,
    BilateralReportingWaySelectorComponent,
    SectionGeneralInfoComponent,
    SectionContributorsComponent,
    SectionGeographyComponent,
    SectionEvidenceComponent,
    SectionTypeSpecificComponent
  ],
  templateUrl: './bilateral-result-creator.component.html',
  styleUrl: './bilateral-result-creator.component.scss',
  providers: [MessageService]
})
export class BilateralResultCreatorComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSaveService = inject(BilateralAutoSaveService);

  isCreating = signal(true);
  resultId = signal<number | null>(null);
  resultLevelId = signal<number | null>(null);
  resultTypeId = signal<number | null>(null);
  isCreatingResult = signal(false);
  openSectionName = signal<string | null>('general-info');
  isSubmitting = signal(false);
  selectedReportingWay = signal<'manual' | 'ai' | 'bulk' | null>(null);
  sectionZeroOpen = signal(true);

  availableResultTypes = computed(() => {
    const level = this.resultLevelId();
    return level ? (RESULT_TYPES_BY_LEVEL[level] ?? []) : [];
  });

  overallPct = this.mdsTracker.overallPercentage;
  sectionStatuses = this.mdsTracker.sectionStatus;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.resultId.set(Number(id));
        this.isCreating.set(false);
        this.autoSaveService.setResultId(Number(id));
        this.creationService.loadResult(Number(id));
      }
    });
  }

  onProjectSelected(project: BilateralProject): void {
    this.autoSaveService.reset();
    this.mdsTracker.reset();
    this.selectedReportingWay.set(null);
    this.resultLevelId.set(null);
    this.resultTypeId.set(null);
    this.scrollToSection('bcr-sp-section');
  }

  onPrimarySelected(): void {
    this.scrollToSection('bcr-reporting-way');
  }

  onReportingWaySelected(way: 'manual' | 'ai' | 'bulk'): void {
    this.selectedReportingWay.set(way);
    if (way === 'manual') {
      this.scrollToSection('bcr-level-section');
    }
  }

  onLevelSelected(levelId: number): void {
    this.resultLevelId.set(levelId);
    this.creationService.resultLevelId.set(levelId);
    this.resultTypeId.set(null);
    this.creationService.resultTypeId.set(null);
    this.scrollToSection('bcr-type-section');
  }

  onTypeSelected(event: Event): void {
    const typeId = Number((event.target as HTMLSelectElement).value);
    this.resultTypeId.set(typeId);
    this.creationService.resultTypeId.set(typeId);
  }

  onNext(): void {
    this.createResult();
  }

  createResult(): void {
    const level = this.resultLevelId();
    const type = this.resultTypeId();
    if (!level || !type) return;
    this.isCreatingResult.set(true);
    this.creationService.createResult(level, type).subscribe({
      next: ({ response }) => {
        this.isCreatingResult.set(false);
        if (!response?.id) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Result created but no ID returned' });
          return;
        }
        this.autoSaveService.setResultId(response.id);
        this.router.navigate(['/bilateral/result', response.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.isCreatingResult.set(false);
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.messageService.add({ severity: 'error', summary: 'Failed to create result', detail, life: 5000 });
      }
    });
  }

  getSectionMdsStatus(sectionName: string): MdsStatus {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.status ?? 'empty';
  }

  getSectionFilled(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.filledFields ?? 0;
  }

  getSectionTotal(sectionName: string): number {
    return this.mdsTracker.sectionStatus().find(s => s.sectionName === sectionName)?.totalFields ?? 0;
  }

  private scrollToSection(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  get canCreate(): boolean {
    return !!this.creationService.selectedPrimarySp() && !!this.resultLevelId() && !!this.resultTypeId();
  }

  submitResult(): void {
    const rid = this.resultId();
    if (!rid) return;
    this.isSubmitting.set(true);
    this.creationService.submitResult(rid).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'Result submitted successfully' });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.messageService.add({ severity: 'error', summary: 'Submit failed', detail, life: 5000 });
      }
    });
  }

  ngOnDestroy(): void {
    const url = this.router.url;
    if (!url.startsWith('/bilateral/')) {
      this.creationService.resetWizard();
    }
  }
}
