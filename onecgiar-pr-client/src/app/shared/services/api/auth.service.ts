import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { LocalStorageUser, UserAuth } from '../../interfaces/user';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  inLogin = false;
  apiBaseUrl = environment.apiBaseUrl + 'auth/';
  constructor(public http: HttpClient, private router: Router) {}

  set localStorageToken(token: string) {
    localStorage.setItem('token', token);
  }

  get localStorageToken() {
    return localStorage.getItem('token');
  }

  set localStorageUser(user: {}) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  get localStorageUser(): LocalStorageUser {
    // console.log('localStorageUser');
    return JSON.parse(localStorage.getItem('user'));
  }

  logout() {
    this.router.navigate(['/login']);
    localStorage.clear();
  }

  userAuth(body: UserAuth) {
    return this.http.post<any>(`${this.apiBaseUrl}singin`, body);
  }

  GET_allRolesByUser() {
    return this.http.get<any>(`${this.apiBaseUrl}role-by-user/get/user/${this.localStorageUser?.id}`);
  }

  GET_initiativesByUser() {
    return this.http.get<any>(`${this.apiBaseUrl}user/get/initiative/${this.localStorageUser?.id}`);
  }
}
