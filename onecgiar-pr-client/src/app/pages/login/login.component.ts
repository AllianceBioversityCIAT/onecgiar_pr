import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user.interface';
import { Router } from '@angular/router';
import { internationalizationData } from '../../shared/data/internationalizationData';
import { AuthService } from '../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { FooterService } from '../../shared/components/footer/footer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { PrInputComponent } from '../../custom-fields/pr-input/pr-input.component';
import { UnderConstructionPointComponent } from '../../custom-fields/under-construction-point/under-construction-point.component';
import { PrFieldHeaderComponent } from '../../custom-fields/pr-field-header/pr-field-header.component';
import { PrButtonComponent } from '../../custom-fields/pr-button/pr-button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    AutoCompleteModule,
    PrInputComponent,
    UnderConstructionPointComponent,
    PrFieldHeaderComponent,
    PrButtonComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
    public footerSE: FooterService
  ) {
    this.authService.inLogin = true;
    if (!!this.authService.localStorageUser) this.router.navigate(['/']);
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    document
      .getElementById('password')
      .addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
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
          this.rolesSE.validateReadOnly();
        }, 1500);
      },
      err => {
        const statusCode = err?.error?.statusCode;
        if (statusCode == 404)
          return this.customAlertService.show(
            {
              id: 'loginAlert',
              title: 'Oops!',
              description:
                this.internationalizationData.login.alerts[statusCode],
              status: 'warning',
              confirmText: 'Contact us'
            },
            () => {
              document.getElementById('question').click();
              this.customAlertService.closeAction('loginAlert');
            }
          );
        console.log(err);
        this.customAlertService.show({
          id: 'loginAlert',
          title: 'Oops!',
          description: err?.error?.message,
          status: 'warning'
        });
      }
    );
  }

  ngOnDestroy(): void {
    this.authService.inLogin = false;
  }
}
