import { Component, OnDestroy, OnInit } from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user.interface';
import { Router } from '@angular/router';
import { internationalizationData } from '../../shared/data/internationalization-data';
import { AuthService } from '../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { FooterService } from '../../shared/components/footer/footer.service';
import { WebsocketService } from '../../sockets/websocket.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy, OnInit {
  internationalizationData = internationalizationData;
  userLoginData = new UserAuth();
  successLogin = false;

  constructor(
    private authService: AuthService,
    private customAlertService: CustomizedAlertsFeService,
    private router: Router,
    private rolesSE: RolesService,
    public footerSE: FooterService,
    public webSocket: WebsocketService
  ) {
    this.authService.inLogin = true;
    if (this.authService.localStorageUser) this.router.navigate(['/']);
  }

  ngOnInit(): void {
    document.getElementById('password').addEventListener('keyup', function (event) {
      if (event.key === 'Enter') {
        document.getElementById('login').click();
        document.getElementById('password').blur();
        document.getElementById('fake').focus();
      }
    });
  }

  onLogin() {
    this.authService.userAuth(this.userLoginData).subscribe({
      next: resp => {
        this.authService.localStorageToken = resp?.response?.token;
        this.authService.localStorageUser = resp?.response?.user;
        this.successLogin = true;
        this.webSocket.configUser(this.authService.localStorageUser?.user_name, this.authService.localStorageUser?.id);

        setTimeout(() => {
          this.router.navigate(['/']);
          this.rolesSE.validateReadOnly();
        }, 1500);
      },
      error: err => {
        const statusCode = err?.error?.statusCode;
        if (statusCode == 404)
          return this.customAlertService.show(
            {
              id: 'loginAlert',
              title: 'Oops!',
              description: this.internationalizationData.login.alerts[statusCode],
              status: 'warning',
              confirmText: 'Contact us'
            },
            () => {
              document.getElementById('question').click();
              this.customAlertService.closeAction('loginAlert');
            }
          );
        console.error(err);
        this.customAlertService.show({ id: 'loginAlert', title: 'Oops!', description: err?.error?.message, status: 'warning' });
      }
    });
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
  }
}
