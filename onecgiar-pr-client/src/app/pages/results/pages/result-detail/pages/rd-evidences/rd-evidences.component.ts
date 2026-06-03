import { Component, OnInit } from '@angular/core';
import { EvidencesBody, EvidencesCreateInterface } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss'],
  standalone: false
})
export class RdEvidencesComponent implements OnInit {
  evidencesBody = new EvidencesBody();
  readinessLevel: number = 0;
  isOptional: boolean = false;
  isOptionalReadinessLevel: boolean;

  // P2-2935: creation modal + accordion list
  showCreateModal = false;
  draftEvidence: EvidencesCreateInterface = { is_sharepoint: false };

  // Impact-area + typology fields surfaced as tags in the collapsed accordion header.
  // (Note: the "Climate change" checkbox is bound to youth_related, matching the existing form.)
  private readonly tagFields: { field: keyof EvidencesCreateInterface; label: string }[] = [
    { field: 'gender_related', label: 'Gender' },
    { field: 'youth_related', label: 'Climate change' },
    { field: 'nutrition_related', label: 'Nutrition' },
    { field: 'environmental_biodiversity_related', label: 'Environment' },
    { field: 'poverty_related', label: 'Poverty' },
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
    <li>All links provided should be publicly accessible. All CGIAR publications should be shared using a CGSpace link.</li>
    <li>Links to SharePoint, One Drive, Google Drive, DropBox and other file storage platforms are not allowed.</li>
    <li>Files can be also uploaded to the PRMS repository.</li>
    <li>For confidential evidence, select “Upload file” and then “No” to indicate that it should not be public.</li>
    <li>If you need additional information or guidance on how to create an evidence entry, you can find a video tutorial at the following a <a class="open_route" href="https://cgiar.sharepoint.com/:v:/s/OneCGIARPRMSRepository/ETb3eWyBPm9FumJV75XyUDABeVD57nTvz9zz1kNzL_Ob9w?e=kvLk2t" target="_blank">link</a>.</li>
    `;

    if (this.api.dataControlSE?.currentResult?.result_type_id === 5)
      mainText +=
        '<li>Capacity sharing for development does not currently require evidence submission for quality assurance due to the time/resource burden and potential unresolved General Data Protection Regulation (GDPR) issues.</li><li>By submitting a capacity sharing for development result it is understood that you have evidence to support the result submission, and that should a sub-sample be required this evidence could be made available.</li>';
    mainText += '</ul> ';
    return mainText;
  }

  constructor(
    public api: ApiService,
    public innovationControlListSE: InnovationControlListService,
    private saveButtonSE: SaveButtonService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Evidence');
  }

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
      this.sortEvidences();
      this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
      this.isOptional = Boolean(this.readinessLevel === 0);
      this.isOptionalReadinessLevel = Boolean(this.readinessLevel === 0);
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

  async loadAllFiles() {
    const { evidences } = this.evidencesBody;
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
        console.error(error);
      }
    }
  }

  async onSaveSection() {
    this.saveButtonSE.showSaveSpinner();
    await this.loadAllFiles();
    this.saveButtonSE.hideSaveSpinner();

    this.api.resultsSE.POST_evidences(this.evidencesBody).subscribe(resp => {
      this.getSectionInformation();
    });
  }

  // P2-2935: "Add evidence" now opens the creation modal with a clean draft.
  addEvidence() {
    this.draftEvidence = { is_sharepoint: false };
    this.showCreateModal = true;
  }

  // Confirm from the modal: prepend (newest on top) and re-run validation. No persistence here.
  confirmCreateEvidence() {
    this.evidencesBody.evidences.unshift(this.draftEvidence);
    this.showCreateModal = false;
    this.draftEvidence = { is_sharepoint: false };
    this.validateCheckBoxes();
  }

  cancelCreateEvidence() {
    this.showCreateModal = false;
    this.draftEvidence = { is_sharepoint: false };
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
    this.validateCheckBoxes();
  }

  // Delete from the accordion header with a confirmation popup (reuses the existing alert).
  deleteEvidenceWithConfirm(index: number) {
    this.api.alertsFe.show(
      { id: 'confirm-delete-evidence', title: 'Are you sure you want to delete this evidence?', status: 'warning', confirmText: 'Yes, delete' },
      () => this.deleteEvidence(index)
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

  // True when the modal draft can be added (mirrors the per-item save rules).
  get draftValid(): boolean {
    const e = this.draftEvidence;
    if (!e) return false;
    if (e.is_sharepoint) return Boolean(e.file || e.link);
    return Boolean(e.link);
  }

  validateCheckBoxes() {
    const tags = [
      { tag: 'gender', level: this.evidencesBody?.gender_tag_level, related: 'gender_related' },
      { tag: 'climate change', level: this.evidencesBody?.climate_change_tag_level, related: 'youth_related' },
      { tag: 'nutrition', level: this.evidencesBody?.nutrition_tag_level, related: 'nutrition_related' },
      { tag: 'environment', level: this.evidencesBody?.environmental_biodiversity_tag_level, related: 'environmental_biodiversity_related' },
      { tag: 'poverty', level: this.evidencesBody?.poverty_tag_level, related: 'poverty_related' }
    ];

    const evidences = this.evidencesBody.evidences;
    const hasTagRelated = (related: string) => evidences.some(evidence => evidence[related]);

    const text = tags
      .filter(({ level, related }) => level === '3' && !hasTagRelated(related))
      .map(({ tag }) => `<li>At least one of the evidence sources must have the ${tag} checkbox marked if the ${tag} tag has a score of 2.</li>`)
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
