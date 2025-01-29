import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';
import { GlobalLinksService } from '../../shared/services/variables/global-links.service';

@Injectable({
  providedIn: 'root'
})
export class TypeOneReportService {
  keyResultStoryData = [];
  showTorIframe = true;
  initiativeSelected = null;
  sanitizedUrl: any = null;
  allInitiatives = [];
  reportingPhases: any[] = [];
  phaseSelected = null;
  phaseDefaultId = null;
  currentInitiativeShortName = null;
  currentBiPage = null;

  constructor(
    public sanitizer: DomSanitizer,
    private readonly api: ApiService,
    private readonly globalLinksSE: GlobalLinksService
  ) {}

  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `${this.globalLinksSE?.links?.url_t1r_bi_report}?official_code=${this.initiativeSelected}&sectionNumber=${this.currentBiPage}`
    );
  }

  getInitiativeID(official_code) {
    if (!this.api.rolesSE.isAdmin) return this.api.dataControlSE.myInitiativesList.find(init => init.official_code == official_code);
    return this.allInitiatives.find(init => init.official_code == official_code);
  }
}
