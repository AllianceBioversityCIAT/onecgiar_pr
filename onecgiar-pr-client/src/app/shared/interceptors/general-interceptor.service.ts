import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../services/api/auth.service';
import { ApiService } from '../services/api/api.service';
import { GreenChecksService } from '../services/global/green-checks.service';
import { environment } from '../../../environments/environment';
import { IpsrCompletenessStatusService } from '../../pages/ipsr/services/ipsr-completeness-status.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  router = inject(Router);
  constructor(
    private readonly authService: AuthService,
    private readonly greenChecksSE: GreenChecksService,
    private apiService: ApiService,
    private readonly ipsrCompletenessStatusSE: IpsrCompletenessStatusService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService?.localStorageToken && !req.url.indexOf(environment.apiBaseUrl)) return next.handle(req.clone());

    if (req.url.includes(environment.elastic.baseUrl)) {
      return next.handle(req.clone());
    }

    const reqClone = req.clone({
      setHeaders: {
        auth: this.authService?.localStorageToken
      }
    });

    if (reqClone.method === 'PATCH' || reqClone.method === 'POST') {
      return next.handle(reqClone).pipe(
        tap((event: any) => {
          if (event && event.status >= 200 && event.status < 300) {
            const inResultsModule = this.router.url.includes('/result/result-detail/');
            const inIPSRModule = req.url.includes('/api/ipsr/');
            const notValidateList = ['/api/ipsr/all-innovations'];
            if (!notValidateList.some(url => req.url.includes(url))) {
              if (inResultsModule) this.greenChecksSE.getGreenChecks();

              if (inIPSRModule) this.ipsrCompletenessStatusSE.updateGreenChecks();
            }
          }
        }),
        catchError((error: any) => {
          return this.manageError(error);
        })
      );
    }

    return next.handle(reqClone).pipe(
      catchError((error: any) => {
        return this.manageError(error);
      })
    );
  }

  manageError(error: HttpErrorResponse) {
    return throwError(error);
  }
}
