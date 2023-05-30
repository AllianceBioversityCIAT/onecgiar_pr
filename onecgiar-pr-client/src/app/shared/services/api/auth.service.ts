import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { LocalStorageUser, UserAuth } from '../../interfaces/user.interface';
import { map } from 'rxjs';
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
    return JSON.parse(localStorage.getItem('user'));
  }

  logout() {
    this.logOutTawtkTo();
    this.router.navigate(['/login']);
    localStorage.clear();
  }

  private logOutTawtkTo() {
    //(window.hasOwnProperty('Tawk_API'))
    if (window.hasOwnProperty('Tawk_API')) {
      try {
        window['Tawk_API']?.endChat();
        window['Tawk_API'].visitor = {
          name: null,
          email: null
        };
        this.cleanTWKCookies();
      } catch (error) {
        console.log(error);
      }
      // if (window['Tawk_API'].isChatMaximized()) {
      // }
    }
  }

  cleanTWKCookies() {
    //('cleanTWKCookies');
    // window['Tawk_API'].endChat()

    var cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];

      if (cookie?.split('=')[0]?.includes('twk')) {
        const eqPos = cookie.indexOf('=');
        //(cookie + ' ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }

    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  userAuth(body: UserAuth) {
    return this.http.post<any>(`${this.apiBaseUrl}singin`, body);
  }

  GET_allRolesByUser() {
    return this.http.get<any>(`${this.apiBaseUrl}role-by-user/get/user/${this.localStorageUser?.id}`);
  }

  GET_initiativesByUser() {
    return this.http.get<any>(`${this.apiBaseUrl}user/get/initiative/${this.localStorageUser?.id}`).pipe(
      map(resp => {
        //(resp.response);
        resp.response.map(init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`));
        return resp;
      })
    );
  }
}
