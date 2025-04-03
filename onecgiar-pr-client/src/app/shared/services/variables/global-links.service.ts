import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalLinksService {
  links: Links = {};

  constructor(private api: ApiService) {
    this.getInfo();
  }

  getInfo() {
    this.api.resultsSE.GET_platformGlobalVariablesByCategoryId(3).subscribe(({ response }) => {
      this.links = response?.reduce((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {});
    });
  }
}

interface Links {
  url_terms_and_conditions?: string;
  url_platform_information?: string;
  url_t1r_bi_report?: string;
  url_prms_tickets_dashboards?: string;
}
