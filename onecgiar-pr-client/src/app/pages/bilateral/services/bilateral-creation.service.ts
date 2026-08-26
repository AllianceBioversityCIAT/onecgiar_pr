import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { User } from '../../results/pages/result-detail/pages/rd-general-information/models/userSearchResponse';

const LS_PROJECT_KEY = 'bp_project';
const LS_SP_KEY = 'bp_primary_sp';
const LS_SECONDARY_SP_KEY = 'bp_secondary_sps';

@Injectable({ providedIn: 'root' })
export class BilateralCreationService {
  private readonly api = inject(ApiService);
  private readonly bilateralApi = inject(BilateralApiService);

  projects = signal<BilateralProject[]>([]);
  /** Always start empty — do not hydrate from localStorage (avoids stale create wizard). */
  selectedProject = signal<BilateralProject | null>(null);
  selectedPrimarySp = signal<{ programId: number; programCode: string; allocation: string; name?: string; shortName?: string } | null>(null);
  selectedSecondarySps = signal<{ programId: number; programCode: string; allocation: string }[]>([]);

  /**
   * Internal DB `result.id` of the result being edited — the ONLY id every write endpoint accepts.
   * ⚠️ Never holds a `result_code`: see `loadResult`.
   */
  currentResultId = signal<number | null>(null);
  isLoadingProjects = signal(false);
  isLoadingResult = signal(false);
  /**
   * True when the last `loadResult` call failed. Needed because the editor sections only mount once
   * `currentResultId` is published: on a failed GET the id stays null and `isLoadingResult` flips
   * back to false, so without this flag the page renders neither the skeleton nor the sections and
   * the user is left staring at an empty editor with no way out.
   */
  loadFailed = signal(false);
  isAiGenerated = signal(false);
  /** Human-facing result identifier (`result_code`), distinct from the internal `id`. */
  resultCode = signal<string | number | null>(null);
  /** True when `source = SourceEnum.Bilateral` ('API') — a W3/bilateral result, vs. a W1/W2 'Result' one. */
  isW3Bilateral = signal(false);
  /** Result type label (e.g. "Knowledge product"), sourced from `result_category`. */
  resultTypeName = signal<string | null>(null);
  /** Reporting phase year the result belongs to. */
  reportingYear = signal<number | null>(null);
  /**
   * P2-3352: `result.status_id` as returned by the detail endpoint — Editing (1), Pending review (5),
   * Approved (6) or Rejected (7) for a bilateral result. Drives the header status badge.
   */
  resultStatusId = signal<number | null>(null);
  resultTitle = signal('');
  resultDescription = signal('');
  resultLeadContact = signal('');
  /** Directory match for resultLeadContact, when the name was resolved against Active Directory. */
  resultLeadContactData = signal<User | null>(null);
  resultDacLevels = signal<Record<string, number>>({});
  resultDacSubScores = signal<Record<string, number[]>>({});
  resultInitiativeId = signal<number | null>(null);
  resultLevelId = signal<number | null>(null);
  resultTypeId = signal<number | null>(null);
  resultLeadCenterId = signal<number | null>(null);
  resultContributingCenterIds = signal<number[]>([]);
  resultProjectId = signal<number | null>(null);
  resultContributingProjectIds = signal<number[]>([]);
  resultContributingProjects = signal<{ id: number; shortName: string; fullName: string }[]>([]);

  getProjects(centerId: string | number): void {
    this.isLoadingProjects.set(true);
    this.bilateralApi.GET_bilateralProjects(centerId).subscribe({
      next: ({ response }) => {
        this.projects.set(response.projects);
        this.isLoadingProjects.set(false);
      },
      error: () => this.isLoadingProjects.set(false)
    });
  }

  /** Clears editor signals so a previous result cannot leak into a new one. */
  clearEditorState(): void {
    this.isAiGenerated.set(false);
    this.resultCode.set(null);
    this.isW3Bilateral.set(false);
    this.resultTypeName.set(null);
    this.reportingYear.set(null);
    this.resultStatusId.set(null);
    this.resultTitle.set('');
    this.resultDescription.set('');
    this.resultLeadContact.set('');
    this.resultLeadContactData.set(null);
    this.resultDacLevels.set({});
    this.resultDacSubScores.set({});
    this.resultInitiativeId.set(null);
    this.resultLevelId.set(null);
    this.resultTypeId.set(null);
    this.resultLeadCenterId.set(null);
    this.resultContributingCenterIds.set([]);
    this.resultProjectId.set(null);
    this.resultContributingProjectIds.set([]);
    this.resultContributingProjects.set([]);
  }

  /**
   * `resultIdOrCode` is the route parameter, and what it means depends on `versionId`: the detail
   * endpoint resolves by `result_code` + `version_id` when a phase is given and by `id` only when it
   * is not (results.service.ts:3378-3388).
   *
   * ⚠️ `currentResultId` must therefore NOT be seeded with it. Every write endpoint — starting with
   * `PATCH api/results/bilateral/general-info/:resultId` (results.service.ts:5006) — looks the row up
   * by the internal `id`, so an autosave dispatched before this GET resolved used to PATCH a
   * DIFFERENT result: on prtest 5804 of 9667 results have `id !== result_code` (e.g. the 2026 row
   * id 11012 carries code 5093, and `/result/5093?phase=36` would have written into row 5093).
   * The id is published only once the response carries it; until then it stays null and the editor
   * sections — and with them the autosave — do not mount.
   */
  loadResult(resultIdOrCode: number, versionId?: number): void {
    this.currentResultId.set(null);
    this.api.resultsSE.currentResultId = null;
    this.isLoadingResult.set(true);
    this.loadFailed.set(false);
    this.clearEditorState();
    this.bilateralApi.GET_BilateralResultDetail(resultIdOrCode, versionId).subscribe({
      next: ({ response }) => {
        if (response?.commonFields) {
          const cf = response.commonFields;
          // Without a phase the route param already was the internal id; with one, only `cf.id` is.
          const internalId = Number(cf.id ?? (versionId ? NaN : resultIdOrCode));
          if (Number.isFinite(internalId) && internalId > 0) {
            this.currentResultId.set(internalId);
            this.api.resultsSE.currentResultId = internalId;
          }
          // `is_ai_generated` comes from a SQL CASE literal and can arrive as the string '0',
          // which `!!` treats as truthy — compare numerically instead.
          this.isAiGenerated.set(
            Number(cf.is_ai_generated) === 1 || cf.creation_method === 'AI',
          );
          this.resultCode.set(cf.result_code ?? null);
          this.isW3Bilateral.set(cf.source === 'API');
          this.resultTypeName.set(cf.result_category ?? null);
          this.reportingYear.set(
            cf.reporting_year != null ? Number(cf.reporting_year) : null,
          );
          // P2-3352: the payload has carried `status_id` all along (result.repository.ts:2904 selects
          // it and results.service.ts returns commonFields unfiltered) — the client simply never read it.
          this.resultStatusId.set(cf.status_id != null ? Number(cf.status_id) : null);
          this.resultTitle.set(cf.result_title ?? '');
          this.resultDescription.set(cf.result_description ?? '');
          this.resultLeadContact.set(cf.lead_contact_person ?? '');
          this.resultLeadContactData.set(cf.lead_contact_person_data ?? null);
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
          this.selectedPrimarySp.set({
            programId: Number(primaryInit.id),
            programCode: primaryInit.official_code,
            allocation: '100',
            name: primaryInit.initiative_name || primaryInit.short_name,
            shortName: primaryInit.short_name
          });
        }

        if (response?.contributingProjects?.length) {
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
          const pIds = response.contributingProjects
            .filter((p: any) => p.project_id != null)
            .map((p: any) => Number(p.project_id));
          this.resultContributingProjectIds.set(pIds);

          const pProjects = response.contributingProjects
            .filter((p: any) => p.project_id != null)
            .map((p: any) => ({
              id: Number(p.project_id),
              shortName: p.obj_clarisa_project?.shortName ?? '',
              fullName: p.obj_clarisa_project?.fullName ?? ''
            }));
          this.resultContributingProjects.set(pProjects);
        }

        const contributingCenterIds = (response?.contributingCenters ?? [])
          .filter((c: any) => c.is_leading_result === 0 || c.is_leading_result === false)
          .map((c: any) => {
            if (c.institutionId != null) return Number(c.institutionId);
            return null;
          })
          .filter((id: number | null): id is number => id !== null);
        this.resultContributingCenterIds.set(contributingCenterIds);

        this.isLoadingResult.set(false);
      },
      error: () => {
        this.isLoadingResult.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  setDacSubScores(areaKey: string, ids: number[]): void {
    this.resultDacSubScores.update(s => ({ ...s, [areaKey]: ids }));
  }

  selectProject(project: BilateralProject): void {
    this.selectedProject.set(project);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
    this.clearLegacyWizardStorage();
  }

  resetWizard(): void {
    this.selectedProject.set(null);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
    this.clearEditorState();
    this.currentResultId.set(null);
    this.clearLegacyWizardStorage();
  }

  selectPrimarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    this.selectedPrimarySp.set(sp);
  }

  toggleSecondarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    const current = this.selectedSecondarySps();
    if (current.some(s => s.programId === sp.programId)) {
      this.selectedSecondarySps.set(current.filter(s => s.programId !== sp.programId));
    } else {
      this.selectedSecondarySps.set([...current, sp]);
    }
  }

  createResult(resultLevelId: number, resultTypeId: number, handle?: string): Observable<any> {
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
    const project = this.selectedProject();
    if (project?.id) {
      body['project_id'] = Number(project.id);
    }
    if (handle?.trim()) {
      body['handle'] = handle.trim();
    }
    return this.bilateralApi.POST_createBilateralHeader(body);
  }

  submitResult(resultId: number): Observable<any> {
    return this.bilateralApi.PATCH_BilateralReviewDecision(resultId, {
      decision: 'APPROVE',
      justification: 'Submitted by Center User'
    });
  }

  /** Wipe old bp_* keys left by previous singleton/localStorage wizard persistence. */
  private clearLegacyWizardStorage(): void {
    try {
      localStorage.removeItem(LS_PROJECT_KEY);
      localStorage.removeItem(LS_SP_KEY);
      localStorage.removeItem(LS_SECONDARY_SP_KEY);
    } catch {
      /* ignore */
    }
  }
}
