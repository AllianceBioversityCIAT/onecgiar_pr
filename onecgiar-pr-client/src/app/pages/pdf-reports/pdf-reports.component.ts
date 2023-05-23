import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/shared/services/api/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-pdf-reports',
  templateUrl: './pdf-reports.component.html',
  styleUrls: ['./pdf-reports.component.scss']
})
export class PdfReportsComponent implements OnInit {
  iframeLoaded = null;
  error = {
    type: null,
    message: null
  };
  report = new Report(this.activatedRoute, this.sanitizer);
  constructor(private authService: AuthService, private activatedRoute: ActivatedRoute, public sanitizer: DomSanitizer, public http: HttpClient) {}

  ngOnInit(): void {
    this.authService.inLogin = true;
    document.body.style.overflow = 'hidden';
    this.getPdfData();

    // this.validateErrors({ message: 'hi', status: '404' });
  }

  getPdfData() {
    if (!this.activatedRoute.snapshot.paramMap.get('id')) return (this.error.type = 'warning');
    console.log(this.report.iframeRoute);
    this.http.get<any>(this.report.iframeRoute).subscribe(
      resp => {
        console.log(resp);
        this.validateErrors(resp);
      },
      err => {
        console.log(err);
        this.validateErrors(err);
      }
    );
    return null;
  }

  validateErrors({ message, status }) {
    const statusText = String(status);
    this.error.type = statusText[0] == '5' ? 'error' : statusText[0] == '4' ? 'warning' : null;
    // switch (status) {
    //   case '404':
    //     return '';

    //   default:
    //     return '';
    // }
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
    return `${environment.apiBaseUrl}api/platform-report/result/${this.activatedRoute.snapshot.paramMap.get('id')}${this.qParamsObjectToqueryParams()}`;
  }

  qParamsObjectToqueryParams() {
    const objectKeys = Object.keys(this.activatedRoute.snapshot.queryParamMap.params);
    if (!objectKeys.length) return '';
    let queryParamsText = '';
    const params = this.activatedRoute.snapshot.queryParamMap.params;
    objectKeys.forEach((key, i) => (queryParamsText += (i > 0 && params[key] ? '&' : '') + (params[key] ? `${key}=${params[key]}` : '')));

    return queryParamsText ? '?' + queryParamsText : '';
  }
}
