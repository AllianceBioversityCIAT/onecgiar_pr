import { Component, inject, computed, signal, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { Subscription } from 'rxjs';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { SectionTocComponent } from '../section-toc/section-toc.component';
import { ApiService } from '../../../../shared/services/api/api.service';

interface CenterOption {
  institutionId: number;
  code: string;
  name: string;
  acronym: string;
  full_name: string;
}

interface ProjectOption {
  id: number;
  shortName: string;
  fullName: string;
}

const CONTRIBUTORS_MDS_TOTAL = 3;

@Component({
  selector: 'app-section-contributors',
  imports: [CommonModule, FormsModule, SelectModule, MultiSelectModule, SectionTocComponent],
  templateUrl: './section-contributors.component.html',
  styleUrl: './section-contributors.component.scss'
})
export class SectionContributorsComponent implements OnInit, OnDestroy {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSave = inject(BilateralAutoSaveService);
  readonly centersService = inject(CentersService);
  readonly api = inject(ApiService);

  private centersSubscription?: Subscription;

  readonly primarySpData = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    if (!sp) return null;
    const project = this.creationService.selectedProject();
    const sps = project?.sciencePrograms ?? [];
    const full = sps.find(s => s.programId === sp.programId);
    return {
      programCode: sp.programCode,
      allocation: sp.allocation,
      shortName: sp.shortName || full?.spShortName || '',
      name: sp.name || full?.spName || '',
      iconSrc: `assets/result-framework-reporting/SPs-Icons/${sp.programCode}.png`,
    };
  });

  availableCenters: CenterOption[] = [];
  selectedCenterInstitutionIds: number[] = [];

  availableProjects = signal<ProjectOption[]>([]);
  selectedProjectIds: number[] = [];

  readonly availableProjectsComputed = computed(() => {
    const leadProj = this.creationService.selectedProject();
    const leadId = leadProj?.id ? Number(leadProj.id) : null;
    return this.availableProjects().map(p => ({
      ...p,
      disabled: Number(p.id) === leadId
    }));
  });

  readonly availableCentersComputed = computed(() => {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    const leadInstId = leadCenterId ? Number(leadCenterId) : null;
    return this.availableCenters.map(c => ({
      ...c,
      disabled: Number(c.institutionId) === leadInstId
    }));
  });

  readonlyLeadCenterInstitutionId: number | null = null;
  readonlyLeadProjectId: number | null = null;

  private readonly centersReady = signal(false);
  private readonly projectsReady = signal(false);

  private readonly hydrateWhenReady = effect(() => {
    const loading = this.creationService.isLoadingResult();
    const centersReady = this.centersReady();
    const projectsReady = this.projectsReady();
    // Touch contributing ids so hydrate re-runs after result detail arrives.
    this.creationService.resultContributingCenterIds();
    this.creationService.resultContributingProjectIds();
    this.creationService.resultLeadCenterId();
    this.creationService.selectedProject();
    if (loading || !centersReady || !projectsReady) return;
    untracked(() => this.hydrateLeadAndSelection());
  });

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('contributors', CONTRIBUTORS_MDS_TOTAL);
    this.loadCenters();
    this.loadProjects();
  }

  private loadProjects(): void {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        this.availableProjects.set(
          (response ?? []).map((p: any) => ({
            id: Number(p.id),
            shortName: p.shortName,
            fullName: p.fullName,
          }))
        );
        this.projectsReady.set(true);
      },
      error: () => {
        this.availableProjects.set([]);
        this.projectsReady.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.centersSubscription?.unsubscribe();
  }

  private loadCenters(): void {
    if (this.centersService.centersList?.length) {
      this.mapCenters();
      return;
    }
    this.centersSubscription = this.centersService.loadedCenters.subscribe(() => {
      this.mapCenters();
    });
    this.centersService.getData()?.catch(() => {});
  }

  private mapCenters(): void {
    const centers = this.centersService.centersList ?? [];
    this.availableCenters = centers.map(c => ({
      institutionId: c.institutionId,
      code: c.code,
      name: c.name,
      acronym: (c as any).acronym || c.code,
      full_name: `${(c as any).acronym || c.code} - ${c.name}`,
    }));
    this.centersReady.set(true);
  }

  /** One-shot UI hydrate after centers/projects/result data are available. No network. */
  hydrateLeadAndSelection(): void {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    if (leadCenterId && this.availableCenters.length) {
      const leadInstitutionId = Number(leadCenterId);
      if (this.availableCenters.some(c => c.institutionId === leadInstitutionId)) {
        this.readonlyLeadCenterInstitutionId = leadInstitutionId;
      }
    }

    if (project?.id && this.availableProjects().length) {
      const leadProjId = Number(project.id);
      if (this.availableProjects().some(p => p.id === leadProjId)) {
        this.readonlyLeadProjectId = leadProjId;
      }
    }

    const centerIds = new Set<number>(this.creationService.resultContributingCenterIds());
    if (this.readonlyLeadCenterInstitutionId != null) {
      centerIds.add(this.readonlyLeadCenterInstitutionId);
    }
    this.selectedCenterInstitutionIds = Array.from(centerIds);

    const projectIds = new Set<number>(this.creationService.resultContributingProjectIds());
    if (this.readonlyLeadProjectId != null) {
      projectIds.add(this.readonlyLeadProjectId);
    }
    this.selectedProjectIds = Array.from(projectIds);

    this.updateContributorsMds();
  }

  private buildContributorsPayload(): {
    contributing_center: { institution_id: number }[];
    contributing_bilateral_projects: { project_id: number; is_lead?: boolean }[];
  } {
    const selectedCenters = this.selectedCenterInstitutionIds
      .map(id => {
        const center = this.availableCenters.find(c => c.institutionId === id);
        return center ? { institution_id: center.institutionId } : null;
      })
      .filter(Boolean) as { institution_id: number }[];

    const leadProjectId = this.readonlyLeadProjectId ?? this.creationService.selectedProject()?.id ?? null;
    const selectedProjects = this.selectedProjectIds
      .map(id => {
        const exists = this.availableProjects().some(p => p.id === id);
        return exists
          ? {
              project_id: id,
              is_lead: leadProjectId != null && id === Number(leadProjectId),
            }
          : null;
      })
      .filter(Boolean) as { project_id: number; is_lead?: boolean }[];

    return {
      contributing_center: selectedCenters,
      contributing_bilateral_projects: selectedProjects,
    };
  }

  private persistContributors(): void {
    this.autoSave.schedulePayload('contributors', this.buildContributorsPayload(), {
      debounceMs: 400,
      statusKey: 'contributors',
    });
    this.updateContributorsMds();
  }

  /** Real MDS slots: lead center, lead project, ≥1 contributing selection beyond empty. */
  updateContributorsMds(): void {
    const filled =
      (this.readonlyLeadCenterInstitutionId != null ? 1 : 0) +
      (this.readonlyLeadProjectId != null ? 1 : 0) +
      (this.selectedCenterInstitutionIds.length > 0 || this.selectedProjectIds.length > 0 ? 1 : 0);
    this.mdsTracker.updateSection('contributors', filled);
  }

  onCentersChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadCenterInstitutionId && !finalIds.includes(this.readonlyLeadCenterInstitutionId)) {
      finalIds = [this.readonlyLeadCenterInstitutionId, ...finalIds];
    }
    this.selectedCenterInstitutionIds = finalIds;
    this.persistContributors();
  }

  onProjectsChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadProjectId && !finalIds.includes(this.readonlyLeadProjectId)) {
      finalIds = [this.readonlyLeadProjectId, ...finalIds];
    }
    this.selectedProjectIds = finalIds;
    this.persistContributors();
  }

  formatAlloc(value: string | null | undefined): string {
    if (!value) return '';
    const n = Number.parseFloat(value);
    return Number.isNaN(n) ? value : String(Math.round(n));
  }

  getStatusClass(fieldPath: string): string {
    const status = this.autoSave.fieldStatus()[fieldPath];
    return status ? `status-${status}` : '';
  }

  getCenterDisplayName(id: number): string {
    const center = this.availableCenters.find(c => c.institutionId === id);
    return center ? (center.acronym || center.code) : String(id);
  }

  getProjectDisplayName(id: number): string {
    const project = this.availableProjects().find(p => p.id === id);
    if (project) {
      return project.shortName || project.fullName;
    }
    const loadedProj = this.creationService.resultContributingProjects().find(p => p.id === id);
    if (loadedProj) {
      return loadedProj.shortName || loadedProj.fullName;
    }
    const leadProj = this.creationService.selectedProject();
    if (leadProj?.id === id) {
      return leadProj.shortName || leadProj.fullName;
    }
    return '';
  }

  isLeadCenterItem(option: CenterOption): boolean {
    return option.institutionId === this.readonlyLeadCenterInstitutionId;
  }

  isLeadCenter(id: number): boolean {
    return id === this.readonlyLeadCenterInstitutionId;
  }

  isLeadProject(id: number): boolean {
    return id === this.readonlyLeadProjectId;
  }

  removeCenter(id: number): void {
    if (id === this.readonlyLeadCenterInstitutionId) {
      return;
    }
    this.onCentersChange(this.selectedCenterInstitutionIds.filter(i => i !== id));
  }

  removeProject(id: number): void {
    if (id === this.readonlyLeadProjectId) {
      return;
    }
    this.onProjectsChange(this.selectedProjectIds.filter(p => p !== id));
  }
}
