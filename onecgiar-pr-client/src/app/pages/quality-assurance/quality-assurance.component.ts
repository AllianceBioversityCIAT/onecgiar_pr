import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { QualityAssuranceService } from './quality-assurance.service';

@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss']
})
export class QualityAssuranceComponent implements OnInit {
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService, public sanitizer: DomSanitizer, private qaSE: QualityAssuranceService) {}
  allInitiatives = [];
  clarisaQaToken = null;
  official_code = null;
  showIframe = false;
  qaUrl = environment.qaUrl;
  sanitizedUrl: any = null;
  ngOnInit(): void {
    this.api.rolesSE.validateReadOnly();
    this.api.dataControlSE.detailSectionTitle('Quality Assurance');

    new Observable((observer: any) => {
      observer.next();
      this.qaSE.$qaFirstInitObserver = observer;
    }).subscribe(resp => {
      if (this.api.rolesSE.isAdmin) {
        this.GET_AllInitiatives();
      } else {
        this.official_code = this.api.dataControlSE.myInitiativesList[0]?.official_code;
        if (this.official_code) this.selectOptionEvent({ official_code: this.official_code });
      }
    });
  }

  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.qaUrl}/crp?crp_id=${this.official_code}&token=${this.clarisaQaToken}`);
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
      this.official_code = this.allInitiatives[0]?.official_code;
      if (this.official_code) this.selectOptionEvent({ official_code: this.official_code });
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
