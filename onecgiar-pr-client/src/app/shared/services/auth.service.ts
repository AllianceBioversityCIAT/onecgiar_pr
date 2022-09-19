import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UserAuth } from '../interfaces/user';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  inLogin = false;
  constructor(public http: HttpClient) {}

  userAuth(body: UserAuth) {
    return this.http.post<any>(`${environment.apiBaseUrl}auth/singin`, body);
  }
}
