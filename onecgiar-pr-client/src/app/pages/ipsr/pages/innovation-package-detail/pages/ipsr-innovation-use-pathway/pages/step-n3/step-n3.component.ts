import { Component, OnInit, inject } from '@angular/core';
import { ActorN3, IpsrPrincipalImpactArea, IpsrStep3Body, OrganizationN3 } from './model/Ipsr-step-3-body.model';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { Router } from '@angular/router';
import { untypedInnovationUseRowsMessage } from '../../../../../../utils/untyped-innovation-use-rows.util';
import { IPSR_UNTYPED_ROWS_COPY } from '../../../../../../../../internationalization/ipsr-untyped-rows.copy';
import { SharePointUploadService } from '../../../../../../../../shared/services/sharepoint-upload/sharepoint-upload.service';
import { SaveButtonService } from '../../../../../../../../custom-fields/save-button/save-button.service';
import { IPSR_STEP3_EVIDENCE_COPY } from './components/ipsr-step3-evidence-list/ipsr-step3-evidence-list.copy';
import {
  buildIpsrStep3SavePayload,
  ipsrStep3AllEvidences,
  ipsrStep3MissingPrincipalImpactAreas,
  normalizeIpsrStep3Component
} from './components/ipsr-step3-evidence-list/ipsr-step3-evidence.util';

@Component({
  selector: 'app-step-n3',
  templateUrl: './step-n3.component.html',
  styleUrls: ['./step-n3.component.scss'],
  standalone: false
})
export class StepN3Component implements OnInit {
  rangesOptions = [];
  ipsrStep3Body = new IpsrStep3Body();
  innovationUseList = [];
  result_core_innovation: any;
  innoUseLevel: number;
  rangeLevel2Required = true;
  savingSection = false;

  /** P2-3220 — the single path to SharePoint; Step 3 evidence files go up through it before the PATCH. */
  private readonly sharePointUploadSE = inject(SharePointUploadService);
  private readonly saveButtonSE = inject(SaveButtonService);

  constructor(
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('Step 3');
  }

  openClosed(response) {
    if (this.ipsrStep3Body.result_ip_result_complementary.length) {
      this.ipsrStep3Body.result_ip_result_complementary.forEach((item: any) => {
        const itemFind = response.result_ip_result_complementary.find(
          responseItem => responseItem.result_by_innovation_package_id == item.result_by_innovation_package_id
        );
        if (itemFind) itemFind.open = item?.open;
      });
    }
    return response;
  }

  updateRangeLevel1(bodyItem) {
    const readiness_level_evidence_based_index = this.rangesOptions.findIndex(item => item.id == bodyItem['readiness_level_evidence_based']);
    return readiness_level_evidence_based_index != 0;
  }

  updateRangeLevel2(bodyItem) {
    const use_level_evidence_based_index = this.innovationUseList.findIndex(item => item.id == bodyItem['use_level_evidence_based']);
    return use_level_evidence_based_index != 0;
  }

  getSectionInformation() {
    this.savingSection = true;
    this.api.resultsSE.GETInnovationPathwayByRiId().subscribe({
      next: ({ response }) => {
        this.ipsrStep3Body = this.openClosed(response);

        this.convertOrganizations(response?.innovatonUse?.organization);
        this.result_core_innovation = response.result_core_innovation;
        this.normalizeEvidenceLists();

        if (this.ipsrStep3Body.innovatonUse.actors.length === 0) {
          this.ipsrStep3Body.innovatonUse.actors.push(new ActorN3());
        }
        if (this.ipsrStep3Body.innovatonUse.organization.length === 0) {
          this.ipsrStep3Body.innovatonUse.organization.push(new OrganizationN3());
        }
        this.savingSection = false;
      },
      error: err => {
        this.savingSection = false;
        console.error(err);
      }
    });
  }

  /**
   * P2-3824 — both evidence lists of every component always exist and hold the shapes the dialog
   * compares by identity; `principal_impact_areas` falls back to none (older server, or no score 2).
   */
  private normalizeEvidenceLists(): void {
    const body = this.ipsrStep3Body;
    if (!body) return;
    body.result_ip_result_core = normalizeIpsrStep3Component(body.result_ip_result_core ?? ({} as any));
    body.result_ip_result_complementary = (body.result_ip_result_complementary ?? []).map(item => normalizeIpsrStep3Component(item));
    body.principal_impact_areas = Array.isArray(body.principal_impact_areas) ? body.principal_impact_areas : [];
  }

  /** P2-3824 — Impact Areas scored 2 with no tagged evidence anywhere in the step (recomputed on every render). */
  missingPrincipalImpactAreas(): IpsrPrincipalImpactArea[] {
    return ipsrStep3MissingPrincipalImpactAreas(this.ipsrStep3Body);
  }

  principalImpactAreaAlert(area: IpsrPrincipalImpactArea): string {
    return IPSR_STEP3_EVIDENCE_COPY.principalImpactAreaAlert(IPSR_STEP3_EVIDENCE_COPY.impactAreaNames[area]);
  }

  /**
   * P2-3824 — uploads every pending evidence file of the step (core + enablers, both levels) to the
   * package's repository folder. Returns false, and says which files, when one did not make it: the
   * PATCH is then NOT sent, because a file evidence without its SharePoint link would be stored empty.
   */
  async uploadPendingEvidenceFiles(): Promise<boolean> {
    const pending = ipsrStep3AllEvidences(this.ipsrStep3Body).filter(evidence => evidence?.is_sharepoint && evidence?.file && !evidence?.link);
    if (!pending.length) return true;

    const resultId = this.ipsrDataControlSE.resultInnovationId;
    let failed: string[];
    if (resultId) {
      this.saveButtonSE.showSaveSpinner();
      failed = await this.sharePointUploadSE.uploadPending(pending, { resultId, flow: 'evidences', logLabel: 'ipsr-step3' });
      this.saveButtonSE.hideSaveSpinner();
    } else {
      // The service silently skips a call with no result id; here that would PATCH files with no link.
      failed = pending.map(evidence => evidence.file?.name ?? 'file');
    }

    if (!failed.length) return true;
    this.api.alertsFe.show({
      id: 'ipsr-step3-evidence-upload-failed',
      title: IPSR_STEP3_EVIDENCE_COPY.uploadFailedTitle(failed.length, failed),
      description: IPSR_STEP3_EVIDENCE_COPY.uploadFailedDescription,
      status: 'error'
    });
    return false;
  }

  /** P2-3824 — the PATCH body: evidence arrays, no legacy single-link fields, no File objects. */
  buildSavePayload(): IpsrStep3Body {
    return buildIpsrStep3SavePayload(this.ipsrStep3Body);
  }

  /**
   * Night sweep 2026-09-23, IPSR-5 — same as Step 1 (IPSR-3): a "Current use" row with figures but no
   * type was skipped by the server with a 200 (prtest 12037). Refuse and say which rows.
   */
  private refuseUntypedRows(): boolean {
    const message = untypedInnovationUseRowsMessage(this.ipsrStep3Body?.innovatonUse);
    if (!message) return false;
    this.api.alertsFe.show({ id: 'ipsrUntypedRows', title: IPSR_UNTYPED_ROWS_COPY.title, description: message, status: 'error' });
    return true;
  }

  isOptionalUseLevel() {
    this.innoUseLevel = this.innovationUseList.findIndex(item => item.id === this.ipsrStep3Body.result_ip_result_core.use_level_evidence_based);
    return Boolean(this.innoUseLevel === 0);
  }

  async onSaveSection() {
    if (this.refuseUntypedRows()) return;
    this.convertOrganizationsTosave();
    if (!(await this.uploadPendingEvidenceFiles())) return;
    this.api.resultsSE.PATCHInnovationPathwayByRiId(this.buildSavePayload()).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }

  async onSaveSectionWithStep(descrip: string) {
    const urlBasePath = `/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway`;
    const urlPath = descrip === 'next' ? `${urlBasePath}/step-4` : `${urlBasePath}/step-2`;
    const queryParams = { phase: this.ipsrDataControlSE.resultInnovationPhase };

    if (this.api.rolesSE.readOnly) {
      this.router.navigate([urlPath], { queryParams });

      return;
    }

    if (this.refuseUntypedRows()) return;

    this.convertOrganizationsTosave();
    if (!(await this.uploadPendingEvidenceFiles())) return;

    this.api.resultsSE.PATCHInnovationPathwayByRiIdNextPrevius(this.buildSavePayload(), descrip).subscribe(() => {
      this.getSectionInformation();

      this.router.navigate([urlPath], { queryParams });
    });
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      this.rangesOptions = response;
    });
  }

  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevelsV2().subscribe(({ response }) => {
      this.innovationUseList = response;
    });
  }

  goToStep() {
    return `<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${this.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2</a></li>
        <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`;
  }

  readinessLevelSelfAssessmentText() {
    return 'Please use the Innovation Readiness level calculator to determine your readiness score in 3 simple clicks: <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>';
  }
  useLevelDelfAssessment() {
    return 'Please use the Innovation Use level calculator to determine your use score in 3 simple clicks: <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>';
  }

  convertOrganizations(organizations) {
    organizations.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.ipsrStep3Body.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  resultUrl(resultCode, phase) {
    return `/result/result-detail/${resultCode}/general-information?phase=${phase}`;
  }
}
