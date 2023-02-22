import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TypeOneReportService {
  showTorIframe = true;
  initiativeSelected = null;
  sanitizedUrl: any = null;
  allInitiatives = [];
  t1rBiUrl = environment.t1rBiUrl;
  constructor(public sanitizer: DomSanitizer, private api: ApiService) {}
  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.t1rBiUrl}/bi?official_code=${this.initiativeSelected}&reportName=type-1-report-dashboard`);
  }

  getInitiativeID(official_code) {
    console.log(official_code);
    if (!this.api.rolesSE.isAdmin) return this.api.dataControlSE.myInitiativesList.find(init => init.official_code == official_code);
    return this.allInitiatives.find(init => init.official_code == official_code);
  }
}
