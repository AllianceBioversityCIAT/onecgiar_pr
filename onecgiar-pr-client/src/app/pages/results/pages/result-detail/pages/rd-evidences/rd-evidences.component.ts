import { Component, OnInit } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent implements OnInit {
  evidencesBody = new EvidencesBody();
  readinessLevel: number = 0;
  isOptional: boolean = false;

  alertStatus() {
    if (this.api.dataControlSE.isKnowledgeProduct) return 'As this knowledge product is stored in CGSpace, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.';
    let mainText = '<ul><li>Submit a maximum of 6 pieces of evidence.</li><li>Please list evidence from most to least important.</li><li>Files can be uploaded.</li>';
    if (this.api.dataControlSE?.currentResult?.result_type_id === 5) mainText += '<li>Capacity sharing for development does not currently require evidence submission for quality assurance due to the time/resource burden and potential unresolved General Data Protection Regulation (GDPR) issues.</li><li>By submitting a capacity sharing for development result it is understood that you have evidence to support the result submission, and that should a sub-sample be required this evidence could be made available.</li>';
    mainText += '</ul> ';
    return mainText;
  }
  constructor(public api: ApiService, public innovationControlListSE: InnovationControlListService, private saveButtonSE: SaveButtonService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
      this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
      this.isOptional = Boolean(this.readinessLevel === 0);
    });
  }

  async getAndCalculateFilePercentage(response, evidenceIterator) {
    let nextRange = response?.nextExpectedRanges[0];
    let [startByte, totalBytes] = (nextRange?.split('-') || []).map(Number);
    if (!totalBytes || !response.nextExpectedRanges?.length || evidenceIterator.percentage == 100) return;
    let progressPercentage = (startByte / totalBytes) * 100;
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
      if (!evidenceIterator?.sp_evidence_id) count++;
      if (!evidenceIterator?.file) continue;
      try {
        const { uploadUrl } = await this.api.resultsSE.POST_createUploadSession({ resultId: this.evidencesBody.result_id, fileName: evidenceIterator?.file?.name, count });
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
        console.log(error);
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
  get validateCGSpaceLinks() {
    for (const evidenteIterator of this.evidencesBody.evidences) {
      if (this.evidencesBody.evidences.find(evidence => !evidence?.link && !evidence?.is_sharepoint)) return true;
      const evidencesFinded = this.evidencesBody.evidences.filter(evidence => evidence.link == evidenteIterator.link && !evidence.is_sharepoint);
      if (evidencesFinded.length >= 2) {
        return true;
      }
      if (evidenteIterator.is_sharepoint && !(evidenteIterator?.file || evidenteIterator?.link)) {
        return true;
      }
    }

    return false;
  }

  OpenKp() {}
}
