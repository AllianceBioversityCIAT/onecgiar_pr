import chroma from 'chroma-js';

import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { KnowledgeProductBody } from './model/knowledgeProductBody';
import { KnowledgeProductBodyMapped } from './model/KnowledgeProductBodyMapped';
import { KnowledgeProductSaveDto } from './model/knowledge-product-save.dto';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss']
})
export class KnowledgeProductInfoComponent implements OnInit {
  knowledgeProductBody = new KnowledgeProductBodyMapped();
  sectionData: KnowledgeProductSaveDto = new KnowledgeProductSaveDto();
  meliaTypes = [];
  ostMeliaStudies = [];
  private readonly kpGradientScale = chroma.scale(['#f44444', '#dcdf38', '#38df7b']).mode('hcl');
  constructor(public api: ApiService) {}

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
      //console.log(this.meliaTypes);
    });
    this.api.resultsSE.GET_ostMeliaStudiesByResultId().subscribe(({ response }) => {
      this.ostMeliaStudies = response;
      //console.log(this.meliaTypes);
    });
  }

  onSyncSection() {
    this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
      this.getSectionInformation();
    });
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
    mapped.findable = response.findable;
    mapped.accessible = response.accessible;
    mapped.interoperable = response.interoperable;
    mapped.reusable = response.reusable;

    const journalArticle: boolean = (response.type ?? '').toLocaleLowerCase().includes('journal article');
    if (journalArticle) {
      if (response.metadataCG?.doi) {
        if (response.metadataWOS) {
          this.getMetadataFromWoS(mapped, response);
          this.getMetadataFromCGSpace(mapped, response);
        } else {
          this.getMetadataFromCGSpace(mapped, response);
        }
      } else {
        this.getMetadataFromCGSpace(mapped, response);
      }
    } else {
      if (response.metadataCG?.issue_year == 2022) {
        this.getMetadataFromCGSpace(mapped, response);
      }
    }

    return mapped;
  }

  public calculateInnerColor(value: number) {
    return this.kpGradientScale(value).brighten().hex();
  }

  public calculateBorderColor(value: number) {
    return this.kpGradientScale(value).hex();
  }

  private getMetadataFromCGSpace(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody) {
    mapped.is_peer_reviewed_CG = response.metadataCG?.is_peer_reviewed;
    mapped.is_isi_CG = response.metadataCG?.is_isi;
    mapped.accessibility_CG = response.metadataCG?.accessibility;
    mapped.yearCG = response.metadataCG?.issue_year;
  }

  private getMetadataFromWoS(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody) {
    mapped.is_peer_reviewed_WOS = response.metadataWOS?.is_peer_reviewed;
    mapped.is_isi_WOS = response.metadataWOS?.is_isi;
    mapped.accessibility_WOS = response.metadataWOS?.accessibility;
    mapped.year_WOS = response.metadataWOS?.issue_year;
  }

  onSaveSection() {
    //console.log(this.sectionData);
    this.api.resultsSE.PATCH_knowledgeProductSection(this.sectionData).subscribe(({ response }) => {
      this.getSectionInformation();
    });
  }
}
