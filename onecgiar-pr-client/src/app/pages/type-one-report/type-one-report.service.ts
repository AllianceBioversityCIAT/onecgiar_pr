import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class TypeOneReportService {
  showTorIframe = true;
  initiativeSelected = null;
  sanitizedUrl: any = null;
  allInitiatives = [];
  constructor(public sanitizer: DomSanitizer, private api: ApiService) {}
  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`http://prmsbitest.s3-website-us-east-1.amazonaws.com/bi/4/${this.initiativeSelected}`);
  }

  getInitiativeID(official_code) {
    console.log(official_code);
    if (!this.api.rolesSE.isAdmin) return this.api.dataControlSE.myInitiativesList.find(init => init.official_code == official_code);
    return this.allInitiatives.find(init => init.official_code == official_code);
  }
}
