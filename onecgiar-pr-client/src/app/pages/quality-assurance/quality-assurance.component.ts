import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { QualityAssuranceService } from './quality-assurance.service';

@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default
})
export class QualityAssuranceComponent implements OnInit {
  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public sanitizer: DomSanitizer,
    private qaSE: QualityAssuranceService
  ) {}
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
    }).subscribe(() => {
      this.api.dataControlSE.getCurrentPhases().subscribe(() => {
        this.GET_AllInitiatives();
      });
    });
  }

  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.qaUrl}/crp?crp_id=${this.official_code}&token=${this.clarisaQaToken}`);
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) {
      this.official_code = this.api.dataControlSE.myInitiativesListReportingByPortfolio[0]?.official_code;
      if (this.official_code) this.selectOptionEvent(this.official_code);
      return;
    }

    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe(({ response }) => {
      this.allInitiatives = response;
      this.official_code = this.allInitiatives[0]?.official_code;
      if (this.official_code) this.selectOptionEvent(this.official_code);
    });
  }

  GET_ClarisaQaToken(callback) {
    this.api.resultsSE.GET_ClarisaQaToken(this.official_code).subscribe({
      next: ({ response }) => {
        this.clarisaQaToken = response?.token;
        callback();
      },
      error: err => {
        console.error(err);
        callback();
      }
    });
  }

  selectOptionEvent(option) {
    this.official_code = option;
    this.showIframe = false;
    this.GET_ClarisaQaToken(() => {
      this.sanitizeUrl();
      setTimeout(() => {
        this.showIframe = true;
      }, 100);
    });
  }
}
