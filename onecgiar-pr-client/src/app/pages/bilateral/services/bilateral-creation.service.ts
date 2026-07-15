import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { environment } from '../../../../environments/environment';

const LS_PROJECT_KEY = 'bp_project';
const LS_SP_KEY = 'bp_primary_sp';
const LS_SECONDARY_SP_KEY = 'bp_secondary_sps';

@Injectable({ providedIn: 'root' })
export class BilateralCreationService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  projects = signal<BilateralProject[]>([]);
  selectedProject = signal<BilateralProject | null>(this.loadFromStorage<BilateralProject>(LS_PROJECT_KEY));
  selectedPrimarySp = signal<{ programId: number; programCode: string; allocation: string } | null>(
    this.loadFromStorage(LS_SP_KEY)
  );
  selectedSecondarySps = signal<{ programId: number; programCode: string; allocation: string }[]>(
    this.loadFromStorage(LS_SECONDARY_SP_KEY) ?? []
  );

  currentResultId = signal<number | null>(null);
  isLoadingProjects = signal(false);
  isLoadingResult = signal(false);
  resultTitle = signal('');
  resultDescription = signal('');
  resultLeadContact = signal('');
  resultDacLevels = signal<Record<string, number>>({});
  resultDacSubScores = signal<Record<string, number[]>>({});
  resultInitiativeId = signal<number | null>(null);
  resultLevelId = signal<number | null>(null);
  resultTypeId = signal<number | null>(null);
  resultLeadCenterId = signal<number | null>(null);
  resultProjectId = signal<number | null>(null);

  getProjects(centerId: string | number): void {
    this.isLoadingProjects.set(true);
    this.api.resultsSE.GET_bilateralProjects(centerId).subscribe({
      next: ({ response }) => {
        this.projects.set(response.projects);
        this.isLoadingProjects.set(false);
      },
      error: () => this.isLoadingProjects.set(false)
    });
  }

  loadResult(resultId: number): void {
    this.currentResultId.set(resultId);
    this.isLoadingResult.set(true);
    this.http.get<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}`).subscribe({
      next: ({ response }) => {
        if (response?.commonFields) {
          const cf = response.commonFields;
          this.resultTitle.set(cf.result_title ?? '');
          this.resultDescription.set(cf.result_description ?? '');
          this.resultLeadContact.set(cf.lead_contact_person ?? '');
          this.resultLevelId.set(cf.result_level_id ?? null);
          this.resultTypeId.set(cf.result_type_id ?? null);
          if (cf.project_id) {
            this.resultProjectId.set(Number(cf.project_id));
          }
          if (cf.lead_center_id) {
            this.resultLeadCenterId.set(Number(cf.lead_center_id));
          }
          const dacLevels: Record<string, number> = {};
          if (cf.gender_tag_level_id != null) dacLevels['gender'] = Number(cf.gender_tag_level_id);
          if (cf.climate_change_tag_level_id != null) dacLevels['climate_change'] = Number(cf.climate_change_tag_level_id);
          if (cf.nutrition_tag_level_id != null) dacLevels['nutrition'] = Number(cf.nutrition_tag_level_id);
          if (cf.environmental_biodiversity_tag_level_id != null) dacLevels['environmental_biodiversity'] = Number(cf.environmental_biodiversity_tag_level_id);
          if (cf.poverty_tag_level_id != null) dacLevels['poverty'] = Number(cf.poverty_tag_level_id);
          this.resultDacLevels.set(dacLevels);
        }
        if (response?.impactAreaScores && Array.isArray(response.impactAreaScores)) {
          const areaMap: Record<string, string> = {
            Gender: 'gender', Climate: 'climate_change', Nutrition: 'nutrition',
            Environmental: 'environmental_biodiversity', Poverty: 'poverty',
          };
          const subs: Record<string, number[]> = {};
          for (const s of response.impactAreaScores) {
            const key = areaMap[s.impact_area];
            if (key) {
              if (!subs[key]) subs[key] = [];
              subs[key].push(Number(s.impact_area_score_id));
            }
          }
          this.resultDacSubScores.set(subs);
        }
        const primaryInit = response?.contributingInitiatives?.contributing_and_primary_initiative?.[0];
        if (primaryInit?.id) {
          this.resultInitiativeId.set(primaryInit.id);
        }

        if (response?.contributingProjects && response.contributingProjects.length) {
          const leadProject = response.contributingProjects.find((p: any) => p.is_lead);
          if (leadProject?.obj_clarisa_project) {
            const proj = leadProject.obj_clarisa_project;
            this.selectedProject.set({
              id: proj.id,
              shortName: proj.shortName,
              fullName: proj.fullName,
              summary: proj.summary,
              description: proj.description,
              leadCenter: proj.obj_organization ? {
                id: proj.obj_organization.id,
                name: proj.obj_organization.name,
                acronym: proj.obj_organization.acronym,
              } : null,
              sciencePrograms: [],
            });
            if (proj.obj_organization?.id) {
              this.resultLeadCenterId.set(proj.obj_organization.id);
            }
          }
        }

        this.isLoadingResult.set(false);
      },
      error: () => { this.isLoadingResult.set(false); }
    });
  }

  setDacSubScores(areaKey: string, ids: number[]): void {
    this.resultDacSubScores.update(s => ({ ...s, [areaKey]: ids }));
  }

  selectProject(project: BilateralProject): void {
    this.selectedProject.set(project);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
    this.saveToStorage(LS_PROJECT_KEY, project);
    localStorage.removeItem(LS_SP_KEY);
    localStorage.removeItem(LS_SECONDARY_SP_KEY);
  }

  resetWizard(): void {
    this.selectedProject.set(null);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
    localStorage.removeItem(LS_PROJECT_KEY);
    localStorage.removeItem(LS_SP_KEY);
    localStorage.removeItem(LS_SECONDARY_SP_KEY);
  }

  selectPrimarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    this.selectedPrimarySp.set(sp);
    this.saveToStorage(LS_SP_KEY, sp);
  }

  toggleSecondarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    const current = this.selectedSecondarySps();
    const existing = current.find(s => s.programId === sp.programId);
    if (existing) {
      const next = current.filter(s => s.programId !== sp.programId);
      this.selectedSecondarySps.set(next);
      this.saveToStorage(LS_SECONDARY_SP_KEY, next);
    } else {
      const next = [...current, sp];
      this.selectedSecondarySps.set(next);
      this.saveToStorage(LS_SECONDARY_SP_KEY, next);
    }
  }

  createResult(resultLevelId: number, resultTypeId: number): Observable<any> {
    const body: Record<string, unknown> = {
      result_level_id: resultLevelId,
      result_type_id: resultTypeId,
    };
    const programCode = this.selectedPrimarySp()?.programCode;
    if (programCode) {
      body['program_code'] = programCode;
    }
    const leadCenter = this.selectedProject()?.leadCenter;
    if (leadCenter) {
      body['lead_center'] = {
        institution_id: leadCenter.id,
        name: leadCenter.name,
        acronym: leadCenter.acronym,
      };
    }
    return this.http.post(`${environment.apiBaseUrl}api/bilateral/center/create-header`, body);
  }

  submitResult(resultId: number): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`,
      { decision: 'APPROVE', justification: 'Submitted by Center User' }
    );
  }

  private saveToStorage<T>(key: string, value: T): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }

  private loadFromStorage<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
