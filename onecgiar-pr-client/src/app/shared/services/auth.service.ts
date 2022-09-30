import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { LocalStorageUser, UserAuth } from '../interfaces/user';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  inLogin = false;
  constructor(public http: HttpClient, private router: Router) {}

  userAuth(body: UserAuth) {
    return this.http.post<any>(`${environment.apiBaseUrl}auth/singin`, body);
  }

  getAllUsers() {
    return this.http.get<any>(`${environment.apiBaseUrl}auth/user/all`);
  }

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
}
