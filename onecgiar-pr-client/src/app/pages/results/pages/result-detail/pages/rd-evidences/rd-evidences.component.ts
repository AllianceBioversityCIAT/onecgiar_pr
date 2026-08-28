import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { EvidencesBody, EvidencesCreateInterface } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss'],
  standalone: false
})
export class RdEvidencesComponent implements OnInit, OnDestroy {
  /** CLARISA result type "Policy change" — the only type P2-3262 puts guidance behind an ⓘ. */
  private static readonly POLICY_CHANGE_RESULT_TYPE_ID = 1;

  /**
   * `clarisa_policy_stage.id` → the stage NUMBER the guidance is written against.
   * Verified live on 27-Aug-2026 against `GET /clarisa/policy-stages/get/all`
   * (6 = "Stage 1", 7 = "Stage 2", 8 = "Stage 3").
   * Kept local instead of injecting `PolicyControlListService`: that service fires two CLARISA
   * GETs from its constructor, and this section renders for EVERY result type, so injecting it
   * would add two requests to Knowledge Products, Innovations and the rest for nothing.
   */
  private static readonly POLICY_STAGE_NUMBER_BY_ID: Readonly<Record<number, number>> = { 6: 1, 7: 2, 8: 3 };

  private readonly fieldsManagerSE = inject(FieldsManagerService);

  /** `results_policy_changes.policy_stage_id` of the open result; null until the GET lands. */
  policyStageId: number | null = null;
  /** One stage lookup per open result. Reset by the effect when the result changes (phase switch). */
  private policyStageRequested = false;
  private lastResultIdSeen: unknown = undefined;

  evidencesBody = new EvidencesBody();
  readinessLevel: number = 0;
  isOptional: boolean = false;
  isOptionalReadinessLevel: boolean;

  // P2-2935: creation/edit modal + accordion list
  showCreateModal = false;
  draftEvidence: EvidencesCreateInterface = { is_sharepoint: false };
  // null → the modal is creating; a number → the modal is editing that evidence index.
  editingIndex: number | null = null;
  // P2-2935: true while the section is persisting (upload + POST + reload) → drives the skeleton.
  isSaving = false;

  // Impact-area + typology fields surfaced as tags in the collapsed accordion header.
  // (Note: the "Climate change" checkbox is bound to youth_related, matching the existing form.)
  private readonly tagFields: { field: keyof EvidencesCreateInterface; label: string }[] = [
    { field: 'gender_related', label: 'Gender equality, youth and social inclusion' },
    { field: 'youth_related', label: 'Climate adaptation and mitigation' },
    { field: 'nutrition_related', label: 'Nutrition, health and food security' },
    { field: 'environmental_biodiversity_related', label: 'Environmental health and biodiversity' },
    { field: 'poverty_related', label: 'Poverty reduction, livelihoods and jobs' },
    { field: 'innovation_readiness_related', label: 'Innovation Development' },
    { field: 'innovation_use_related', label: 'Innovation Use' },
    { field: 'policy_change_related', label: 'Policy Change' },
    { field: 'capacity_sharing_related', label: 'Capacity Sharing for Development' },
    { field: 'knowledge_product_metadata_related', label: 'Knowledge Product' },
    { field: 'other_output_related', label: 'Other Output' },
    { field: 'other_outcome_related', label: 'Other Outcome' }
  ];

  alertStatus() {
    if (this.api.dataControlSE.isKnowledgeProduct)
      return 'As this knowledge product is stored in the repository, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.';
    let mainText = `<ul>
    <li>Submit a maximum of 6 pieces of evidence per result. If you are updating a legacy result (e.g. an innovation) that already has 6 pieces of evidence, remove any that are no longer relevant for the current reporting year and replace them with up-to-date evidence supporting the claim. Evidence will be ordered by the system from most to least recent.</li>
    <li>All links provided should be publicly accessible.</li>
    <li>Links to SharePoint, One Drive, Google Drive, DropBox and other file storage platforms are not allowed.</li>
    <li>Files can be uploaded to the PRMS repository.</li>
    <li>For confidential evidence, select “Upload file” and then respond with “No” to the confidentiality question to indicate that it should not be public.</li>
    <li>If you need additional information or guidance on how to create an evidence entry, you can find a video tutorial at the following a <a class="open_route" href="https://cgiar.sharepoint.com/:v:/s/OneCGIARPRMSRepository/IQCPCRtUOihDQKJExjQgfIOIAZQAZH4pnHDucy3HX-w14WU?e=Xoy42x" target="_blank">link</a>.</li>
    `;

    if (this.api.dataControlSE?.currentResult?.result_type_id === 5)
      mainText +=
        '<li>Capacity sharing for development does not currently require evidence submission for quality assurance due to the time/resource burden and potential unresolved General Data Protection Regulation (GDPR) issues.</li><li>By submitting a capacity sharing for development result it is understood that you have evidence to support the result submission, and that should a sub-sample be required this evidence could be made available.</li>';
    mainText += '</ul> ';
    return mainText;
  }

  /**
   * P2-3262: TRUE when the evidence guidance must leave the grey box and live behind the single ⓘ
   * of the section heading — Policy change results only, from the 2026 reporting phase on.
   *
   * PHASE, NOT PORTFOLIO. The gate is the shared phase-year threshold
   * `ReportingDesignYear.ReportingFormGuidanceRedesign` (via `FieldsManagerService`), the very same
   * one P2-3201 used to move field guidance into ⓘ tooltips — this is the same redesign, applied to
   * one more section. `isP25()` answers "which portfolio" and is NOT interchangeable: prtest holds
   * 2025-phase results inside the P25 portfolio, and a portfolio gate would rewrite their form.
   */
  policyChangeGuidanceAsTooltip(): boolean {
    return (
      this.api.dataControlSE?.currentResult?.result_type_id === RdEvidencesComponent.POLICY_CHANGE_RESULT_TYPE_ID &&
      this.fieldsManagerSE.isReportingFormGuidance2026()
    );
  }

  /**
   * P2-3262 Part 1 + Part 2: the general evidence rules (identical text to the grey box every other
   * result type still shows) followed by the Policy change block, whose stage requirement adapts to
   * the stage already chosen in the "Policy change information" section.
   */
  policyChangeEvidenceGuidance(): string {
    return `${this.alertStatus()}${this.policyChangeSpecificGuidance()}`;
  }

  /** Part 2 only. Split out so the stage-dependent branch is testable on its own. */
  private policyChangeSpecificGuidance(): string {
    return `<p><strong>Policy change evidence</strong></p>
    <p>Evidence is required for all stages to validate the specific claims made as to the relationship between CGIAR's research and any reported policy outcome (i.e. that there was a meaningful contribution of CGIAR). Evidence supporting the CGIAR contribution does not need to be public — it may be kept out of the public domain. In some cases, the contribution could be explicitly mentioned in a policy strategy or impact assessment study; in others it may only appear in emails or verbally.</p>
    ${this.stageSpecificRequirements()}
    <p><strong>Examples per evidence type</strong></p>
    <p><strong>CGIAR contribution to an outcome (Stages 1, 2 and 3)</strong></p>
    <ul>
    <li>Citation of CGIAR outputs in the document used as evidence</li>
    <li>Acknowledgement of the CGIAR contribution</li>
    <li>Third-party evaluations describing the CGIAR contribution</li>
    <li>Documents co-authored by, or quoting, the organization with the policy outcome</li>
    <li>Media stories announcing the outcome that mention CGIAR</li>
    <li>Emails from the organization acknowledging the contribution</li>
    </ul>
    <p><strong>Evidence that a policy outcome has taken place (Stage 2)</strong></p>
    <ul>
    <li>A link to the new or revised policy document (strategy, law, regulation, program, investment)</li>
    <li>If unavailable, a digital copy stored for review</li>
    <li>A link to the policy organization's website announcing the outcome</li>
    <li>A link to a media story announcing it</li>
    </ul>
    <p><strong>Evidence of impact of a policy (Stage 3)</strong></p>
    <ul>
    <li>Strong evidence such as a peer-reviewed publication or an external evaluation is required.</li>
    </ul>`;
  }

  /**
   * The stage requirement the ticket writes for the stage currently selected on the result.
   * Stage 1 has no requirement of its own in the ticket, so it renders none.
   * The ticket does not say what to show BEFORE a stage is picked (the stage lives in another
   * section); both requirements are listed then, so the guidance is never empty.
   */
  private stageSpecificRequirements(): string {
    const stage = RdEvidencesComponent.POLICY_STAGE_NUMBER_BY_ID[this.policyStageId];
    const items: string[] = [];
    if (stage === undefined || stage === 2)
      items.push(
        '<li><strong>Stage 2 – Policy enacted:</strong> Evidence that an outcome has taken place is required, e.g., a link to the published/enacted documents must be provided.</li>'
      );
    if (stage === undefined || stage === 3)
      items.push(
        '<li><strong>Stage 3 – Evidence of impact of policy:</strong> A link to strong evidence of the impact of the policy on people or the environment must be provided. Where a Key Results Story is completed to evidence a policy outcome, other links to evidence are not required.</li>'
      );
    if (!items.length) return '';
    return `<p><strong>Stage-specific requirements</strong></p><ul>${items.join('')}</ul>`;
  }

  /**
   * Publishes (or clears) the section-heading ⓘ. Re-run after the policy-change GET lands, because
   * the stage-specific paragraph is only known then.
   */
  private publishSectionGuidance(): void {
    this.dataControlSE.currentResultSectionGuidance.set(this.policyChangeGuidanceAsTooltip() ? this.policyChangeEvidenceGuidance() : '');
  }

  /** Fires the stage lookup at most once per open result, and only behind the P2-3262 gate. */
  private maybeFetchPolicyStage(): void {
    if (!this.policyChangeGuidanceAsTooltip() || this.policyStageRequested) return;
    this.policyStageRequested = true;
    this.getPolicyStage();
  }

  /** Only source of `policy_stage_id` for this section: the Policy change information endpoint. */
  private getPolicyStage(): void {
    this.api.resultsSE.GET_policyChanges().subscribe({
      next: ({ response }) => {
        this.policyStageId = response?.policy_stage_id ?? null;
        this.publishSectionGuidance();
      },
      // A failed lookup must not blank the guidance: it stays on the "no stage picked yet" text.
      error: () => this.publishSectionGuidance()
    });
  }

  constructor(
    public api: ApiService,
    public innovationControlListSE: InnovationControlListService,
    private saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Evidence');

    /**
     * P2-3262: the result can land AFTER this section mounts (`GET_resultById` resets
     * `currentResultSignal` to `{}` and fills it later), and it changes again on a phase switch
     * without the component being recreated. Publishing only from `ngOnInit` would leave the ⓘ
     * missing in the first case and stale in the second.
     */
    effect(() => {
      const current = this.dataControlSE.currentResultSignal();
      if (current?.id !== this.lastResultIdSeen) {
        this.lastResultIdSeen = current?.id;
        this.policyStageId = null;
        this.policyStageRequested = false;
      }
      this.publishSectionGuidance();
      this.maybeFetchPolicyStage();
    });
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction so the empty `EvidencesBody()` never
   * paints as a filled-in-and-lost form; released on both `next` and `error`.
   */
  readonly sectionLoading = signal(true);

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
    // P2-3262: publish immediately (so the ⓘ is there on first paint) and again once the stage lands.
    this.publishSectionGuidance();
    this.maybeFetchPolicyStage();
  }

  /** P2-3262: the shell heading is shared — leaving this set would show Evidence guidance on the
   * next section the user opens. */
  ngOnDestroy(): void {
    this.dataControlSE.currentResultSectionGuidance.set('');
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe({
      next: ({ response }) => {
        this.evidencesBody = response;
        this.sortEvidences();
        this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
        this.isOptional = Boolean(this.readinessLevel === 0);
        this.isOptionalReadinessLevel = Boolean(this.readinessLevel === 0);
        this.isSaving = false;
        this.sectionLoading.set(false);
      },
      error: () => {
        this.isSaving = false;
        this.sectionLoading.set(false);
      }
    });
  }

  // Newest-first. Stable: only called on load and after save, never while editing.
  sortEvidences() {
    const ts = (e: EvidencesCreateInterface) => {
      const d = e?.last_updated_date || e?.creation_date;
      const t = d ? new Date(d).getTime() : NaN;
      return Number.isNaN(t) ? null : t;
    };
    this.evidencesBody?.evidences?.sort((a, b) => {
      const ta = ts(a);
      const tb = ts(b);
      if (ta !== null && tb !== null && ta !== tb) return tb - ta;
      if (ta !== null && tb === null) return -1;
      if (ta === null && tb !== null) return 1;
      return (b?.id ?? 0) - (a?.id ?? 0);
    });
  }

  async getAndCalculateFilePercentage(response, evidenceIterator) {
    const nextRange = response?.nextExpectedRanges[0];
    const [startByte, totalBytes] = (nextRange?.split('-') || []).map(Number);
    if (!totalBytes || !response.nextExpectedRanges?.length || evidenceIterator.percentage == 100) return;
    const progressPercentage = (startByte / totalBytes) * 100;
    evidenceIterator.percentage = progressPercentage.toFixed(0);
  }

  endLoadFile(intervalId, evidenceIterator) {
    clearInterval(intervalId);
    evidenceIterator.percentage = 100;
  }

  /** P2-3220: returns the names of the files whose SharePoint upload failed (empty when all went up). */
  async loadAllFiles(): Promise<string[]> {
    const { evidences } = this.evidencesBody;
    const failed: string[] = [];
    let count = 0;
    for (const evidenceIterator of evidences) {
      if (evidenceIterator.file) count++;
      if (!evidenceIterator?.file) continue;
      try {
        const { response: uploadUrl } = await this.api.resultsSE.POST_createUploadSession({
          resultId: this.evidencesBody.result_id,
          fileName: evidenceIterator?.file?.name,
          count
        });
        const intervalId = setInterval(async () => {
          try {
            const response = await this.api.resultsSE.GET_loadFileInUploadSession(uploadUrl);
            if (response?.nextExpectedRanges[0]) this.getAndCalculateFilePercentage(response, evidenceIterator);
          } catch (error) {
            this.endLoadFile(intervalId, evidenceIterator);
          }
        }, 2000);
        const response = await this.api.resultsSE.PUT_loadFileInUploadSession(evidenceIterator.file, uploadUrl);
        this.endLoadFile(intervalId, evidenceIterator);
        evidenceIterator.link = response?.webUrl;
        evidenceIterator.sp_document_id = response?.id;
        evidenceIterator.sp_file_name = response?.name;
        evidenceIterator.sp_folder_path = response?.parentReference?.path.split('root:').pop();
      } catch (error) {
        // P2-3220: never fail silently. The section is saved either way (the file also travels in
        // the multipart body of `POST_evidences`), but an evidence with no `link` and no `sp_*`
        // metadata is not stored in SharePoint, and the user has to be told rather than left
        // believing the upload worked.
        failed.push(evidenceIterator?.file?.name ?? 'file');
        console.error('[rd-evidences] SharePoint upload failed for', evidenceIterator?.file?.name, error);
      }
    }
    return failed;
  }

  async onSaveSection() {
    this.isSaving = true;
    this.saveButtonSE.showSaveSpinner();
    const failedUploads = await this.loadAllFiles();
    this.saveButtonSE.hideSaveSpinner();

    // P2-3220: tell the user explicitly which files did not reach SharePoint.
    if (failedUploads.length) {
      this.api.alertsFe.show({
        id: 'evidence-upload-failed',
        title: `${failedUploads.length} file(s) could not be stored: ${failedUploads.join(', ')}`,
        description: 'The evidence was saved, but those files are not in SharePoint. Please re-attach them and save again.',
        status: 'error'
      });
    }

    this.api.resultsSE.POST_evidences(this.evidencesBody).subscribe({
      next: () => this.getSectionInformation(),
      // P2-3373: `isSaving` is only cleared by `getSectionInformation()`, which never runs when
      // the POST fails — the flag latched on and `isEvidenceUploading()` kept every file evidence
      // showing the "uploading" skeleton instead of its link until the page was reloaded.
      // The error toast is already raised by `isSavingPipe`; handling the error here also stops
      // its rethrow surfacing as an unhandled "Uncaught [object Object]".
      error: () => {
        this.isSaving = false;
      }
    });
  }

  // P2-2935: a file evidence is "uploading" while the section is saving and its link
  // has not yet been resolved → the card shows the file name + a skeleton until the link lands.
  isEvidenceUploading(evidence: EvidencesCreateInterface): boolean {
    return Boolean(this.isSaving && evidence?.is_sharepoint && evidence?.file && !evidence?.link);
  }

  // File name to show while uploading (before the server link/sp_file_name is available).
  evidenceUploadingName(evidence: EvidencesCreateInterface): string {
    return evidence?.file?.name || evidence?.sp_file_name || 'Uploading file…';
  }

  // P2-2935: "Add evidence" opens the modal in create mode with a clean draft.
  addEvidence() {
    this.editingIndex = null;
    this.draftEvidence = { is_sharepoint: false };
    this.showCreateModal = true;
  }

  // P2-2935: the pencil opens the modal in edit mode on a clone, so "Cancel" discards changes.
  editEvidence(index: number) {
    this.editingIndex = index;
    this.draftEvidence = { ...this.evidencesBody.evidences[index] };
    this.showCreateModal = true;
  }

  get isEditingEvidence(): boolean {
    return this.editingIndex !== null;
  }

  // Confirm from the modal: replace in place when editing, otherwise prepend (newest on top),
  // then persist immediately by running the section-level Save (same POST as the "Save" button).
  confirmCreateEvidence() {
    if (this.editingIndex !== null) {
      this.evidencesBody.evidences[this.editingIndex] = this.draftEvidence;
    } else {
      this.evidencesBody.evidences.unshift(this.draftEvidence);
    }
    this.showCreateModal = false;
    this.draftEvidence = { is_sharepoint: false };
    this.editingIndex = null;
    this.validateCheckBoxes();
    this.onSaveSection();
  }

  cancelCreateEvidence() {
    this.showCreateModal = false;
    this.draftEvidence = { is_sharepoint: false };
    this.editingIndex = null;
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
    this.validateCheckBoxes();
  }

  // Delete from the accordion header with a confirmation popup (reuses the existing alert).
  // P2-3030: confirming the delete persists immediately via the section save flow (same as
  // create/edit confirm), so the deletion is not lost when navigating away and back.
  deleteEvidenceWithConfirm(index: number) {
    this.api.alertsFe.show(
      { id: 'confirm-delete-evidence', title: 'Are you sure you want to delete this evidence?', status: 'warning', confirmText: 'Yes, delete' },
      () => {
        this.deleteEvidence(index);
        this.onSaveSection();
      }
    );
  }

  // ---- Accordion header helpers (P2-2935) ----

  isFileEvidence(evidence: EvidencesCreateInterface): boolean {
    return Boolean(evidence?.is_sharepoint);
  }

  evidenceTypeLabel(evidence: EvidencesCreateInterface): string {
    return this.isFileEvidence(evidence) ? 'File Evidence' : 'Link Evidence';
  }

  evidenceDisplayName(evidence: EvidencesCreateInterface): string {
    return evidence?.sp_file_name || evidence?.link || '';
  }

  getSelectedImpactTags(evidence: EvidencesCreateInterface): string[] {
    if (!evidence) return [];
    return this.tagFields.filter(({ field }) => evidence[field]).map(({ label }) => label);
  }

  // Read-only visibility label (only meaningful for file evidence).
  evidenceVisibilityLabel(evidence: EvidencesCreateInterface): string {
    if (!this.isFileEvidence(evidence)) return '';
    if (evidence?.is_public_file === true) return 'Public';
    if (evidence?.is_public_file === false) return 'Not public';
    return '';
  }

  // True when the modal draft can be added (mirrors the per-item save rules).
  get draftValid(): boolean {
    const e = this.draftEvidence;
    if (!e) return false;
    if (e.is_sharepoint) return Boolean(e.file || e.link);
    return Boolean(e.link);
  }

  validateCheckBoxes() {
    const tags = [
      { tag: 'Gender equality, youth and social inclusion', level: this.evidencesBody?.gender_tag_level, related: 'gender_related' },
      { tag: 'Climate adaptation and mitigation', level: this.evidencesBody?.climate_change_tag_level, related: 'youth_related' },
      { tag: 'Nutrition, health and food security', level: this.evidencesBody?.nutrition_tag_level, related: 'nutrition_related' },
      { tag: 'Environmental health and biodiversity', level: this.evidencesBody?.environmental_biodiversity_tag_level, related: 'environmental_biodiversity_related' },
      { tag: 'Poverty reduction, livelihoods and jobs', level: this.evidencesBody?.poverty_tag_level, related: 'poverty_related' }
    ];

    const evidences = this.evidencesBody.evidences;
    const hasTagRelated = (related: string) => evidences.some(evidence => evidence[related]);

    const text = tags
      .filter(({ level, related }) => level === '3' && !hasTagRelated(related))
      .map(({ tag }) => `<li>A principal contribution score (2) has been recorded for ${tag} tag. Please provide evidence to support this claim.</li>`)
      .join('');

    if (!text) {
      return '';
    }

    const allTagsRelated = tags.every(({ related }) => hasTagRelated(related));

    if (!allTagsRelated) {
      this.isOptional = false;
    }

    return `<ul>${text}</ul>`;
  }

  validateHasInnoReadinessLevelEvidence() {
    if (this.isOptionalReadinessLevel) return true;

    return this.evidencesBody.evidences.some(evidence => evidence.innovation_readiness_related);
  }

  // P2-3056: the Evidence green check must stay red until ALL mandatory evidence is present:
  // (1) at least one piece of evidence (type 5 is exempt),
  // (2) evidence for every Impact-Area marker set to Principal (validateCheckBoxes() returns '' when covered),
  // (3) Innovation-Readiness evidence when the readiness level is 1-9 (Innovation Development, type 7, only).
  // Reuses the same helpers that drive the yellow warnings so the check and the alerts never disagree.
  get evidenceSectionComplete(): boolean {
    const resultTypeId = this.api.dataControlSE.currentResult?.result_type_id;
    const hasBaseEvidence = this.evidencesBody.evidences.length > 0 || resultTypeId == 5;
    const markersCovered = !this.validateCheckBoxes();
    const readinessCovered = resultTypeId !== 7 || this.validateHasInnoReadinessLevelEvidence();
    return hasBaseEvidence && markersCovered && readinessCovered;
  }

  get validateButtonDisabled() {
    const invalidLinkRegex =
      /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;

    const evidences = this.evidencesBody.evidences;

    const missingLinkNonSharepoint = evidences.some(e => !e?.link && !e?.is_sharepoint);
    if (missingLinkNonSharepoint) return true;

    const nonSharepointLinks = evidences.filter(e => e.link && !e.is_sharepoint).map(e => e.link);
    const uniqueLinks = new Set(nonSharepointLinks);
    if (uniqueLinks.size !== nonSharepointLinks.length) return true;

    const sharepointMissingFileAndLink = evidences.some(e => e.is_sharepoint && !(e.file || e.link));
    if (sharepointMissingFileAndLink) return true;

    const hasInvalidLink = evidences.some(e => e.link && !e.is_sharepoint && invalidLinkRegex.test(e.link));
    if (hasInvalidLink) return true;

    return false;
  }
}
