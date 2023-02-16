import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class TypeOneReportService {
  showTorIframe = true;
  initiativeSelected = null;
  sanitizedUrl: any = null;
  constructor(public sanitizer: DomSanitizer) {}
  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`http://prmsbitest.s3-website-us-east-1.amazonaws.com/bi/4/${this.initiativeSelected}`);
  }
}
