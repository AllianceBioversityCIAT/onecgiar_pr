import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../shared/services/api/auth.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { WebsocketService } from '../../sockets/websocket.service';
import { ClarityService } from '../../shared/services/clarity.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { internationalizationData } from '../../shared/data/internationalization-data';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: Partial<AuthService>;
  let routerMock: Partial<Router>;
  let customAlertServiceMock: Partial<CustomizedAlertsFeService>;
  let rolesServiceMock: Partial<RolesService>;
  let webSocketMock: Partial<WebsocketService>;
  let clarityServiceMock: Partial<ClarityService>;
  let cognitoServiceMock: Partial<CognitoService>;

  beforeEach(() => {
    authServiceMock = {
      inLogin: false,
      userAuth: jest.fn()
    };
    routerMock = {
      navigate: jest.fn()
    };
    customAlertServiceMock = {
      show: jest.fn(),
      closeAction: jest.fn()
    };
    rolesServiceMock = {
      validateReadOnly: jest.fn()
    };
    webSocketMock = {
      configUser: jest.fn()
    };
    clarityServiceMock = {
      updateUserInfo: jest.fn()
    };
    cognitoServiceMock = {};

    TestBed.configureTestingModule({
      imports: [FormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: CustomizedAlertsFeService, useValue: customAlertServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: WebsocketService, useValue: webSocketMock },
        { provide: ClarityService, useValue: clarityServiceMock },
        { provide: CognitoService, useValue: cognitoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with inLogin set to true', () => {
    component.ngOnInit();
    expect(authServiceMock.inLogin).toBe(true);
  });

  it('should set inLogin to false on component destroy', () => {
    component.ngOnDestroy();
    expect(authServiceMock.inLogin).toBe(false);
  });

  it('should initialize with default values', () => {
    expect(component.internationalizationData).toBe(internationalizationData);
    expect(component.isLoadingAzureAd()).toBe(false);
    expect(component.isLoadingCredentials()).toBe(false);
    expect(component.body()).toEqual({
      email: '',
      password: ''
    });
  });

  it('should toggle isLoadingAzureAd flag during loginWithAzureAd and reset after timeout', fakeAsync(() => {
    component.loginWithAzureAd();
    expect(component.isLoadingAzureAd()).toBe(true);

    tick(1500);
    expect(component.isLoadingAzureAd()).toBe(false);
  }));

  it('should handle successful login with valid credentials', () => {
    const mockResponse = {
      response: {
        token: 'test-token',
        user: {
          id: 1,
          user_name: 'testuser',
          email: 'test@example.com'
        },
        valid: true
      }
    };

    (authServiceMock.userAuth as jest.Mock).mockReturnValue(of(mockResponse));

    component.loginWithCredentials();

    expect(component.isLoadingCredentials()).toBe(false);
    expect(authServiceMock.userAuth).toHaveBeenCalledWith(component.body());
    expect(webSocketMock.configUser).toHaveBeenCalledWith('testuser', 1);
    expect(clarityServiceMock.updateUserInfo).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    expect(rolesServiceMock.validateReadOnly).toHaveBeenCalled();
  });

  it('should handle 404 error when logging in', () => {
    const mockError = {
      error: {
        statusCode: 404,
        message: 'User not found'
      }
    };

    (authServiceMock.userAuth as jest.Mock).mockReturnValue(throwError(() => mockError));

    component.loginWithCredentials();

    expect(component.isLoadingCredentials()).toBe(false);
    expect(customAlertServiceMock.show).toHaveBeenCalledWith({
      id: 'loginAlert',
      title: 'Oops!',
      description: internationalizationData.login.alerts[404],
      status: 'warning'
    });
  });

  it('should handle other errors when logging in', () => {
    const mockError = {
      error: {
        statusCode: 500,
        message: 'Server error'
      }
    };

    (authServiceMock.userAuth as jest.Mock).mockReturnValue(throwError(() => mockError));

    component.loginWithCredentials();

    expect(component.isLoadingCredentials()).toBe(false);
    expect(customAlertServiceMock.show).toHaveBeenCalledWith({
      id: 'loginAlert',
      title: 'Oops!',
      description: 'Server error',
      status: 'warning'
    });
  });

  it('should set isLoadingCredentials to true when calling loginWithCredentials', () => {
    (authServiceMock.userAuth as jest.Mock).mockReturnValue(of({}));

    component.loginWithCredentials();

    expect(authServiceMock.userAuth).toHaveBeenCalled();
  });

  it('should disable buttons when either loading flag is true', () => {
    component.isLoadingAzureAd.set(true);
    fixture.detectChanges();
    const azureButton = fixture.nativeElement.querySelector('.corp-id-btn');
    const signInButton = fixture.nativeElement.querySelector('.signin-btn');

    expect(azureButton.disabled).toBe(true);
    expect(signInButton.disabled).toBe(true);
  });
});
