import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { KnowledgeProductBody } from './model/knowledgeProductBody';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss']
})
export class KnowledgeProductInfoComponent implements OnInit {
  knowledgeProductBody = new KnowledgeProductBody();
  MELIAProduct = null;
  intheOST = null;
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe(({ response }) => {
      console.log(response);
      this.knowledgeProductBody = response;
    });
  }
  onSaveSection() {
    // this.api.resultsSE.GET_resultknowledgeProducts().subscribe(resp => {
    //   console.log(resp);
    // });
  }
}
