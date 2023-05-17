import { HttpClient } from '@angular/common/http';
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
  }

  validateErrors({ message, status }) {
    const statusText = String(status);
    this.error.type = statusText[0] == '5' ? 'error' : statusText[0] == '4' ? 'warning' : null;
    console.log(this.error.type);
    switch (status) {
      case '404':
        return '';

      default:
        return '';
    }
  }

  // handleError(error: Event) {
  //   // Imprimir el error en la consola
  //   console.log('Se produjo un error al cargar el iframe:', error);

  //   // Otra lógica adicional si se requiere
  //   // ...
  // }

  loaded() {
    console.log('loaded');
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
