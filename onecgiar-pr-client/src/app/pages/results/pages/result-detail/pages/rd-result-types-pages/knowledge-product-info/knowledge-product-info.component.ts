import chroma from 'chroma-js';

import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { FairSpecificData, FullFairData, KnowledgeProductBody } from './model/knowledgeProductBody';
import { KnowledgeProductBodyMapped } from './model/KnowledgeProductBodyMapped';
import { KnowledgeProductSaveDto } from './model/knowledge-product-save.dto';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../../../../../../shared/services/customized-alerts-fe.service';

@Component({
    selector: 'app-knowledge-product-info',
    templateUrl: './knowledge-product-info.component.html',
    styleUrls: ['./knowledge-product-info.component.scss'],
    standalone: false
})
export class KnowledgeProductInfoComponent implements OnInit {
  knowledgeProductBody = new KnowledgeProductBodyMapped();
  sectionData: KnowledgeProductSaveDto = new KnowledgeProductSaveDto();
  meliaTypes = [];
  ostMeliaStudies = [];
  private readonly kpGradientScale = chroma.scale(['#f44444', '#dcdf38', '#38df7b']).mode('hcl');
  fair_data: Array<{ key: string; value: FairSpecificData }>;
  fairGuideline =
    'FAIR (findability, accessibility, interoperability, and reusability) scores are used to support reporting that aligns with the <a href="https://cgspace.cgiar.org/handle/10568/113623" target="_blank">CGIAR Open and FAIR Data Assets Policy</a>. FAIR scores are calculated based on the presence or absence of metadata in CGSpace. If you wish to enhance the FAIR score for a knowledge product, review the metadata flagged with a red icon below and liaise with your Center’s knowledge management team to implement improvements.';

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService
  ) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe(({ response }) => {
      this.knowledgeProductBody = this._mapFields(response as KnowledgeProductBody);
      this.sectionData.clarisaMeliaTypeId = response.melia_type_id;
      this.sectionData.isMeliaProduct = response.is_melia;
      this.sectionData.ostMeliaId = response.ost_melia_study_id;
      this.sectionData.ostSubmitted = response.melia_previous_submitted;
    });
    this.api.resultsSE.GET_allClarisaMeliaStudyTypes().subscribe(({ response }) => {
      this.meliaTypes = response;
    });
    this.api.resultsSE.GET_ostMeliaStudiesByResultId().subscribe(({ response }) => {
      this.ostMeliaStudies = response;
    });
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  private _mapFields(response: KnowledgeProductBody): KnowledgeProductBodyMapped {
    const mapped = new KnowledgeProductBodyMapped();
    mapped.warnings = response.warnings;

    mapped.handle = `https://cgspace.cgiar.org/handle/${response.handle}`;
    mapped.authors = response.authors?.map(m => m.name);
    mapped.type = response.type;
    mapped.doi = response.metadataCG?.doi;
    mapped.licence = response.licence;
    mapped.keywords = (response.keywords ?? []).join('; ');
    mapped.agrovoc_keywords = (response.agrovoc_keywords ?? []).join('; ');
    mapped.commodity = response.commodity;
    mapped.investors = response.sponsor;
    mapped.altmetric_details_url = response.altmetric_detail_url;
    mapped.altmetric_img_url = response.altmetric_image_url;
    mapped.references = response.references_other_knowledge_products;
    mapped.onlineYearCG = response.metadataCG?.online_year;

    this.fair_data = this.filterOutObject(response.fair_data);

    const journalArticle: boolean = (response.type ?? '').toLocaleLowerCase().includes('journal article');
    mapped.isJournalArticle = journalArticle;
    if (journalArticle) {
      if (response.metadataCG?.doi) {
        if (response.metadataWOS) {
          this.getMetadataFromWoS(mapped, response);
          this.getMetadataFromCGSpace(mapped, response, journalArticle);
        } else {
          this.getMetadataFromCGSpace(mapped, response, journalArticle);
        }
      } else {
        this.getMetadataFromCGSpace(mapped, response, journalArticle);
      }
    } else if (response.metadataCG?.issue_year == response.cgspace_phase_year) {
      this.getMetadataFromCGSpace(mapped, response, journalArticle);
    }

    return mapped;
  }

  public calculateInnerColor(value: number) {
    return this.kpGradientScale(value).brighten().hex();
  }

  public calculateBorderColor(value: number) {
    return this.kpGradientScale(value).hex();
  }

  private getMetadataFromCGSpace(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody, isJA: boolean) {
    mapped.is_peer_reviewed_CG = this.transformBoolean(response.metadataCG?.is_peer_reviewed);
    mapped.is_isi_CG = this.transformBoolean(response.metadataCG?.is_isi, isJA);
    let accessibilityCG: string;
    if (response.metadataCG?.accessibility == null) {
      accessibilityCG = !isJA ? 'Not available' : 'Not provided';
    } else {
      accessibilityCG = response.metadataCG.accessibility ? 'Open Access' : 'Limited Access';
    }
    mapped.accessibility_CG = accessibilityCG;
    mapped.yearCG = response.metadataCG?.issue_year;
  }

  private getMetadataFromWoS(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody) {
    mapped.is_peer_reviewed_WOS = this.transformBoolean(response.metadataWOS?.is_peer_reviewed);
    mapped.is_isi_WOS = this.transformBoolean(response.metadataWOS?.is_isi);
    mapped.accessibility_WOS = response.metadataWOS?.accessibility == true ? 'Open Access' : 'Limited Access';
    mapped.year_WOS = response.metadataWOS?.issue_year;
  }

  private transformBoolean(value: boolean, isJA?: boolean): string {
    if (value == null) {
      return !isJA ? 'Not available' : 'Not provided';
    }

    return value ? 'Yes' : 'No';
  }

  filterOutObject(fairObject: FullFairData): Array<{ key: string; value: FairSpecificData }> {
    return Object.keys(fairObject)
      .filter(key => key != 'total_score')
      .map(key => ({ key, value: fairObject[key] }));
  }

  onSaveSection() {
    this.api.resultsSE.PATCH_knowledgeProductSection(this.sectionData).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }
}
