import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../shared/services/api/auth.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { signal } from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user.interface';

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
    cognitoServiceMock = {
      body: signal<UserAuth>({
        email: '',
        password: '',
        confirmPassword: ''
      }),
      requiredChangePassword: signal(false)
    };

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
    describe('when not required to change password', () => {
      beforeEach(() => {
        component.cognito.requiredChangePassword = signal(false);
      });

      it('should return true when both fields are empty', () => {
        component.cognito.body.set({
          email: '',
          password: ''
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when email is empty', () => {
        component.cognito.body.set({
          email: '',
          password: 'password123'
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when password is empty', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: ''
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return false when both fields are filled', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(component.validateBody()).toBe(false);
      });
    });

    describe('when required to change password', () => {
      beforeEach(() => {
        component.cognito.requiredChangePassword = signal(true);
      });

      it('should return true when email is empty', () => {
        component.cognito.body.set({
          email: '',
          password: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when password is empty', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: '',
          confirmPassword: 'ValidPass1!'
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when confirmPassword is empty', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: 'ValidPass1!',
          confirmPassword: ''
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when password is invalid', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return true when passwords do not match', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: 'ValidPass1!',
          confirmPassword: 'DifferentPass1!'
        });
        expect(component.validateBody()).toBe(true);
      });

      it('should return false when all fields are valid and passwords match', () => {
        component.cognito.body.set({
          email: 'test@example.com',
          password: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        });
        expect(component.validateBody()).toBe(false);
      });
    });
  });

  describe('isPasswordValid', () => {
    it('should return true for valid password', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'ValidPass1!',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(true);
    });

    it('should return false for password without lowercase', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'VALIDPASS1!',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(false);
    });

    it('should return false for password without uppercase', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'validpass1!',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(false);
    });

    it('should return false for password without special character', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'ValidPass1',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(false);
    });

    it('should return false for password shorter than 8 characters', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'Valid1!',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(false);
    });

    it('should return false for password with leading/trailing spaces', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: ' ValidPass1! ',
        confirmPassword: ''
      });
      expect(component.isPasswordValid()).toBe(false);
    });
  });

  describe('doPasswordsMatch', () => {
    it('should return true when passwords match', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'ValidPass1!',
        confirmPassword: 'ValidPass1!'
      });
      expect(component.doPasswordsMatch()).toBe(true);
    });

    it('should return false when passwords do not match', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: 'ValidPass1!',
        confirmPassword: 'DifferentPass1!'
      });
      expect(component.doPasswordsMatch()).toBe(false);
    });

    it('should return true when both passwords are empty', () => {
      component.cognito.body.set({
        email: 'test@example.com',
        password: '',
        confirmPassword: ''
      });
      expect(component.doPasswordsMatch()).toBe(true);
    });
  });

  describe('hasLowerCase', () => {
    it('should return true for password with lowercase letters', () => {
      expect(component.hasLowerCase('Password1!')).toBe(true);
    });

    it('should return false for password without lowercase letters', () => {
      expect(component.hasLowerCase('PASSWORD1!')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(component.hasLowerCase('')).toBe(false);
    });
  });

  describe('hasUpperCase', () => {
    it('should return true for password with uppercase letters', () => {
      expect(component.hasUpperCase('Password1!')).toBe(true);
    });

    it('should return false for password without uppercase letters', () => {
      expect(component.hasUpperCase('password1!')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(component.hasUpperCase('')).toBe(false);
    });
  });

  describe('hasMinLength', () => {
    it('should return true for password with 8 or more characters', () => {
      expect(component.hasMinLength('Password')).toBe(true);
      expect(component.hasMinLength('Password1!')).toBe(true);
    });

    it('should return false for password with less than 8 characters', () => {
      expect(component.hasMinLength('Pass1!')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(component.hasMinLength('')).toBe(false);
    });
  });

  describe('hasSpecialCharacter', () => {
    it('should return true for password with special characters', () => {
      expect(component.hasSpecialCharacter('Password1!')).toBe(true);
      expect(component.hasSpecialCharacter('Password@123')).toBe(true);
      expect(component.hasSpecialCharacter('Password#123')).toBe(true);
    });

    it('should return false for password without special characters', () => {
      expect(component.hasSpecialCharacter('Password123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(component.hasSpecialCharacter('')).toBe(false);
    });
  });

  describe('hasNoLeadingTrailingSpaces', () => {
    it('should return true for password without leading/trailing spaces', () => {
      expect(component.hasNoLeadingTrailingSpaces('Password1!')).toBe(true);
    });

    it('should return false for password with leading spaces', () => {
      expect(component.hasNoLeadingTrailingSpaces(' Password1!')).toBe(false);
    });

    it('should return false for password with trailing spaces', () => {
      expect(component.hasNoLeadingTrailingSpaces('Password1! ')).toBe(false);
    });

    it('should return false for password with both leading and trailing spaces', () => {
      expect(component.hasNoLeadingTrailingSpaces(' Password1! ')).toBe(false);
    });

    it('should return true for empty string', () => {
      expect(component.hasNoLeadingTrailingSpaces('')).toBe(true);
    });

    it('should return true for password with spaces in the middle', () => {
      expect(component.hasNoLeadingTrailingSpaces('Pass word1!')).toBe(true);
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
