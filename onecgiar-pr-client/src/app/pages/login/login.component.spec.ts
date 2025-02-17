import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrInputComponent } from '../../custom-fields/pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../custom-fields/pr-field-validations/pr-field-validations.component';
import { PrButtonComponent } from '../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../shared/services/api/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { MessageService } from 'primeng/api';

jest.useFakeTimers();

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockRouter: any;
  let mockRolesService: any;
  let mockCustomizedAlertsFeService: any;
  const mockuserAuthResponse = {
    token: 'token',
    user: 'user'
  }

  beforeEach(async () => {
    mockAuthService = {
      inLogin: false,
      localStorageUser: 'admin',
      userAuth: () => of({ response: mockuserAuthResponse }),
      GET_allRolesByUser: () => of({ response: [] }),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    mockRolesService = {
      validateReadOnly: jest.fn()
    }

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      }),
      closeAction: jest.fn(),
    }

    await TestBed.configureTestingModule({
      declarations: [
        LoginComponent,
        PrInputComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
        PrButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        TooltipModule
      ],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        },
        {
          provide: Router,
          useValue: mockRouter
        },
        {
          provide: RolesService,
          useValue: mockRolesService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        },
        MessageService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should set up the keyup event listener', () => {
      const spyClick = jest.spyOn(document.getElementById('login'), 'click');
      const spyBlur = jest.spyOn(document.getElementById('password'), 'blur');
      const spyFocus = jest.spyOn(document.getElementById('fake'), 'focus');
      const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter' });

      component.ngOnInit();

      document.getElementById('password').dispatchEvent(keyupEvent);

      expect(spyClick).toHaveBeenCalled();
      expect(spyBlur).toHaveBeenCalled();
      expect(spyFocus).toHaveBeenCalled();
    });
  });

  describe('onLogin', () => {
    it('should navigate on successful login', () => {
      const spy = jest.spyOn(mockAuthService, 'userAuth');
      const spyRouter = jest.spyOn(mockRouter, 'navigate');
      const spyValidateReadOnly = jest.spyOn(mockRolesService, 'validateReadOnly');
      component.onLogin();

      setTimeout(() => {
        expect(spy).toHaveBeenCalled();
        expect(component.successLogin).toBeTruthy();
        expect(spyRouter).toHaveBeenCalledWith(['/']);
        expect(spyValidateReadOnly).toHaveBeenCalled();
      }, 1500);
    });

    it('should show custom alert on login error with status code is 404', () => {
      const error = {
        error: { statusCode: 404 }
      }
      jest.spyOn(mockAuthService, 'userAuth').mockReturnValue(throwError(() => error));
      const spyShow = jest.spyOn(mockCustomizedAlertsFeService, 'show');

      component.onLogin();

      expect(spyShow).toHaveBeenCalledWith(
        {
          id: 'loginAlert',
          title: 'Oops!',
          description: component.internationalizationData.login.alerts[error.error.statusCode],
          status: 'warning',
          confirmText: 'Contact us',
        },
        expect.any(Function)
      );
    });

    it('should show custom alert on login error with status code is not 404', () => {
      const error = {
        error: { statusCode: 400 }
      }
      jest.spyOn(mockAuthService, 'userAuth').mockReturnValue(throwError(() => error));
      const spyShow = jest.spyOn(mockCustomizedAlertsFeService, 'show');

      component.onLogin();

      expect(spyShow).toHaveBeenCalledWith(
        {
          id: 'loginAlert',
          title: 'Oops!',
          status: 'warning',
        },
      );
    });
  });

  describe('ngOnDestroy', () => {
    it('should set inLogin property to false on ngOnDestroy', () => {
      component.ngOnDestroy();

      expect(mockAuthService.inLogin).toBeFalsy();
    });
  });
});
