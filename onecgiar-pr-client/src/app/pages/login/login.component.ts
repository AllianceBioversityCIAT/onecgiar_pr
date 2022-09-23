import { Component, OnDestroy } from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user';
import { AuthService } from '../../shared/services/auth.service';
import { CustomAlertService } from '../../shared/services/custom-alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  userLoginData = new UserAuth();
  successLogin = false;
  constructor(private authService: AuthService, private customAlertService: CustomAlertService, private router: Router) {
    this.authService.inLogin = true;
  }

  onLogin() {
    this.authService.userAuth(this.userLoginData).subscribe(
      resp => {
        console.log(resp.response.token);
        console.log(resp.response.user);
        const { token, user } = resp?.response;
        this.authService.localStorageToken = token;
        this.authService.localStorageUser = user;
        this.successLogin = true;
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      },
      err => {
        this.customAlertService.show({ id: 'loginAlert', title: 'Ups!', description: err.error.message, status: 'error' });
        console.log(err.error.message);
      }
    );
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
  }
}
