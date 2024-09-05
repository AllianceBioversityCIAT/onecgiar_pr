import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services/api/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pdf-reports',
  templateUrl: './pdf-reports.component.html',
  styleUrls: ['./pdf-reports.component.scss']
})
export class PdfReportsComponent implements OnInit, OnDestroy {
  iframeLoaded = null;
  error = null;
  pdfUrl = null;
  report = new Report(this.activatedRoute, this.sanitizer);

  constructor(private authService: AuthService, private activatedRoute: ActivatedRoute, public sanitizer: DomSanitizer, public http: HttpClient) {}

  ngOnInit(): void {
    this.authService.inLogin = true;
    document.body.style.overflow = 'hidden';
    this.getPdfData();
  }

  getPdfData() {
    if (!this.activatedRoute.snapshot.paramMap.get('id')) {
      this.error = 'warning';
      return;
    }

    this.iframeLoaded = true;

    this.http.get<any>(this.report.iframeRoute).subscribe({
      next: resp => {
        if (!resp) {
          this.error = 'error';
          return;
        }

        if (resp?.response?.error) {
          this.error = 'warning';
          return;
        }

        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(resp.pdf);
        this.iframeLoaded = false;
      },
      error: err => {
        console.error(err);
        this.error = 'warning';
        this.iframeLoaded = false;
      }
    });
    return null;
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
    document.body.style.overflow = 'auto';
  }
}

class Report {
  id = null;
  sanitizedUrl = null;
  constructor(public activatedRoute, public sanitizer) {
    this.sanitizer = sanitizer;
    this.sanitizeUrl();
  }

  sanitizeUrl() {
    this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeRoute);
  }

  get iframeRoute() {
    const { id: resultId } = this.activatedRoute.snapshot.paramMap.params || {};

    const module = this.activatedRoute.snapshot._routerState?.url.includes('ipsr') ? 'ipsr' : 'result';

    return `${environment.apiBaseUrl}api/platform-report/${module}/${resultId}${this.qParamsObjectToqueryParams()}`;
  }

  qParamsObjectToqueryParams() {
    const objectKeys = Object.keys(this.activatedRoute.snapshot.queryParamMap?.params || {});
    if (!objectKeys.length) return '';
    let queryParamsText = '';
    const params = this.activatedRoute.snapshot.queryParamMap.params;
    objectKeys.forEach((key, i) => (queryParamsText += (i > 0 && params[key] ? '&' : '') + (params[key] ? `${key}=${params[key]}` : '')));

    return queryParamsText ? '?' + queryParamsText : '';
  }
}
