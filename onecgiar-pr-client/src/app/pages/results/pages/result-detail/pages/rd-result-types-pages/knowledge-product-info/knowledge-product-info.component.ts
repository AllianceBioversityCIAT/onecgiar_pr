import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { KnowledgeProductBody } from './model/knowledgeProductBody';
import { KnowledgeProductBodyMapped } from './model/KnowledgeProductBodyMapped';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss']
})
export class KnowledgeProductInfoComponent implements OnInit {
  knowledgeProductBody = new KnowledgeProductBodyMapped();
  MELIAProduct = null;
  intheOST = null;
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe(({ response }) => {
      console.log(response);
      this.knowledgeProductBody = this._mapFields(response as KnowledgeProductBody);
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
    mapped.keywords = response.keywords;
    mapped.agrovoc_keywords = response.agrovoc_keywords;
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
      console.log('is journal');
      if (response.metadataCG?.doi) {
        console.log('has valid doi');
        if (response.metadataWOS) {
          console.log('has doi info');
          this.getMetadataFromWoS(mapped, response);
          this.getMetadataFromCGSpace(mapped, response);
        } else {
          console.log('has no doi info');
          this.getMetadataFromCGSpace(mapped, response);
        }
      } else {
        console.log('has not valid doi');
        this.getMetadataFromCGSpace(mapped, response);
      }
    } else {
      console.log('is not journal');
      if (response.metadataCG?.issue_year == 2022) {
        console.log('is 2022 other kp');
        this.getMetadataFromCGSpace(mapped, response);
      }
    }

    return mapped;
  }

  private getMetadataFromCGSpace(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody) {
    mapped.is_peer_reviewed_CG = response.metadataCG?.is_peer_reviewed;
    mapped.is_isi_CG = response.metadataCG?.is_isi;
    mapped.accessibility_CG = response.metadataCG?.accessibility;
    mapped.yearCG = response.metadataCG?.issue_year;
    console.log(mapped.is_peer_reviewed_CG, mapped.is_isi_CG, mapped.accessibility_CG, mapped.yearCG);
  }

  private getMetadataFromWoS(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody) {
    mapped.is_peer_reviewed_WOS = response.metadataWOS?.is_peer_reviewed;
    mapped.is_isi_WOS = response.metadataWOS?.is_isi;
    mapped.accessibility_WOS = response.metadataWOS?.accessibility;
    mapped.year_WOS = response.metadataWOS?.issue_year;
    console.log(mapped.is_peer_reviewed_WOS, mapped.is_isi_WOS, mapped.accessibility_WOS, mapped.year_WOS);
  }

  onSaveSection() {
    // this.api.resultsSE.GET_resultknowledgeProducts().subscribe(resp => {
    //   console.log(resp);
    // });
  }
}
