import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../services/api/auth.service';
import { ApiService } from '../services/api/api.service';
import { GreenChecksService } from '../services/global/green-checks.service';
import { environment } from '../../../environments/environment';
import { IpsrCompletenessStatusService } from '../../pages/ipsr/services/ipsr-completeness-status.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService, private greenChecksSE: GreenChecksService, private apiService: ApiService, private ipsrCompletenessStatusSE: IpsrCompletenessStatusService) {}

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
            const validateGreenCheckRoute = req.url.indexOf('green-checks') > 0;
            const inResultsModule = req.url.includes('/api/results/');
            const inIPSRModule = req.url.includes('/api/ipsr/');
            const notValidateList = ['/api/ipsr/all-innovations'];
            // if the req.url has some text from the blackList, then don't update the green checks
            if (!notValidateList.some(url => req.url.includes(url))) {
              if (!validateGreenCheckRoute && inResultsModule) {
                this.greenChecksSE.updateGreenChecks();
                this.greenChecksSE.getGreenChecks();
              }
              if (inIPSRModule) {
                this.ipsrCompletenessStatusSE.updateGreenChecks();
              }
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
    //(error);
    //(error?.error?.message);
    // return throwError('Error intercepted');
    return throwError(error);
  }
}
