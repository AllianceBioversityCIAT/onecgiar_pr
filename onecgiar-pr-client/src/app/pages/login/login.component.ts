import { Component, OnDestroy } from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user';
import { Router } from '@angular/router';
import { internationalizationData } from '../../shared/data/internationalizationData';
import { AuthService } from '../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  internationalizationData = internationalizationData;
  userLoginData = new UserAuth();
  successLogin = false;
  constructor(private authService: AuthService, private customAlertService: CustomizedAlertsFeService, private router: Router) {
    this.authService.inLogin = true;
    if (!!this.authService.localStorageUser) this.router.navigate(['/']);
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    document.getElementById('password').addEventListener('keyup', function (event) {
      if (event.key === 'Enter') {
        console.log('hol');
        document.getElementById('login').click();
        document.getElementById('password').blur();
        document.getElementById('fake').focus();
      }
    });
  }

  onLogin() {
    this.authService.userAuth(this.userLoginData).subscribe(
      resp => {
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
  display: boolean = false;
}
