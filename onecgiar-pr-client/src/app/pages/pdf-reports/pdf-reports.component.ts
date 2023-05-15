import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/shared/services/api/auth.service';

@Component({
  selector: 'app-pdf-reports',
  templateUrl: './pdf-reports.component.html',
  styleUrls: ['./pdf-reports.component.scss']
})
export class PdfReportsComponent implements OnInit {
  iframeLoaded = null;
  report = new Report(this.activatedRoute, this.sanitizer);
  constructor(private authService: AuthService, private activatedRoute: ActivatedRoute, public sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.authService.inLogin = true;
    document.body.style.overflow = 'hidden';
  }

  getRouteData() {}

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
    // console.log(this.activatedRoute.snapshot.queryParamMap);
  }

  get iframeRoute() {
    return `https://prtest-back.ciat.cgiar.org/api/platform-report/result/${this.activatedRoute.snapshot.paramMap.get('id')}`;
  }
}
