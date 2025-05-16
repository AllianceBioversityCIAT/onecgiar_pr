import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../shared/services/api/auth.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { signal } from '@angular/core';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: Partial<AuthService>;
  let cognitoServiceMock: Partial<CognitoService>;

  beforeEach(() => {
    authServiceMock = {
      inLogin: signal(false),
      userAuth: jest.fn()
    };
    cognitoServiceMock = {};

    TestBed.configureTestingModule({
      imports: [FormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: CognitoService, useValue: cognitoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call inLogin set to true', () => {
      const inLoginSpy = jest.spyOn(authServiceMock.inLogin, 'set');
      component.ngOnInit();
      expect(inLoginSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('validateBody', () => {
    it('should validate body correctly when both fields are empty', () => {
      component.body.set({
        email: '',
        password: ''
      });
      expect(component.validateBody()).toBe(true);
    });

    it('should validate body correctly when email is empty', () => {
      component.body.set({
        email: '',
        password: 'password123'
      });
      expect(component.validateBody()).toBe(true);
    });

    it('should validate body correctly when password is empty', () => {
      component.body.set({
        email: 'test@example.com',
        password: ''
      });
      expect(component.validateBody()).toBe(true);
    });

    it('should validate body correctly when both fields are filled', () => {
      component.body.set({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(component.validateBody()).toBe(false);
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
