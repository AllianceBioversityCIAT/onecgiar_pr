import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, finalize, Observable, tap, throwError } from 'rxjs';
import { AuthService } from '../services/api/auth.service';
import { ApiService } from '../services/api/api.service';
import { GreenChecksService } from '../services/global/green-checks.service';
import { environment } from '../../../environments/environment';
import { IpsrCompletenessStatusService } from '../../pages/ipsr/services/ipsr-completeness-status.service';
import { Router } from '@angular/router';
import { ViewRefreshService } from '../services/view-refresh.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  router = inject(Router);
  private readonly viewRefreshSE = inject(ViewRefreshService);

  /**
   * The app is zoneless since the Angular 21 upgrade, so an HTTP response does not schedule change
   * detection by itself and components that assign their payload to plain fields keep rendering the
   * empty view they were created with. Refreshing once every request settles restores the
   * pre-upgrade behaviour for every screen at once. See ViewRefreshService for the full rationale.
   */
  private refreshViewWhenSettled<T>(source: Observable<T>): Observable<T> {
    return defer(() =>
      source.pipe(
        finalize(() => {
          // Scoped to Result Detail on purpose. A full pass is verified safe on every section of
          // every result type there, whereas IPSR › Contributors loops forever inside a single
          // detectChanges on this branch (see the QA report) — refreshing it would turn a section
          // that merely renders empty into a frozen tab.
          if (this.router.url.includes('/result/result-detail/')) this.viewRefreshSE.schedule();
        })
      )
    );
  }
  constructor(
    private readonly authService: AuthService,
    private readonly greenChecksSE: GreenChecksService,
    private apiService: ApiService,
    private readonly ipsrCompletenessStatusSE: IpsrCompletenessStatusService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService?.localStorageToken && !req.url.indexOf(environment.apiBaseUrl)) return this.refreshViewWhenSettled(next.handle(req.clone()));

    if (req.url.includes(environment.elastic.baseUrl)) {
      return this.refreshViewWhenSettled(next.handle(req.clone()));
    }

    // Static assets (e.g. the public QA status board JSON) are same-origin and need no auth header.
    // Without this, a token-less request would set `auth: null` and break public pages. (P2-2967)
    if (req.url.includes('assets/')) {
      return this.refreshViewWhenSettled(next.handle(req.clone()));
    }

    const reqClone = req.clone({
      setHeaders: {
        auth: this.authService?.localStorageToken
      }
    });

    if (reqClone.method === 'PATCH' || reqClone.method === 'POST') {
      return this.refreshViewWhenSettled(next.handle(reqClone)).pipe(
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

    return this.refreshViewWhenSettled(next.handle(reqClone)).pipe(
      catchError((error: any) => {
        return this.manageError(error);
      })
    );
  }

  manageError(error: HttpErrorResponse) {
    return throwError(error);
  }
}
