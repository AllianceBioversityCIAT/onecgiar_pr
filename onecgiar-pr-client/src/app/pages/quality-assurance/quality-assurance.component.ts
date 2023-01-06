import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss']
})
export class QualityAssuranceComponent implements OnInit {
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, private sanitizer: DomSanitizer) {}
  allInitiatives = [];
  clarisaQaToken = null;
  official_code = null;
  showIframe = false;
  ngOnInit(): void {
    this.GET_AllInitiatives();
  }

  sanitizeUrl() {
    // console.log(url); 'https://qatest.ciat.cgiar.org/crp?crp_id=INIT-15&token='+this.clarisaQaToken
    console.log(`https://qatest.ciat.cgiar.org/crp?crp_id=${this.official_code}&token=${this.clarisaQaToken}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://qatest.ciat.cgiar.org/crp?crp_id=${this.official_code}&token=${this.clarisaQaToken}`);
  }

  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      console.log(response);
      this.allInitiatives = response;
    });
  }

  GET_ClarisaQaToken() {
    this.api.resultsSE.GET_ClarisaQaToken(this.official_code).subscribe(resp => {
      console.log(resp);
      this.clarisaQaToken = resp?.response?.token;
    });
  }

  selectOptionEvent(option) {
    console.log(option);
    this.official_code = option?.official_code;
    this.GET_ClarisaQaToken();
    this.showIframe = false;
    setTimeout(() => {
      this.showIframe = true;
    }, 100);
  }
}
