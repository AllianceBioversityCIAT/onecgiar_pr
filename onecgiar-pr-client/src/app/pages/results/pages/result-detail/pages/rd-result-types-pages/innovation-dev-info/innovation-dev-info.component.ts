import { Component, effect } from '@angular/core';
import { InnovationDevInfoBody } from './model/innovationDevInfoBody';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationDevelopmentQuestions } from './model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from './services/innovation-dev-info-utils.service';
import { InnovationDevelopmentLinks } from './model/InnovationDevelopmentLinks.model';
import { TerminologyService } from '../../../../../../../internationalization/terminology.service';
import { EvidencesBody, EvidencesCreateInterface } from '../../../../result-detail/pages/rd-evidences/model/evidencesBody.model';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-innovation-dev-info',
  templateUrl: './innovation-dev-info.component.html',
  styleUrls: ['./innovation-dev-info.component.scss'],
  standalone: false
})
export class InnovationDevInfoComponent {
  innovationDevInfoBody = new InnovationDevInfoBody();
  range = 5;
  savingSection = false;
  innovationDevelopmentQuestions: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();
  innovationDevelopmentLinks: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  evidencesBody: EvidencesBody = new EvidencesBody();
  isOptional: boolean = false;

  constructor(
    private api: ApiService,
    public innovationControlListSE: InnovationControlListService,
    private innovationDevInfoUtilsSE: InnovationDevInfoUtilsService,
    private terminologyService: TerminologyService,
    public fieldsManagerSE: FieldsManagerService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation Development information');
  }

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

  getSectionInformationp25(): void {
    this.api.resultsSE.GET_innovationDevP25().subscribe(({ response }) => {
      this.innovationDevInfoBody = response;
      this.convertOrganizations(response?.innovatonUse?.organization);
      this.innovationDevInfoBody.innovation_user_to_be_determined = Boolean(this.innovationDevInfoBody.innovation_user_to_be_determined);
      this.savingSection = false;
    });
    this.api.resultsSE.GET_questionsInnovationDevelopmentP25().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
    });

    this.getEvidenceDemandP25();
  }

  GET_questionsInnovationDevelopment() {
    this.api.resultsSE.GET_questionsInnovationDevelopment().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
    });
  }

  getSectionInformation() {
    this.savingSection = true;
    this.GET_questionsInnovationDevelopment();
    this.api.resultsSE.GET_innovationDev().subscribe({
      next: ({ response }) => {
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.innovationDevInfoBody = response;
        this.innovationDevInfoBody.innovation_user_to_be_determined = Boolean(this.innovationDevInfoBody.innovation_user_to_be_determined);
        this.savingSection = false;
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
      }
    });
  }

  private getEvidenceDemandP25() {
    this.api.resultsSE.GET_evidenceDemandP25().subscribe(({ response }) => {
      this.evidencesBody = response || new EvidencesBody();
      if (!Array.isArray(this.evidencesBody.evidences)) {
        this.evidencesBody.evidences = [] as unknown as Array<EvidencesCreateInterface>;
      }
      if (this.evidencesBody.evidences.length === 0) {
        this.evidencesBody.evidences.push({ is_sharepoint: false } as any);
      }
    });
  }

  convertOrganizations(organizations) {
    organizations.forEach((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.innovationDevInfoBody.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  async onSaveSection() {
    this.savingSection = true;
    this.convertOrganizationsTosave();
    if (this.innovationDevInfoBody.innovation_nature_id != 12) {
      this.innovationDevInfoBody.number_of_varieties = null;
      this.innovationDevInfoBody.is_new_variety = null;
    }
    if (this.fieldsManagerSE.isP25()) {
      const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;
      (this.evidencesBody as any).result_id = resultId;

      try {
        await this.uploadPendingFiles();
      } catch (error) {
        console.error('Error uploading files:', error);
        this.savingSection = false;
        return;
      }

      this.api.resultsSE.POST_createEvidenceDemandP25(this.evidencesBody).subscribe({
        next: () => {
          this.api.resultsSE.PATCH_innovationDevP25({ ...this.innovationDevInfoBody, ...this.innovationDevelopmentQuestions }).subscribe({
            next: () => {
              this.getSectionInformationp25();
              this.savingSection = false;
            },
            error: err => {
              console.error(err);
              this.savingSection = false;
            }
          });
        },
        error: err => {
          console.error(err);
          this.savingSection = false;
        }
      });
    } else {
      this.api.resultsSE.PATCH_innovationDev({ ...this.innovationDevInfoBody, ...this.innovationDevelopmentQuestions }).subscribe({
        next: ({ response }) => {
          this.getSectionInformation();
          this.savingSection = false;
        },
        error: err => {
          console.error(err);
          this.savingSection = false;
        }
      });
    }
  }

  private async uploadPendingFiles(): Promise<void> {
    if (!Array.isArray(this.evidencesBody.evidences)) {
      return;
    }

    const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;
    let count = 0;

    for (const evidence of this.evidencesBody.evidences) {
      if (evidence.file && !evidence.link) {
        count++;
        try {
          const { response: uploadUrl } = await firstValueFrom(
            this.api.resultsSE.POST_createUploadSessionP25({
              resultId,
              fileName: evidence.file.name,
              count
            })
          );

          const intervalId = setInterval(async () => {
            try {
              const response = await this.api.resultsSE.GET_loadFileInUploadSession(uploadUrl);
              if (response?.nextExpectedRanges?.[0]) {
                const nextRange = response?.nextExpectedRanges[0];
                const [startByte, totalBytes] = nextRange.split('-').map(Number);
                if (totalBytes) {
                  const progressPercentage = (startByte / totalBytes) * 100;
                  (evidence as any).percentage = Number.isFinite(progressPercentage) ? progressPercentage.toFixed(0) : (evidence as any).percentage;
                }
              }
            } catch (_) {
              clearInterval(intervalId);
              (evidence as any).percentage = 100;
            }
          }, 2000);

          const response = await this.api.resultsSE.PUT_loadFileInUploadSession(evidence.file, uploadUrl);
          clearInterval(intervalId);
          (evidence as any).percentage = 100;
          evidence.link = response?.webUrl;
          (evidence as any).sp_document_id = response?.id;
          evidence.sp_file_name = response?.name || evidence.file.name;
          (evidence as any).sp_folder_path = response?.parentReference?.path?.split('root:')?.pop();
        } catch (error) {
          console.error('Error uploading evidence file:', error);
          throw error;
        }
      }
    }
  }

  pdfOptions = [
    { name: 'Yes', value: true },
    { name: 'No, not necessary at this stage', value: false }
  ];

  pdfDescription() {
    return `Examples of IPSR Innovation Profiles can be found  <a class="open_route" target="_blank" href="https://cgspace.cgiar.org/handle/10568/121923">here</a>.`;
  }

  acknowledgementDescription() {
    return `Are there any specific investors or donors – other than the <a class="open_route" target="_blank" href="https://www.cgiar.org/funders/">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation? <br> - Please separate donor/investor names by a semicolon. <br> - Donors/investors will be included in the acknowledgment section in the Innovation Profile.`;
  }

  alertInfoText() {
    return `Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale. Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling)<br><br>The specific number of new or improved lines/ varieties can be specified under Innovation Typology.`;
  }

  alertInfoText2() {
    return `Please make sure you provide evidence/documentation that support the current innovation readiness level.<br>
    * Evidence are inputted in the "Evidence" section <a class="open_route" target="_blank" href="/result/result-detail/${this.api.resultsSE?.currentResultCode}/evidences?phase=${this.api.resultsSE?.currentResultPhase}">(click here to go there)</a><br>
    <br><br>
    Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation.
    <br><br>
    Examples of evidence documentation for different CGIAR innovations and readiness levels can be found <a target="_blank" href="https://drive.google.com/file/d/1rWGC0VfxazlzdZ1htcfBSw1jO7GmVQbq/view" class='open_route alert-event'>here</a>`;
  }

  shortTitleDescription() {
    return `<ul>
    <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
    <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
    <li>Enter a short name that facilitates clear communication about the innovation.</li>
    <li>Avoid abbreviations or (technical) jargon.</li>
    <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
    <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
    <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
    <li>Avoid the use of CGIAR Center, Initiative or organization names in the short title</li>
    </ul>`;
  }

  readiness_of_this_innovation_description() {
    return `<ul>
    <li>In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation.</li>
    <li>The innovation readiness level will be quality assessed.</li>
    <li><strong>YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">INNOVATION READINESS CALCULATOR</a></strong></li>
    </ul>`;
  }

  hasReadinessLevelDiminished() {
    const currentLevel = this.innovationControlListSE?.readinessLevelsList.find(
      irl => irl.id === this.innovationDevInfoBody?.innovation_readiness_level_id
    );
    const oldLevel = this.innovationControlListSE?.readinessLevelsList.find(irl => irl.id === this.innovationDevInfoBody?.previous_irl);

    return Number(currentLevel?.level) < Number(oldLevel?.level);
  }

  alertDiminishedReadinessLevel() {
    return `It appears that the readiness level has decreased since the previous report. Please provide a justification in the text box below.`;
  }

  // Métodos para manejar evidencias
  addEvidence() {
    this.evidencesBody.evidences.push({ is_sharepoint: false } as any);
  }

  deleteEvidence(index: number) {
    this.evidencesBody.evidences.splice(index, 1);
    if (this.evidencesBody.evidences.length === 0) {
      this.evidencesBody.evidences.push({ is_sharepoint: false } as any);
    }
  }

  getReadinessLevelIndex(): number {
    if (!this.innovationDevInfoBody.innovation_readiness_level_id || !this.innovationControlListSE.readinessLevelsList) {
      return -1;
    }

    const selectedId = this.innovationDevInfoBody.innovation_readiness_level_id;
    const index = this.innovationControlListSE.readinessLevelsList.findIndex(level => level.id === selectedId);
    return index >= 0 ? index : -1;
  }
}
