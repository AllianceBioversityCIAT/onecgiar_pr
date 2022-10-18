import { HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralInterceptorService implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService?.localStorageToken && !req.url.indexOf(environment.apiBaseUrl)) return next.handle(req.clone());
    const headers = new HttpHeaders({
      auth: this.authService?.localStorageToken
    });

    const reqClone = req.clone({
      headers
    });

    return next.handle(reqClone);
    // .pipe(catchError(this.manageError))
  }

  manageError(error: HttpErrorResponse) {
    console.log(error);
    console.log(error?.error?.message);
    return throwError('Error intercepted');
  }
}
