import { Component, OnInit, inject } from '@angular/core';
import { IpsrStep4Body } from './model/Ipsr-step-4-body.model';
import { Router } from '@angular/router';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../../../shared/services/global/innovation-control-list.service';

@Component({
  selector: 'app-step-n4',
  templateUrl: './step-n4.component.html',
  styleUrls: ['./step-n4.component.scss'],
  standalone: false
})
export class StepN4Component implements OnInit {
  ipsrStep4Body = new IpsrStep4Body();
  disabledOptionsPartners = [];
  innovationControlListSE = inject(InnovationControlListService);

  /**
   * P2-3426: numeric (0-9) "Innovation use level evidence-based" of the Core innovation,
   * captured in Step 3 → Evidence-based assessment → Core innovation
   * (`result_ip_result_core.use_level_evidence_based`). Step 4's own GET endpoints
   * (`GETInnovationPathwayStepFourByRiId`, both P22 and P25) do not expose this value, so it is
   * fetched here via the same step-three endpoint step-n3 already calls
   * (`GETInnovationPathwayByRiId` — portfolio-agnostic on the server, confirmed live against
   * prtest for both a P22 and a P25 result). null while unset or not yet loaded.
   */
  coreInnovationUseLevel: number = null;

  /**
   * P2-3426: from the 2026 phase onwards, hide the "Have any studies been conducted to inform
   * the innovation scaling strategy design (...)" question (and its study-links list) once the
   * Core innovation's evidence-based use level reaches 6+. Confirmed by Angel Jarrín (PO),
   * 26-Aug-2026. Phases <= 2025 keep the question exactly as it behaved before this ticket,
   * regardless of level.
   *
   * Gated on `phase_year`, never on `isP25()`/portfolio — per reporting/CLAUDE.md rule 9: prtest
   * holds 2025-phase results inside the P25 portfolio, and a portfolio gate would strip the
   * question from those too. Mirrors the local-constant pattern already used for the sibling rule
   * on the Innovation Development side (`innovation-use-form.component.ts`, P2-3294/P2-3265)
   * rather than the shared `ReportingDesignYear` enum, since this ticket's file scope is
   * `step-n4/**` only.
   *
   * Fails OPEN (returns false, i.e. "don't hide") when `phase_year` or the resolved use level
   * aren't available yet — an in-flight load must never hide the question by mistake.
   */
  private static readonly SCALING_STUDIES_QUESTION_HIDE_YEAR = 2026;

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Step 4');
    this.getSectionInformation();
    this.getCoreInnovationUseLevel();
    this.api.dataControlSE.findClassTenSeconds('alert-event-3').then(resp => {
      try {
        document.querySelector('.alert-event-3').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  /**
   * P2-3426: fetches the Core innovation's evidence-based use level catalogue id (Step 3) and
   * resolves it to `coreInnovationUseLevel`. Re-runs on every `ngOnInit`, so navigating back into
   * Step 4 after changing the level in Step 3 picks up the new value without an app reload (the
   * default Angular route-reuse strategy re-creates this component on a step-3 → step-4
   * navigation — verified against `PrmsRouteReuseStrategy`, which only special-cases
   * `result-detail/:id`).
   */
  getCoreInnovationUseLevel() {
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe({
      next: ({ response }) => {
        this.coreInnovationUseLevel = this.resolveUseLevel(response?.result_ip_result_core?.use_level_evidence_based);
      },
      error: err => console.error(err)
    });
  }

  /**
   * P2-3426: resolves a `clarisa_innovation_use_levels` row id to its numeric `level` (0-9).
   * `id` is NOT the level: `id` is an auto-increment catalogue row identifier (1..10) while
   * `level` runs 0-9, so id and level are systematically off by one (verified live against
   * prtest: id 1 -> level 0 ... id 10 -> level 9). Resolving through the catalogue's `level`
   * field — never through the row's array position/index — is what AC5 of P2-3426 requires.
   */
  resolveUseLevel(catalogId: any): number {
    if (catalogId === null || catalogId === undefined) return null;
    const list = this.innovationControlListSE?.useLevelsList || [];
    const match = list.find((item: any) => String(item?.id) === String(catalogId));
    const level = Number(match?.level);
    return Number.isFinite(level) ? level : null;
  }

  isScalingStudiesQuestionHiddenByLevel(): boolean {
    const phaseYear = this.api?.dataControlSE?.currentResultSignal?.()?.phase_year ?? this.api?.dataControlSE?.reportingCurrentPhase?.phaseYear;
    if (typeof phaseYear !== 'number' || phaseYear < StepN4Component.SCALING_STUDIES_QUESTION_HIDE_YEAR) {
      return false;
    }
    if (this.coreInnovationUseLevel === null || this.coreInnovationUseLevel === undefined) return false;
    return this.coreInnovationUseLevel >= 6;
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayStepFourByRiId(this.api.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.ipsrStep4Body = response;

      this.disabledOptionsPartners = this.ipsrStep4Body.institutions_expected_investment.map(item => ({
        institutions_id: item?.obj_result_institution?.institutions_id
      }));

      this.ipsrStep4Body.institutions_expected_investment = this.ipsrStep4Body.institutions_expected_investment.filter(item => {
        if (this.api.fieldsManagerSE.isP25()) {
          return item?.obj_result_institution?.institution_roles_id == 2;
        } else {
          return item?.obj_result_institution?.institution_roles_id == 7;
        }
      });
    });
  }

  onSaveSection() {
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiId(this.ipsrStep4Body, this.api.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  onSavePrevious(descrip) {
    if (this.api.rolesSE.readOnly)
      return this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
        queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
      });
    this.api.resultsSE.PATCHInnovationPathwayStepFourByRiIdPrevious(this.ipsrStep4Body, descrip).subscribe(({ response }) => {
      this.getSectionInformation();
      setTimeout(() => {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }, 1000);
    });
    return null;
  }
}
