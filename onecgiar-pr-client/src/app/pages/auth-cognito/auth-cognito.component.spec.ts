import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthCognitoComponent } from './auth-cognito.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../shared/services/api/auth.service';
import { signal } from '@angular/core';

describe('AuthCognitoComponent', () => {
  let component: AuthCognitoComponent;
  let fixture: ComponentFixture<AuthCognitoComponent>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    authServiceMock = {
      inLogin: signal(false),
      userAuth: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        MessageService,
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCognitoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call validateCognitoCode', () => {
      const validateCognitoCodeSpy = jest.spyOn(component.cognito, 'validateCognitoCode');
      component.ngOnInit();
      expect(validateCognitoCodeSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call inLogin set to false', () => {
      const inLoginSpy = jest.spyOn(authServiceMock.inLogin, 'set');
      component.ngOnDestroy();
      expect(inLoginSpy).toHaveBeenCalledWith(false);
    });
  });
});
