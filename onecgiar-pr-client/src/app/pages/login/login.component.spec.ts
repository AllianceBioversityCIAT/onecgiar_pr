import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { AuthService } from '../../shared/services/api/auth.service';
import { CognitoService } from '../../shared/services/cognito.service';
import { signal } from '@angular/core';
import { UserAuth } from '../../shared/interfaces/user.interface';
import { Observable, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { CenterOtpPanelComponent } from './components/center-otp-panel/center-otp-panel.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: Partial<AuthService>;
  let cognitoServiceMock: Partial<CognitoService>;

  beforeEach(() => {
    authServiceMock = {
      inLogin: signal(false),
      userAuth: jest.fn(),
      GET_otpConfig: jest.fn(() => of({ response: { domains: [] } })) // OTP-T-7: ngOnInit loads the allow-list
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

  describe('handleKeyDown', () => {
    beforeEach(() => {
      // Add the missing methods to the mock
      cognitoServiceMock.changePassword = jest.fn();
      cognitoServiceMock.loginWithCredentials = jest.fn();
    });

    it('should not call any login methods when key is not Enter', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });

      component.handleKeyDown(event);

      expect(cognitoServiceMock.changePassword).not.toHaveBeenCalled();
      expect(cognitoServiceMock.loginWithCredentials).not.toHaveBeenCalled();
    });

    it('should not call any login methods when validation fails', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      // Mock validateBody to return true (invalid form)
      jest.spyOn(component, 'validateBody').mockReturnValue(true);

      component.handleKeyDown(event);

      expect(cognitoServiceMock.changePassword).not.toHaveBeenCalled();
      expect(cognitoServiceMock.loginWithCredentials).not.toHaveBeenCalled();
    });

    describe('when not required to change password', () => {
      beforeEach(() => {
        component.cognito.requiredChangePassword = signal(false);
      });

      it('should call loginWithCredentials when Enter is pressed and form is valid', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        const body = { email: 'test@example.com', password: 'ValidPass1!' };

        // Mock validateBody to return false (valid form)
        jest.spyOn(component, 'validateBody').mockReturnValue(false);
        component.cognito.body.set(body);

        component.handleKeyDown(event);

        expect(cognitoServiceMock.loginWithCredentials).toHaveBeenCalledWith(body);
        expect(cognitoServiceMock.changePassword).not.toHaveBeenCalled();
      });
    });

    describe('when required to change password', () => {
      beforeEach(() => {
        component.cognito.requiredChangePassword = signal(true);
      });

      it('should call changePassword when Enter is pressed and form is valid', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        const body = {
          email: 'test@example.com',
          password: 'ValidPass1!',
          confirmPassword: 'ValidPass1!'
        };

        // Mock validateBody to return false (valid form)
        jest.spyOn(component, 'validateBody').mockReturnValue(false);
        component.cognito.body.set(body);

        component.handleKeyDown(event);

        expect(cognitoServiceMock.changePassword).toHaveBeenCalled();
        expect(cognitoServiceMock.loginWithCredentials).not.toHaveBeenCalled();
      });
    });
  });
});

// @akili-spec changes/cognito-email-otp-login — OTP-T-7
// Captured from the UNMODIFIED template before the Center block was added (OTP-AC-13 client half /
// OTP-R-10): the CGIAR block, the external-user block (closed, open and password-change states)
// must stay byte-identical. A red run here means the existing DOM moved — fix the template, never `-u`.
describe('LoginComponent pre-change DOM snapshot (OTP-AC-13)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let cognitoMock: Partial<CognitoService>;

  beforeEach(async () => {
    cognitoMock = {
      body: signal<UserAuth>({ email: '', password: '', confirmPassword: '' }),
      requiredChangePassword: signal(false),
      isLoadingAzureAd: signal(false),
      isLoadingCredentials: signal(false)
    };
    const authMock: Partial<AuthService> = {
      inLogin: signal(false),
      localStorageUser: undefined,
      GET_otpConfig: jest.fn(() => of({ response: { domains: [] } }))
    };

    TestBed.configureTestingModule({
      imports: [FormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: CognitoService, useValue: cognitoMock }
      ]
    });

    fixture = TestBed.createComponent(LoginComponent);
    await render();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function html(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(el => el.outerHTML);
  }

  function precedingText(selector: string): string | undefined {
    return (fixture.nativeElement.querySelector(selector) as HTMLElement | null)?.previousElementSibling?.outerHTML;
  }

  it('keeps the CGIAR block (title, description, button, divider) identical', () => {
    expect(html('h2.login-title')).toMatchSnapshot('cgiar-title');
    expect(precedingText('button.corp-id-btn')).toMatchSnapshot('cgiar-description');
    expect(html('button.corp-id-btn')).toMatchSnapshot('cgiar-button');
    expect(html('.divider')).toMatchSnapshot('divider');
  });

  it('keeps the closed external-user block (description + button) identical', () => {
    expect(precedingText('button.show-login-form-btn')).toMatchSnapshot('external-description');
    expect(html('button.show-login-form-btn')).toMatchSnapshot('external-button');
  });

  it('keeps the open external-user form identical', async () => {
    fixture.componentInstance.toggleLoginForm();
    await render();

    expect(html('.external-users-text')).toMatchSnapshot('external-form-heading');
    expect(html('.form-group')).toMatchSnapshot('external-form-groups');
    expect(html('.signin-btn')).toMatchSnapshot('external-form-submit');
    expect(html('button.show-login-form-btn')).toEqual([]);
  });

  it('keeps the password-change form identical', async () => {
    (cognitoMock.requiredChangePassword as ReturnType<typeof signal<boolean>>).set(true);
    fixture.componentInstance.toggleLoginForm();
    await render();

    expect(html('h2.login-title')).toMatchSnapshot('change-password-title');
    expect(html('.form-group')).toMatchSnapshot('change-password-form-groups');
    expect(html('.signin-btn')).toMatchSnapshot('change-password-submit');
    expect(html('button.corp-id-btn')).toEqual([]);
  });
});

// @akili-spec changes/cognito-email-otp-login — OTP-T-7 (OTP-R-1, OTP-R-14 choose state, OTP-AC-1/2)
describe('LoginComponent Center path (OTP-T-7)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let cognitoMock: Partial<CognitoService>;
  let otpConfig$: Observable<any>;

  const CENTER_BUTTON = '[data-test="otp-center-button"]';
  const CENTER_HELPER = '[data-test="otp-center-helper"]';
  const CENTER_CANCEL = '[data-test="otp-center-cancel"]';
  const PANEL = 'app-center-otp-panel';
  const EXTERNAL_BUTTON = 'button.show-login-form-btn';
  const EXTERNAL_FORM = 'button.signin-btn';

  function configure(domains: string[] | Error): void {
    otpConfig$ = domains instanceof Error ? throwError(() => domains) : of({ response: { domains } });
    cognitoMock = {
      body: signal<UserAuth>({ email: '', password: '', confirmPassword: '' }),
      requiredChangePassword: signal(false),
      isLoadingAzureAd: signal(false),
      isLoadingCredentials: signal(false)
    };
    const authMock: Partial<AuthService> = {
      inLogin: signal(false),
      localStorageUser: undefined,
      GET_otpConfig: jest.fn(() => otpConfig$)
    };
    TestBed.configureTestingModule({
      imports: [FormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: CognitoService, useValue: cognitoMock }
      ]
    });
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  function el(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function click(selector: string): void {
    (el(selector) as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('OTP-AC-2: renders no Center button when the allow-list is empty, keeping the two existing paths', () => {
    configure([]);

    expect(el(CENTER_BUTTON)).toBeNull();
    expect(el(CENTER_HELPER)).toBeNull();
    expect(el('button.corp-id-btn')).not.toBeNull();
    expect(el(EXTERNAL_BUTTON)).not.toBeNull();
  });

  it('OTP-AC-1: renders the Center button between the CGIAR button and the external block, helper naming the centers', () => {
    configure(['icrisat.org', 'cifor-icraf.org']);

    // GET_otpConfig succeeded → the allow-list reached the signal that gates the block.
    expect(fixture.componentInstance.centerDomains()).toEqual(['icrisat.org', 'cifor-icraf.org']);

    const button = el(CENTER_BUTTON) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.textContent).toContain('Continue with your Center account');
    // mockup/login-target.html screen 1 — exact copy, label map applied to both domains.
    expect(el(CENTER_HELPER)?.textContent?.trim()).toBe('For CGIAR centers outside the CGIAR directory · ICRISAT · CIFOR-ICRAF');

    const order = Array.from(fixture.nativeElement.querySelectorAll('button.corp-id-btn, [data-test="otp-center-button"], button.show-login-form-btn') as NodeListOf<HTMLElement>).map(
      b => b.className || b.dataset['test']
    );
    expect(order).toEqual(['corp-id-btn', 'center-account-btn', 'show-login-form-btn']);
    expect(el(PANEL)).toBeNull();
  });

  it('falls back to the raw domain when the label map has no entry', () => {
    configure(['icrisat.org', 'example.org']);

    expect(el(CENTER_HELPER)?.textContent?.trim()).toBe('For CGIAR centers outside the CGIAR directory · ICRISAT · example.org');
  });

  it('hides the Center block when GET_otpConfig fails, never blocking the other two paths', () => {
    configure(new Error('boom'));

    expect(fixture.componentInstance.centerDomains()).toEqual([]);
    expect(el(CENTER_BUTTON)).toBeNull();
    expect(el('button.corp-id-btn')).not.toBeNull();
    expect(el(EXTERNAL_BUTTON)).not.toBeNull();
  });

  // design.md §5.3 — a failed config request is a hidden block, not a diagnostic: the login page
  // must not write to the console (`.cursorrules`: nothing from the auth surface reaches the log).
  it('fails silently: a GET_otpConfig error writes nothing to the console', () => {
    const spies = (['error', 'warn', 'log'] as const).map(level => jest.spyOn(console, level).mockImplementation(() => undefined));

    configure(new Error('boom'));

    spies.forEach(spy => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // design.md §6.3 — the Center button is a sibling of `.corp-id-btn` / `.show-login-form-btn`,
  // so it disables on exactly the same two in-flight signals.
  it('disables the Center button while a sibling login is in flight, like the other two paths', () => {
    configure(['icrisat.org']);
    const isDisabled = () => (el(CENTER_BUTTON) as HTMLButtonElement).disabled;

    expect(isDisabled()).toBe(false);

    (cognitoMock.isLoadingAzureAd as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();
    expect(isDisabled()).toBe(true);

    (cognitoMock.isLoadingAzureAd as ReturnType<typeof signal<boolean>>).set(false);
    (cognitoMock.isLoadingCredentials as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();
    expect(isDisabled()).toBe(true);
  });

  it('opens the Center panel with the allow-list as its domains input and swaps the button for a Cancel', () => {
    configure(['icrisat.org', 'cifor-icraf.org']);

    click(CENTER_BUTTON);

    const panel = fixture.debugElement.query(By.directive(CenterOtpPanelComponent));
    expect(panel).not.toBeNull();
    expect((panel.componentInstance as CenterOtpPanelComponent).domains()).toEqual(['icrisat.org', 'cifor-icraf.org']);
    expect(el(CENTER_BUTTON)).toBeNull();
    expect(el(CENTER_CANCEL)).not.toBeNull();
    expect(el(EXTERNAL_FORM)).toBeNull();

    click(CENTER_CANCEL);
    expect(el(PANEL)).toBeNull();
    expect(el(CENTER_BUTTON)).not.toBeNull();
  });

  it('one active path: opening the external form closes the Center panel', () => {
    configure(['icrisat.org']);

    click(CENTER_BUTTON);
    expect(el(PANEL)).not.toBeNull();

    click(EXTERNAL_BUTTON);
    expect(el(PANEL)).toBeNull();
    expect(el(EXTERNAL_FORM)).not.toBeNull();
    expect(el(CENTER_BUTTON)).not.toBeNull();
  });

  it('one active path: opening the Center panel closes the external form', () => {
    configure(['icrisat.org']);

    click(EXTERNAL_BUTTON);
    expect(el(EXTERNAL_FORM)).not.toBeNull();

    click(CENTER_BUTTON);
    expect(el(PANEL)).not.toBeNull();
    expect(el(EXTERNAL_FORM)).toBeNull();
    expect(el(EXTERNAL_BUTTON)).not.toBeNull();
  });

  it('hides the whole Center block while the password-change form is open', () => {
    configure(['icrisat.org']);
    click(CENTER_BUTTON);

    (cognitoMock.requiredChangePassword as ReturnType<typeof signal<boolean>>).set(true);
    fixture.componentInstance.toggleLoginForm();
    fixture.detectChanges();

    expect(el(CENTER_BUTTON)).toBeNull();
    expect(el(CENTER_HELPER)).toBeNull();
    expect(el(PANEL)).toBeNull();
    expect(el('h2.login-title')?.textContent).toContain('Please change your password');
  });
});
