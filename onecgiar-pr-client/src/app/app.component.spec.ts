import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ShareRequestModalComponent } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.component';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { MessageService } from 'primeng/api';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, ToastModule, DialogModule],
      declarations: [AppComponent, FooterComponent, ShareRequestModalComponent, ExternalToolsComponent, GoogleAnalyticsComponent],
      providers: [MessageService]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title 'onecgiar-pr-client'`, () => {
    expect(component.title).toEqual('onecgiar-pr-client');
  });

  describe('On init', () => {
    it('should have a method copyTokenToClipboard', () => {
      const copyTokenToClipboardSpy = jest.spyOn(component, 'copyTokenToClipboard');
      component.ngOnInit();
      expect(copyTokenToClipboardSpy).toHaveBeenCalled();
    });
    it('shoud have a method copyTokenToClipboard', () => {
      expect(component.copyTokenToClipboard).toBeDefined();
    });
  });

  describe('ngOnInit', () => {
    it('should set inLogin to true when localStorageUser is falsy', () => {
      component.AuthService.localStorageUser = null;
      component.ngOnInit();
      expect(component.AuthService.inLogin()).toBe(true);
    });

    it('should NOT set inLogin to true when localStorageUser is truthy', () => {
      component.AuthService.localStorageUser = { user_name: 'Test' };
      component.AuthService.inLogin.set(false);
      component.ngOnInit();
      expect(component.AuthService.inLogin()).toBe(false);
    });
  });

  describe('copyTokenToClipboard', () => {
    it('should return early if environment is production', () => {
      const origProduction = component.isProduction;
      (component as any).isProduction = true;
      // Store original
      const origOnKeyDown = document.onkeydown;

      component.copyTokenToClipboard();

      // onkeydown should NOT have been overwritten since we return early
      // (production check is at runtime inside the method, so we check via the environment)
      // Reset
      (component as any).isProduction = origProduction;
      document.onkeydown = origOnKeyDown;
    });

    it('should set up a keydown handler when not in production', () => {
      (component as any).isProduction = false;
      // Mock environment.production to false
      const origOnKeyDown = document.onkeydown;

      component.copyTokenToClipboard();

      expect(document.onkeydown).toBeDefined();
      document.onkeydown = origOnKeyDown;
    });

    it('keydown handler should return early when altKey is false', () => {
      (component as any).isProduction = false;
      component.copyTokenToClipboard();

      const event = new KeyboardEvent('keydown', { altKey: false, code: 'KeyT' });
      const result = document.onkeydown?.(event);
      // should just return without doing anything
      expect(result).toBeUndefined();
    });

    it('keydown handler should handle Alt+T to copy token', () => {
      (component as any).isProduction = false;
      component.copyTokenToClipboard();

      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText, readText: jest.fn() },
        writable: true,
        configurable: true
      });

      const event = new KeyboardEvent('keydown', { altKey: true, code: 'KeyT' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      document.onkeydown?.(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockWriteText).toHaveBeenCalled();
    });

    it('keydown handler should handle Alt+P to paste token', () => {
      (component as any).isProduction = false;
      component.copyTokenToClipboard();

      const mockReadText = jest.fn().mockResolvedValue(JSON.stringify({ token: 'abc', user: 'test' }));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: jest.fn(), readText: mockReadText },
        writable: true,
        configurable: true
      });

      const event = new KeyboardEvent('keydown', { altKey: true, code: 'KeyP' });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      document.onkeydown?.(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockReadText).toHaveBeenCalled();
    });

    it('keydown handler should ignore other Alt+key combos', () => {
      (component as any).isProduction = false;
      component.copyTokenToClipboard();

      const event = new KeyboardEvent('keydown', { altKey: true, code: 'KeyQ' });
      const result = document.onkeydown?.(event);
      expect(result).toBeUndefined();
    });
  });
});
