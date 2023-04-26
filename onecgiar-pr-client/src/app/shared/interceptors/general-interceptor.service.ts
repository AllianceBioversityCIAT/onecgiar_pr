import { HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/api/auth.service';
import { ApiService } from '../services/api/api.service';
import { GreenChecksService } from '../services/global/green-checks.service';
import { IpsrCompletenessStatusService } from '../../pages/ipsr/services/ipsr-completeness-status.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService, private greenChecksSE: GreenChecksService, private ipsrCompletenessStatusSE: IpsrCompletenessStatusService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService?.localStorageToken && !req.url.indexOf(environment.apiBaseUrl)) return next.handle(req.clone());

    if (req.url.includes(environment.elastic.baseUrl)) {
      return next.handle(req.clone());
    }

    const headers = new HttpHeaders({
      auth: this.authService?.localStorageToken
    });

    const reqClone = req.clone({
      headers
    });

    // Se guarda la respuesta en una variable antes de ejecutar el método `handle()` del `next`
    const observable = next.handle(reqClone);

    return observable.pipe(
      tap((resp: any) => {
        if (req.method == 'PATCH' || req.method == 'POST') {
          const validateGreenCheckRoute = req.url.indexOf('green-checks') > 0;
          // const validateGreenCheckIPSRRoute = req.url.includes('green-checks') > 0;
          const inResultsModule = req.url.includes('/api/results/');
          const inIPSRModule = req.url.includes('/api/ipsr/');
          if (!validateGreenCheckRoute && inResultsModule) {
            observable.subscribe(() => {
              console.log(req.url);
              this.greenChecksSE.updateGreenChecks();
            });
          } else if (inIPSRModule) {
            console.log(req.url);

            observable.subscribe(() => {
              console.log(req.url);
              this.ipsrCompletenessStatusSE.updateGreenChecks();
            });
          }
        }
      })
    );
    // .pipe(catchError(this.manageError))
  }

  manageError(error: HttpErrorResponse) {
    console.log(error);
    console.log(error?.error?.message);
    return throwError('Error intercepted');
  }
}
