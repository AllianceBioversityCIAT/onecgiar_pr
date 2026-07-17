import { Component, inject, computed, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
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

@Component({
  selector: 'app-section-contributors',
  imports: [CommonModule, FormsModule, CustomFieldsModule, SectionTocComponent],
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

  availableCenters = signal<CenterOption[]>([]);
  selectedCenterInstitutionIds = signal<number[]>([]);

  availableProjects = signal<ProjectOption[]>([]);
  selectedProjectIds = signal<number[]>([]);

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
    return this.availableCenters().map(c => ({
      ...c,
      disabled: Number(c.institutionId) === leadInstId
    }));
  });

  readonly disabledCenterOptions = computed(() => this.availableCentersComputed().filter(c => c.disabled));
  readonly disabledProjectOptions = computed(() => this.availableProjectsComputed().filter(p => p.disabled));

  readonlyLeadCenterInstitutionId: number | null = null;
  readonlyLeadProjectId: number | null = null;

  private readonly leadCenterEffect = effect(() => {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    const centers = this.availableCenters();
    if (!leadCenterId || !centers.length) return;

    const leadInstitutionId = Number(leadCenterId);
    if (!centers.some(c => c.institutionId === leadInstitutionId)) return;
    if (this.readonlyLeadCenterInstitutionId === leadInstitutionId) return;

    if (this.readonlyLeadCenterInstitutionId != null) {
      this.selectedCenterInstitutionIds.set(
        this.selectedCenterInstitutionIds().filter(id => id !== this.readonlyLeadCenterInstitutionId)
      );
    }
    this.readonlyLeadCenterInstitutionId = leadInstitutionId;
    if (!this.selectedCenterInstitutionIds().includes(leadInstitutionId)) {
      this.selectedCenterInstitutionIds.set([leadInstitutionId, ...this.selectedCenterInstitutionIds()]);
    }
    const selectedCenters = this.selectedCenterInstitutionIds().map(id => {
      const c = centers.find(c => c.institutionId === id);
      return c ? { institution_id: c.institutionId } : null;
    }).filter(Boolean);
    this.autoSave.saveContributors({
      contributing_center: selectedCenters as { institution_id: number }[],
    });
  });

  private readonly leadCenterIdChangeEffect = effect(() => {
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    if (resultLeadCenterId && this.availableCenters().length && !this.readonlyLeadCenterInstitutionId) {
      this.ensureLeadCenterSaved();
    }
  });

  private readonly savedContributingCentersEffect = effect(() => {
    const savedIds = this.creationService.resultContributingCenterIds();
    if (!this.availableCenters().length) return;
    const leadId = this.readonlyLeadCenterInstitutionId;
    const merged = new Set<number>(savedIds);
    if (leadId != null) merged.add(leadId);
    this.selectedCenterInstitutionIds.set(Array.from(merged));
  });

  private readonly leadProjectEffect = effect(() => {
    const project = this.creationService.selectedProject();
    if (!project?.id || !this.availableProjects().length) return;

    const leadProjId = Number(project.id);
    if (!this.availableProjects().some(p => p.id === leadProjId)) return;
    if (this.readonlyLeadProjectId === leadProjId) return;

    if (this.readonlyLeadProjectId != null) {
      this.selectedProjectIds.set(this.selectedProjectIds().filter(id => id !== this.readonlyLeadProjectId));
    }
    this.readonlyLeadProjectId = leadProjId;
    if (!this.selectedProjectIds().includes(leadProjId)) {
      this.selectedProjectIds.set([leadProjId, ...this.selectedProjectIds()]);
    }
    const selectedProjects = this.selectedProjectIds().map(id => {
      const p = this.availableProjects().find(p => p.id === id);
      return p ? {
        project_id: id,
        is_lead: id === leadProjId,
      } : null;
    }).filter(Boolean);
    this.autoSave.saveContributors({
      contributing_bilateral_projects: selectedProjects as { project_id: number; is_lead?: boolean }[],
    });
  });

  private readonly savedContributingProjectsEffect = effect(() => {
    const savedIds = this.creationService.resultContributingProjectIds();
    if (!this.availableProjects().length) return;
    const leadId = this.readonlyLeadProjectId;
    const merged = new Set<number>(savedIds);
    if (leadId != null) merged.add(leadId);
    this.selectedProjectIds.set(Array.from(merged));
  });

  ngOnInit(): void {
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
      },
      error: () => {
        this.availableProjects.set([]);
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
    this.availableCenters.set(
      centers.map(c => ({
        institutionId: c.institutionId,
        code: c.code,
        name: c.name,
        acronym: (c as any).acronym || c.code,
        full_name: `${(c as any).acronym || c.code} - ${c.name}`,
      }))
    );
    this.ensureLeadCenterSaved();
  }

  private ensureLeadCenterSaved(): void {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    if (!leadCenterId || this.readonlyLeadCenterInstitutionId) return;
    const leadInstitutionId = Number(leadCenterId);
    const centerExists = this.availableCenters().some(c => c.institutionId === leadInstitutionId);
    if (!centerExists) return;
    this.readonlyLeadCenterInstitutionId = leadInstitutionId;
    if (!this.selectedCenterInstitutionIds().includes(leadInstitutionId)) {
      this.selectedCenterInstitutionIds.set([leadInstitutionId, ...this.selectedCenterInstitutionIds()]);
    }
    const selectedCenters = this.selectedCenterInstitutionIds().map(id => {
      const c = this.availableCenters().find(c => c.institutionId === id);
      return c ? { institution_id: c.institutionId } : null;
    }).filter(Boolean);
    this.autoSave.saveContributors({
      contributing_center: selectedCenters as { institution_id: number }[],
    });
  }

  onCentersModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.institutionId) : Number(item)));
    this.onCentersChange(ids);
  }

  onProjectsModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.id) : Number(item)));
    this.onProjectsChange(ids);
  }

  onCentersChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadCenterInstitutionId && !finalIds.includes(this.readonlyLeadCenterInstitutionId)) {
      finalIds = [this.readonlyLeadCenterInstitutionId, ...finalIds];
    }
    this.selectedCenterInstitutionIds.set(finalIds);
    const selectedCenters = this.selectedCenterInstitutionIds().map(id => {
      const center = this.availableCenters().find(c => c.institutionId === id);
      return center ? { institution_id: center.institutionId } : null;
    }).filter(Boolean);

    this.autoSave.saveContributors({
      contributing_center: selectedCenters as { institution_id: number }[],
    });
  }

  onProjectsChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadProjectId && !finalIds.includes(this.readonlyLeadProjectId)) {
      finalIds = [this.readonlyLeadProjectId, ...finalIds];
    }
    this.selectedProjectIds.set(finalIds);
    const currentProjectId = this.creationService.selectedProject()?.id;
    const selectedProjects = this.selectedProjectIds().map(id => {
      const project = this.availableProjects().some(p => p.id === id);
      return project ? {
        project_id: id,
        is_lead: id === currentProjectId,
      } : null;
    }).filter(Boolean);

    this.autoSave.saveContributors({
      contributing_bilateral_projects: selectedProjects as { project_id: number; is_lead?: boolean }[],
    });
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
    const center = this.availableCenters().find(c => c.institutionId === id);
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
    this.onCentersChange(this.selectedCenterInstitutionIds().filter(i => i !== id));
  }

  removeProject(id: number): void {
    if (id === this.readonlyLeadProjectId) {
      return;
    }
    this.onProjectsChange(this.selectedProjectIds().filter(p => p !== id));
  }
}
