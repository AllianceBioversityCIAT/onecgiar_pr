import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss']
})
export class QualityAssuranceComponent implements OnInit {
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public sanitizer: DomSanitizer) {}
  allInitiatives = [];
  clarisaQaToken = null;
  official_code = null;
  showIframe = false;
  qaUrl = environment.qaUrl;
  sanitizedUrl: any = null;
  ngOnInit(): void {
    this.GET_AllInitiatives();
  }

  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.qaUrl}/crp?crp_id=${this.official_code}&token=${this.clarisaQaToken}`);
  }

  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
  GET_ClarisaQaToken(callback) {
    this.api.resultsSE.GET_ClarisaQaToken(this.official_code).subscribe(
      resp => {
        this.clarisaQaToken = resp?.response?.token;
        callback();
      },
      err => {
        callback();
      }
    );
  }

  selectOptionEvent(option) {
    this.official_code = option?.official_code;
    this.showIframe = false;
    this.GET_ClarisaQaToken(() => {
      this.sanitizeUrl();
      setTimeout(() => {
        this.showIframe = true;
      }, 100);
    });
  }
}
