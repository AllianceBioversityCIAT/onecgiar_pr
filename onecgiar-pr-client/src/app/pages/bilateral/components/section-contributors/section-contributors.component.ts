import { Component, inject, computed, signal, effect, OnInit, OnDestroy } from '@angular/core';
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
  imports: [CommonModule, FormsModule, SelectModule, MultiSelectModule, SectionTocComponent],
  templateUrl: './section-contributors.component.html',
  styleUrl: './section-contributors.component.scss'
})
export class SectionContributorsComponent implements OnInit, OnDestroy {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSave = inject(BilateralAutoSaveService);
  readonly centersService = inject(CentersService);

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
      shortName: full?.spShortName ?? '',
      name: full?.spName ?? '',
      iconSrc: `assets/result-framework-reporting/SPs-Icons/${sp.programCode}.png`,
    };
  });

  availableCenters: CenterOption[] = [];
  selectedCenterInstitutionIds: number[] = [];

  availableProjects: ProjectOption[] = [];
  selectedProjectIds: number[] = [];

  readonlyLeadCenterInstitutionId: number | null = null;

  private readonly leadCenterEffect = effect(() => {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    if (leadCenterId && this.availableCenters.length) {
      const leadInstitutionId = Number(leadCenterId);
      const centerExists = this.availableCenters.some(c => c.institutionId === leadInstitutionId);
      if (centerExists && !this.readonlyLeadCenterInstitutionId) {
        this.readonlyLeadCenterInstitutionId = leadInstitutionId;
        if (!this.selectedCenterInstitutionIds.includes(leadInstitutionId)) {
          this.selectedCenterInstitutionIds = [leadInstitutionId, ...this.selectedCenterInstitutionIds];
          const selectedCenters = this.selectedCenterInstitutionIds.map(id => {
            const c = this.availableCenters.find(c => c.institutionId === id);
            return c ? { institution_id: c.institutionId } : null;
          }).filter(Boolean);
          this.autoSave.saveContributors({
            contributing_center: selectedCenters as { institution_id: number }[],
          });
        }
      }
    }
  });

  private readonly leadCenterIdChangeEffect = effect(() => {
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    if (resultLeadCenterId && this.availableCenters.length && !this.readonlyLeadCenterInstitutionId) {
      this.ensureLeadCenterSaved();
    }
  });

  ngOnInit(): void {
    this.loadCenters();
    this.loadProjects();
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
    this.ensureLeadCenterSaved();
  }

  private ensureLeadCenterSaved(): void {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    if (!leadCenterId || this.readonlyLeadCenterInstitutionId) return;
    const leadInstitutionId = Number(leadCenterId);
    const centerExists = this.availableCenters.some(c => c.institutionId === leadInstitutionId);
    if (!centerExists) return;
    this.readonlyLeadCenterInstitutionId = leadInstitutionId;
    if (!this.selectedCenterInstitutionIds.includes(leadInstitutionId)) {
      this.selectedCenterInstitutionIds = [leadInstitutionId, ...this.selectedCenterInstitutionIds];
    }
    const selectedCenters = this.selectedCenterInstitutionIds.map(id => {
      const c = this.availableCenters.find(c => c.institutionId === id);
      return c ? { institution_id: c.institutionId } : null;
    }).filter(Boolean);
    this.autoSave.saveContributors({
      contributing_center: selectedCenters as { institution_id: number }[],
    });
  }

  private loadProjects(): void {
    const projects = this.creationService.projects();
    this.availableProjects = projects.map(p => ({
      id: p.id,
      shortName: p.shortName,
      fullName: p.fullName,
    }));
  }

  onCentersChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadCenterInstitutionId && !finalIds.includes(this.readonlyLeadCenterInstitutionId)) {
      finalIds = [this.readonlyLeadCenterInstitutionId, ...finalIds];
    }
    this.selectedCenterInstitutionIds = finalIds;
    const selectedCenters = this.selectedCenterInstitutionIds.map(id => {
      const center = this.availableCenters.find(c => c.institutionId === id);
      return center ? { institution_id: center.institutionId } : null;
    }).filter(Boolean);

    this.autoSave.saveContributors({
      contributing_center: selectedCenters as { institution_id: number }[],
    });
  }

  onProjectsChange(ids: number[]): void {
    this.selectedProjectIds = ids ?? [];
    const currentProjectId = this.creationService.selectedProject()?.id;
    const selectedProjects = this.selectedProjectIds.map(id => {
      const project = this.availableProjects.find(p => p.id === id);
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
    const n = parseFloat(value);
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
    const project = this.availableProjects.find(p => p.id === id);
    return project ? (project.shortName || project.fullName || String(id)) : String(id);
  }

  isLeadCenterItem(option: CenterOption): boolean {
    return option.institutionId === this.readonlyLeadCenterInstitutionId;
  }

  isLeadCenter(id: number): boolean {
    return id === this.readonlyLeadCenterInstitutionId;
  }

  removeCenter(id: number): void {
    if (id === this.readonlyLeadCenterInstitutionId) {
      return;
    }
    this.onCentersChange(this.selectedCenterInstitutionIds.filter(i => i !== id));
  }

  removeProject(id: number): void {
    this.onProjectsChange(this.selectedProjectIds.filter(p => p !== id));
  }
}
