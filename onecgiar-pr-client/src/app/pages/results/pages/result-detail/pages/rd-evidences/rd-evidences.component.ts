import { Component, OnInit } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent implements OnInit {
  evidencesBody = new EvidencesBody();
  readinessLevel: number = 0;
  isOptional: boolean = false;
  isOptionalReadinessLevel: boolean;

  alertStatus() {
    if (this.api.dataControlSE.isKnowledgeProduct)
      return 'As this knowledge product is stored in CGSpace, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.';
    let mainText = `<ul>
    <li>Submit a maximum of 6 pieces of evidence.</li>
    <li>Please list evidence from most to least important.</li>
    <li>All links provided should be publicly accessible. All CGIAR publications should be shared using a CGSpace link.</li>
    <li>Links to SharePoint, One Drive, Google Drive, DropBox and other file storage platforms are not allowed.</li>
    <li>Files can be also uploaded to the PRMS repository.</li>
    <li>For confidential evidence, select “Upload file” and then “No” to indicate that it should not be public.</li>`;

    if (this.api.dataControlSE?.currentResult?.result_type_id === 7)
      mainText +=
        '<li>Provide evidence/documentation in support of the current innovation readiness level (for level 0 no evidence needs to be provided).</li>';

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
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
      this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
      this.isOptional = Boolean(this.readinessLevel === 0);
      this.isOptionalReadinessLevel = Boolean(this.readinessLevel === 0);
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

  addEvidence() {
    this.evidencesBody.evidences.push({ is_sharepoint: false });
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
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
